#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * PM2 PTY runner.
 *
 * PM2's default child stdio is file-based pipes, which means the
 * spawned Claude CLI sees stdin/stdout as non-TTY and auto-falls
 * back to --print mode (then errors out because no prompt was
 * provided). Claude channel mode requires a real terminal.
 *
 * This runner is what PM2 actually spawns. It uses node-pty to
 * allocate a pseudo-terminal and spawns the target binary in it.
 * The pty output is written to this runner's stdout, which PM2
 * captures to log files.
 *
 * Usage (set by ProcessBackend.spawn):
 *   script: /path/to/pty-runner.cjs
 *   args:   [<claude-binary>, <claude-arg-1>, <claude-arg-2>, ...]
 *
 * CommonJS (.cjs) — no TS/ESM loader magic, works under any Node.
 */

const pty = require("node-pty");

const [, , script, ...args] = process.argv;

if (!script) {
  console.error("[pty-runner] Usage: pty-runner.cjs <script> [args...]");
  process.exit(2);
}

const child = pty.spawn(script, args, {
  name: "xterm-256color",
  cols: 120,
  rows: 40,
  cwd: process.cwd(),
  env: {
    ...process.env,
    TERM: "xterm-256color",
    FORCE_COLOR: "1",
  },
});

// The primary child.onData handler is installed below (after the
// auto-accept state is declared) so it can inspect output AND forward
// it to stdout in a single pass.

child.onExit(({ exitCode, signal }) => {
  console.error(
    `[pty-runner] child exited code=${exitCode} signal=${signal ?? "null"}`,
  );
  process.exit(exitCode ?? 0);
});

process.stdin.on("data", (data) => {
  try {
    child.write(data.toString());
  } catch {
    /* child closed */
  }
});

process.on("SIGTERM", () => {
  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }
});
process.on("SIGINT", () => {
  try {
    child.kill("SIGINT");
  } catch {
    /* ignore */
  }
});

console.error(`[pty-runner] spawned ${script} with ${args.length} arg(s)`);

/*
 * Auto-accept Claude Code startup prompts — but ONLY when we detect
 * the specific prompt text in the pty output. Blind timer-based Enter
 * presses could dismiss dialogs that should require explicit operator
 * action, or inject stray input into the interactive session once
 * Claude reaches its ready state.
 *
 * Prompts we auto-accept (default option highlighted is always
 * "Yes, I trust" / "I am using this for local development"):
 *   1. Workspace trust — "Is this a project you trust?"
 *   2. Development channels consent — "WARNING: Loading development channels"
 *
 * Once we detect "Listening for channel messages" the session has
 * reached its ready state and we stop sending synthetic input — any
 * further injection would interfere with Claude's running session.
 */
let sessionReady = false;
const acceptedPrompts = new Set();
const PROMPT_PATTERNS = [
  {
    key: "workspace-trust",
    needle: /Is this a project you trust/i,
  },
  {
    key: "dev-channels",
    needle: /WARNING:\s*Loading development channels/i,
  },
];

// Strip ANSI escape sequences for reliable pattern matching.
function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\u001B\[[0-9;?>]*[a-zA-Z]/g, "");
}

let outputBuffer = "";
const BUFFER_CAP = 32 * 1024;

child.onData((data) => {
  try {
    process.stdout.write(data);
  } catch {
    /* stdout closed */
  }

  // Detection runs on a rolling tail of stripped output
  outputBuffer += stripAnsi(data);
  if (outputBuffer.length > BUFFER_CAP) {
    outputBuffer = outputBuffer.slice(outputBuffer.length - BUFFER_CAP);
  }

  if (!sessionReady && /Listening for channel messages/i.test(outputBuffer)) {
    sessionReady = true;
    acceptedPrompts.clear();
    return;
  }

  if (sessionReady) return;

  for (const { key, needle } of PROMPT_PATTERNS) {
    if (acceptedPrompts.has(key)) continue;
    if (needle.test(outputBuffer)) {
      acceptedPrompts.add(key);
      // Small delay so the full prompt is rendered before we dismiss
      setTimeout(() => {
        try {
          child.write("\r");
        } catch {
          /* child gone */
        }
      }, 150);
    }
  }
});
