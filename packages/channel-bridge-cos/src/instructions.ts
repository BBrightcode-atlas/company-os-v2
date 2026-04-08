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

export function buildInstructionsField(leader: LeaderInstructions): string {
  // Server-side `/team-instructions` is the single source of truth for
  // the leader's system prompt (identity + protocol + rooms + teams).
  // The Agent Detail "Leader CLI Instructions" preview UI renders this
  // same markdown verbatim, so anything we prepend here would desync.
  //
  // `fetchInstructions` above substitutes its own non-empty error stub
  // on HTTP failure / network error, and the server template is always
  // non-empty for a valid leader — so the markdown is guaranteed to be
  // a non-empty string by the time we get here. We intentionally pass
  // it through verbatim.
  return leader.markdown;
}
