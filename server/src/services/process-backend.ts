/**
 * ProcessBackend — abstraction over how long-running leader CLI
 * processes are supervised.
 *
 * Production impl: Pm2ProcessBackend (see process-backend-pm2.ts)
 * Test impl: FakeProcessBackend (in-memory, deterministic)
 *
 * Why abstracted: domain service (leaderProcessService) should not
 * reach into pm2 directly — that makes it untestable without a real
 * PM2 daemon. The interface is minimal so swapping to a different
 * supervisor (systemd user units, a different process manager, or
 * even a container runtime) is a one-file change.
 *
 * @see docs/cos-v2/phase4-cli-design.md §11
 */

export interface ProcessSpec {
  /** Unique PM2 process name (e.g. "cos-cyrus-43ff837d"). */
  name: string;
  /** Absolute path to the script to execute (e.g. /.../bin/claude). */
  script: string;
  /** CLI args to pass to the script. */
  args: string[];
  /** Working directory for the spawned process. */
  cwd: string;
  /** Environment variables. Merged into the child's env. */
  env: Record<string, string>;
  /** Optional: log file for stdout (PM2 default: cwd/logs/stdout.log). */
  outFile?: string;
  /** Optional: log file for stderr. */
  errFile?: string;
}

export interface ProcessHandle {
  name: string;
  pmId: number;
  pid: number;
}

export interface ProcessInfo {
  name: string;
  pmId: number;
  pid: number | null;
  /**
   * PM2-compatible lifecycle status:
   *   online    — process is up
   *   stopped   — process is down (graceful)
   *   errored   — process crashed (max restarts exceeded)
   *   launching — spawn in progress
   *   stopping  — shutdown in progress
   *   unknown   — other / unmapped
   */
  status:
    | "online"
    | "stopped"
    | "errored"
    | "launching"
    | "stopping"
    | "unknown";
  uptimeMs: number;
  restartCount: number;
  memoryBytes: number;
  cpuPercent: number;
}

export interface ProcessBackend {
  /** Start a process with the given spec. Returns a handle on success. */
  spawn(spec: ProcessSpec): Promise<ProcessHandle>;

  /**
   * Send graceful stop (SIGTERM → wait → SIGKILL on timeout).
   * Returns the last known exit code (null if unknown).
   */
  stop(name: string, timeoutMs?: number): Promise<{ exitCode: number | null }>;

  /** Delete the process from the supervisor entirely (implies stop first). */
  remove(name: string): Promise<void>;

  /** List all processes managed by this backend. */
  list(): Promise<ProcessInfo[]>;

  /** Describe a single process, or null if not found. */
  describe(name: string): Promise<ProcessInfo | null>;

  /** Cheap liveness check — equivalent to describe(name)?.status === "online". */
  isAlive(name: string): Promise<boolean>;

  /**
   * Read the last N lines of a log file (stdout or stderr). Returns an
   * empty array if the file does not exist.
   */
  tailLog(
    name: string,
    kind: "out" | "err",
    lines: number,
  ): Promise<string[]>;
}
