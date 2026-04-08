/**
 * Fetch aggregated team instructions for the leader agent at bridge
 * startup. Returned markdown is embedded into the MCP server's
 * `instructions:` field so Claude sees it as part of the system prompt.
 */

import type { BridgeEnv } from "./env.js";

export interface LeaderInstructions {
  markdown: string;
  teamIdentifiers: string[];
}

export async function fetchInstructions(env: BridgeEnv): Promise<LeaderInstructions> {
  const url =
    `${env.COS_API_URL}/api/companies/${env.COS_COMPANY_ID}` +
    `/agents/${env.COS_AGENT_ID}/team-instructions`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${env.COS_AGENT_KEY}` },
    });
    if (!res.ok) {
      return {
        markdown: `[channel-bridge-cos] Could not fetch team instructions (HTTP ${res.status}).`,
        teamIdentifiers: [],
      };
    }
    const data = (await res.json()) as {
      teams: Array<{ identifier: string }>;
      markdown: string;
    };
    return {
      markdown: data.markdown,
      teamIdentifiers: data.teams.map((t) => t.identifier),
    };
  } catch (err: any) {
    return {
      markdown: `[channel-bridge-cos] Instructions fetch error: ${err?.message ?? String(err)}`,
      teamIdentifiers: [],
    };
  }
}

export function buildInstructionsField(
  leader: LeaderInstructions,
  env: BridgeEnv,
): string {
  const header = [
    `You are a leader agent (COS_AGENT_ID=${env.COS_AGENT_ID}) connected to`,
    `COS v2 mission rooms via the channel-bridge-cos MCP server.`,
    ``,
    `Messages from other participants arrive as`,
    `<channel source="channel-bridge"> events with sender/thread_ts/room_id`,
    `meta attributes. To respond, call the "reply" tool with your message.`,
    `If multiple leaders are in the same room, only respond when the`,
    `message is addressed to you (by name or context) or when other`,
    `leaders have not yet responded — avoid duplicate answers.`,
    ``,
    `Teams you lead: ${leader.teamIdentifiers.join(", ") || "(none)"}`,
    ``,
    `--- team instructions ---`,
    ``,
  ].join("\n");
  return header + leader.markdown;
}
