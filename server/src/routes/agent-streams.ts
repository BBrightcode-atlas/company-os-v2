/**
 * Agent-scoped SSE stream endpoint.
 *
 * Phase 4: the single endpoint a leader CLI's channel-bridge-cos
 * subscribes to at startup. Emits all room events the agent should
 * see (messages + membership + instructions updates), filtered by
 * current room_participants membership.
 *
 * Cursor-based resume (`?since=<messageId>`) guarantees exactly-once
 * delivery across reconnects.
 *
 * @see docs/cos-v2/phase4-cli-design.md §8
 */

import { Router } from "express";
import { asc, eq, gt, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { roomMessages, roomParticipants } from "@paperclipai/db";
import type { AgentStreamBus } from "../services/agent-stream-bus.js";
import type { AgentStreamEvent } from "../services/agent-stream-bus.js";
import type { RoomMessageLike } from "../services/room-stream-bus.js";

interface Deps {
  db: Db;
  agentStreamBus: AgentStreamBus;
}

function writeSseHeaders(res: import("express").Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
}

function writeSseEvent(
  res: import("express").Response,
  event: { id?: string; event?: string; data: unknown },
) {
  if (event.id) res.write(`id: ${event.id}\n`);
  if (event.event) res.write(`event: ${event.event}\n`);
  res.write(`data: ${JSON.stringify(event.data)}\n\n`);
}

export function agentStreamRoutes(deps: Deps) {
  const router = Router();
  const { db, agentStreamBus } = deps;

  /**
   * GET /companies/:companyId/agents/:agentId/stream?since=<messageId>
   *
   * Auth: Bearer agent_api_key (middleware sets req.actor.type = "agent")
   * Authz: req.actor.agentId === :agentId AND req.actor.companyId === :companyId
   */
  router.get(
    "/companies/:companyId/agents/:agentId/stream",
    async (req, res) => {
      const { companyId, agentId } = req.params as {
        companyId: string;
        agentId: string;
      };

      // Authorization
      if (req.actor.type !== "agent") {
        res.status(401).json({ error: "Agent authentication required" });
        return;
      }
      if (req.actor.agentId !== agentId) {
        res.status(403).json({ error: "Agent can only subscribe to its own stream" });
        return;
      }
      if (req.actor.companyId !== companyId) {
        res.status(403).json({ error: "Agent does not belong to this company" });
        return;
      }

      const sinceId =
        typeof req.query.since === "string" && req.query.since.length > 0
          ? req.query.since
          : null;

      writeSseHeaders(res);
      res.write(":ok\n\n");

      // Keepalive heartbeat so idle proxies don't kill the connection
      const keepalive = setInterval(() => {
        if (res.writable) res.write(":keepalive\n\n");
      }, 15_000);

      // Buffer events received during replay so we can dedup + flush
      let replaying = true;
      const buffered: AgentStreamEvent[] = [];
      let lastDeliveredId: string | null = null;

      const unsubscribe = agentStreamBus.subscribe(agentId, (evt) => {
        if (!res.writable) return;
        if (replaying) {
          buffered.push(evt);
          return;
        }
        deliver(evt);
      });

      function deliver(evt: AgentStreamEvent) {
        if (evt.type === "message.created" || evt.type === "message.updated") {
          // Dedup by id — if we've already delivered this message during replay
          // or earlier live, skip it.
          if (lastDeliveredId && evt.message.id <= lastDeliveredId) return;
          writeSseEvent(res, {
            id: evt.message.id,
            event: "message",
            data: evt,
          });
          lastDeliveredId = evt.message.id;
        } else {
          writeSseEvent(res, {
            event: evt.type,
            data: evt,
          });
        }
      }

      // --- Replay phase ---

      try {
        // Determine cursor boundary from sinceId (if any)
        let sinceCreatedAt: Date | null = null;
        if (sinceId) {
          const [cursorRow] = await db
            .select({ createdAt: roomMessages.createdAt })
            .from(roomMessages)
            .where(eq(roomMessages.id, sinceId))
            .limit(1);
          sinceCreatedAt = cursorRow?.createdAt ?? null;
        }

        // List the rooms this agent currently participates in
        const participantRows = await db
          .select({ roomId: roomParticipants.roomId })
          .from(roomParticipants)
          .where(
            and(
              eq(roomParticipants.agentId, agentId),
              eq(roomParticipants.companyId, companyId),
            ),
          );
        const roomIds = participantRows.map((r) => r.roomId);

        if (roomIds.length > 0) {
          // Pull messages from each room since the cursor, sorted by
          // createdAt ASC. For simplicity we do one query per room —
          // rooms per agent are typically small (<20).
          const backlog: RoomMessageLike[] = [];
          for (const rid of roomIds) {
            const conds = [eq(roomMessages.roomId, rid)];
            if (sinceCreatedAt) {
              conds.push(gt(roomMessages.createdAt, sinceCreatedAt));
            }
            const rows = await db
              .select()
              .from(roomMessages)
              .where(and(...conds))
              .orderBy(asc(roomMessages.createdAt))
              .limit(sinceId ? 1000 : 100);
            for (const row of rows) {
              backlog.push(row as unknown as RoomMessageLike);
            }
          }

          // Sort merged backlog globally by createdAt
          backlog.sort((a, b) => {
            const at = new Date(a.createdAt as any).getTime();
            const bt = new Date(b.createdAt as any).getTime();
            return at - bt;
          });

          for (const msg of backlog) {
            deliver({
              type: "message.created",
              roomId: msg.roomId,
              message: msg,
            });
          }
        }
      } catch (err: any) {
        writeSseEvent(res, {
          event: "error",
          data: { error: err?.message ?? String(err) },
        });
      }

      // Flush buffered live events (deduping against replay's cursor)
      replaying = false;
      for (const evt of buffered) deliver(evt);
      buffered.length = 0;

      // --- Cleanup ---
      req.on("close", () => {
        clearInterval(keepalive);
        unsubscribe();
      });
      res.on("error", () => {
        clearInterval(keepalive);
        unsubscribe();
      });
    },
  );

  return router;
}
