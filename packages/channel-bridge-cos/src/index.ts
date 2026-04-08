#!/usr/bin/env node
/**
 * channel-bridge-cos — MCP server bridging COS v2 mission rooms to
 * Claude CLI via the experimental `claude/channel` capability.
 *
 * Lifecycle:
 *   1. Parse + validate env (fail fast).
 *   2. Fetch leader team instructions (dynamic system prompt).
 *   3. Construct MCP server declaring the channel capability + tools.
 *   4. Open SSE connection to /agents/:aid/stream?since=<cursor>.
 *   5. Route inbound room messages → notifications/claude/channel.
 *   6. Handle reply / edit_message tool calls → HTTP POST to COS.
 *   7. Persist lastMessageId cursor to <workspace>/state.json.
 *   8. Self-loop filter: skip events where senderAgentId === self.
 *
 * @see docs/cos-v2/phase4-cli-design.md §13
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadEnv } from "./env.js";
import { readState, writeState, type BridgeState } from "./state.js";
import { createSseClient } from "./sse-client.js";
import { fetchInstructions, buildInstructionsField } from "./instructions.js";

const env = loadEnv();
const state: BridgeState = await readState(env.COS_WORKSPACE);
const leaderInstructions = await fetchInstructions(env);
const instructionsField = buildInstructionsField(leaderInstructions, env);

/* ---------- MCP server ---------- */

const mcp = new Server(
  { name: "channel-bridge-cos", version: "0.1.0" },
  {
    instructions: instructionsField,
    capabilities: {
      experimental: { "claude/channel": {} },
      tools: {},
    },
  },
);

const REPLY_TOOL = {
  name: "reply",
  description:
    "Send a message to a COS v2 mission room. If target_room_id is omitted, "
    + "replies in the same room the most recent inbound message came from. "
    + "Set thread_ts to the message_id you are replying to.",
  inputSchema: {
    type: "object" as const,
    properties: {
      message: { type: "string", description: "Message body (markdown allowed)." },
      thread_ts: { type: "string", description: "message_id to reply to (optional)." },
      target_room_id: { type: "string", description: "Room UUID override (optional)." },
    },
    required: ["message"],
  },
};

const EDIT_TOOL = {
  name: "edit_message",
  description: "Edit a previously sent message (not yet implemented in COS v2).",
  inputSchema: {
    type: "object" as const,
    properties: {
      message_id: { type: "string" },
      message: { type: "string" },
    },
    required: ["message_id", "message"],
  },
};

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [REPLY_TOOL, EDIT_TOOL],
}));

/* ---------- Tool handlers ---------- */

/**
 * Bounded LRU that maps message_id → room_id so `reply` can route
 * to the correct room even when messages from multiple rooms are
 * interleaved. A single mutable "lastReceivedRoomId" is a
 * cross-room leak: if room B sends a message between the time
 * Claude decided to reply to a message from room A and the time
 * it actually calls reply(), the response posts to B.
 */
const MESSAGE_ROOM_MAP_CAP = 1024;
const messageIdToRoom = new Map<string, string>();
function rememberMessageRoom(messageId: string, roomId: string) {
  messageIdToRoom.set(messageId, roomId);
  if (messageIdToRoom.size > MESSAGE_ROOM_MAP_CAP) {
    // Drop oldest (insertion order)
    const oldestKey = messageIdToRoom.keys().next().value;
    if (oldestKey !== undefined) messageIdToRoom.delete(oldestKey);
  }
}

async function handleReply(
  args: { message?: string; thread_ts?: string; target_room_id?: string },
) {
  const message = args.message ?? "";
  if (!message.trim()) {
    return {
      content: [{ type: "text" as const, text: "error: empty message" }],
      isError: true,
    };
  }
  // Resolution order:
  //   1. explicit target_room_id (operator override)
  //   2. room derived from thread_ts (message_id being replied to)
  //   3. error — NO implicit "last received" fallback (see LRU doc above)
  let roomId: string | null = args.target_room_id ?? null;
  if (!roomId && args.thread_ts) {
    roomId = messageIdToRoom.get(args.thread_ts) ?? null;
  }
  if (!roomId) {
    return {
      content: [
        {
          type: "text" as const,
          text:
            "error: cannot determine target room. " +
            "Set target_room_id, or set thread_ts to the id of the " +
            "message you are replying to.",
        },
      ],
      isError: true,
    };
  }

  const url =
    `${env.COS_API_URL}/api/companies/${env.COS_COMPANY_ID}` +
    `/rooms/${roomId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.COS_AGENT_KEY}`,
      },
      body: JSON.stringify({
        type: "text",
        body: message,
        replyToId: args.thread_ts || null,
      }),
    });
    const data = (await res.json()) as { id?: string; error?: string };
    if (res.ok && data.id) {
      return { content: [{ type: "text" as const, text: `sent (id: ${data.id})` }] };
    }
    return {
      content: [
        { type: "text" as const, text: `error: ${data.error ?? `HTTP ${res.status}`}` },
      ],
      isError: true,
    };
  } catch (err: any) {
    return {
      content: [{ type: "text" as const, text: `error: ${err?.message ?? String(err)}` }],
      isError: true,
    };
  }
}

