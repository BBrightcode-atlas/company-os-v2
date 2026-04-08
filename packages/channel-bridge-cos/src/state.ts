/**
 * Persistent cursor for "last message delivered to Claude".
 *
 * Lives at <workspace>/state.json. Updated after every
 * notifications/claude/channel emission so bridge restarts /
 * reconnects resume at the right spot with zero duplicate delivery.
 */

import fs from "node:fs/promises";
import path from "node:path";

export interface BridgeState {
  lastMessageId: string | null;
}

function statePath(workspace: string): string {
  return path.join(workspace, "state.json");
}

export async function readState(workspace: string): Promise<BridgeState> {
  const p = statePath(workspace);
  try {
    const content = await fs.readFile(p, "utf8");
    const parsed = JSON.parse(content);
    if (typeof parsed?.lastMessageId === "string" || parsed?.lastMessageId === null) {
      return { lastMessageId: parsed.lastMessageId ?? null };
    }
  } catch {
    /* missing or corrupt — start fresh */
  }
  return { lastMessageId: null };
}

export async function writeState(
  workspace: string,
  state: BridgeState,
): Promise<void> {
  const p = statePath(workspace);
  // Atomic-ish write: write to .tmp then rename.
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  await fs.rename(tmp, p);
}
