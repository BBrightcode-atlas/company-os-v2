/**
 * Parse + validate env vars passed from the COS v2 server via
 * .mcp.json. Fails loud — if any required var is missing the process
 * exits with an explicit error BEFORE the MCP server spins up.
 */

export interface BridgeEnv {
  COS_API_URL: string;
  COS_COMPANY_ID: string;
  COS_AGENT_ID: string;
  COS_AGENT_KEY: string;
  COS_WORKSPACE: string;
  COS_SESSION_ID: string;
}

function must(name: keyof BridgeEnv): string {
  const val = process.env[name];
  if (!val || val.length === 0) {
    console.error(`[channel-bridge-cos] Missing required env: ${name}`);
    process.exit(1);
  }
  return val;
}

export function loadEnv(): BridgeEnv {
  return {
    COS_API_URL: must("COS_API_URL"),
    COS_COMPANY_ID: must("COS_COMPANY_ID"),
    COS_AGENT_ID: must("COS_AGENT_ID"),
    COS_AGENT_KEY: must("COS_AGENT_KEY"),
    COS_WORKSPACE: must("COS_WORKSPACE"),
    COS_SESSION_ID: must("COS_SESSION_ID"),
  };
}