async function handleEdit(_args: { message_id?: string; message?: string }) {
  return {
    content: [
      {
        type: "text" as const,
        text: "edit_message is not implemented yet in COS v2",
      },
    ],
    isError: true,
  };
}

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === "reply") {
    return handleReply(
      (req.params.arguments ?? {}) as {
        message?: string;
        thread_ts?: string;
        target_room_id?: string;
      },
    );
  }
  if (req.params.name === "edit_message") {
    return handleEdit(
      (req.params.arguments ?? {}) as { message_id?: string; message?: string },
    );
  }
  return {
    content: [
      { type: "text" as const, text: `unknown tool: ${req.params.name}` },
    ],
    isError: true,
  };
});

/* ---------- SSE client ---------- */

type InboundEvent =
  | {
      type: "message.created" | "message.updated";
      roomId: string;
      message: {
        id: string;
        roomId: string;
        senderAgentId: string | null;
        senderUserId: string | null;
        body: string;
        replyToId: string | null;
        [k: string]: unknown;
      };
    }
  | { type: "membership.changed"; roomIds: string[] }
  | { type: "instructions.updated" };

async function onInbound(raw: unknown) {
  const evt = raw as InboundEvent;
  if (!evt || typeof evt !== "object" || !("type" in evt)) return;

  if (evt.type === "membership.changed") {
    console.error(
      `[channel-bridge-cos] membership changed — now in ${evt.roomIds.length} room(s)`,
    );
    return;
  }
  if (evt.type === "instructions.updated") {
    console.error("[channel-bridge-cos] instructions updated (restart to apply)");
    return;
  }
  if (evt.type !== "message.created") return;

  // Self-loop filter — ignore messages we sent ourselves
  if (evt.message.senderAgentId === env.COS_AGENT_ID) {
    state.lastMessageId = evt.message.id;
    await writeState(env.COS_WORKSPACE, state).catch(() => {});
    return;
  }

  rememberMessageRoom(evt.message.id, evt.roomId);

  await mcp
    .notification({
      method: "notifications/claude/channel",
      params: {
        content: evt.message.body,
        meta: {
          sender:
            evt.message.senderAgentId ??
            evt.message.senderUserId ??
            "unknown",
          thread_ts: evt.message.replyToId ?? "",
          channel: evt.roomId,
          room_id: evt.roomId,
          message_id: evt.message.id,
          is_bot: evt.message.senderAgentId ? "true" : "false",
        },
      },
    } as any)
    .catch((err: unknown) => {
      console.error(
        `[channel-bridge-cos] notification failed:`,
        (err as any)?.message ?? err,
      );
    });

  state.lastMessageId = evt.message.id;
  await writeState(env.COS_WORKSPACE, state).catch(() => {});
}

const sse = createSseClient({
  urlFactory: () =>
    `${env.COS_API_URL}/api/companies/${env.COS_COMPANY_ID}` +
    `/agents/${env.COS_AGENT_ID}/stream` +
    (state.lastMessageId ? `?since=${encodeURIComponent(state.lastMessageId)}` : ""),
  headersFactory: () => ({ Authorization: `Bearer ${env.COS_AGENT_KEY}` }),
  onMessage: onInbound,
  onOpen: () => console.error("[channel-bridge-cos] SSE connected"),
  onError: (err) =>
    console.error("[channel-bridge-cos] SSE error:", (err as any)?.message ?? err),
});

/* ---------- Startup ---------- */

console.error(
  `[channel-bridge-cos] starting for agent ${env.COS_AGENT_ID} in company ${env.COS_COMPANY_ID}`,
);
await mcp.connect(new StdioServerTransport());

process.on("SIGTERM", () => {
  sse.close();
  process.exit(0);
});
process.on("SIGINT", () => {
  sse.close();
  process.exit(0);
});
