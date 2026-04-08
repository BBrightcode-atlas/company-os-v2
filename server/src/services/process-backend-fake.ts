/**
 * FakeProcessBackend — in-memory ProcessBackend for unit tests.
 *
 * Deterministic, synchronous, no external deps. Simulates the happy
 * path + lets tests drive crash/exit events via test helpers.
 *
 * @see docs/cos-v2/phase4-cli-design.md §11.2
 */

import type {
  ProcessBackend,
  ProcessHandle,
  ProcessInfo,
  ProcessSpec,
} from "./process-backend.js";

interface FakeProcess {
  name: string;
  pmId: number;
  pid: number;
  status: ProcessInfo["status"];
  startedAt: number;
  restartCount: number;
  logs: { out: string[]; err: string[] };
  exitCode: number | null;
}

export interface FakeProcessBackend extends ProcessBackend {
  /** Test helper: simulate an unplanned exit (crash). */
  crash(name: string, exitCode: number): void;
  /** Test helper: append a line to the log buffer. */
  log(name: string, kind: "out" | "err", line: string): void;
  /** Test helper: reset all state. */
  reset(): void;
}

export function createFakeProcessBackend(): FakeProcessBackend {
  const map = new Map<string, FakeProcess>();
  let pmIdCounter = 1;
  let pidCounter = 10_000;

  function toInfo(p: FakeProcess): ProcessInfo {
    return {
      name: p.name,
      pmId: p.pmId,
      pid: p.status === "online" ? p.pid : null,
      status: p.status,
      uptimeMs: p.status === "online" ? Date.now() - p.startedAt : 0,
      restartCount: p.restartCount,
      memoryBytes: 0,
      cpuPercent: 0,
    };
  }

  return {
    async spawn(spec: ProcessSpec): Promise<ProcessHandle> {
      const existing = map.get(spec.name);
      if (existing && existing.status === "online") {
        return { name: existing.name, pmId: existing.pmId, pid: existing.pid };
      }
      const fake: FakeProcess = {
        name: spec.name,
        pmId: existing?.pmId ?? pmIdCounter++,
        pid: pidCounter++,
        status: "online",
        startedAt: Date.now(),
        restartCount: existing ? existing.restartCount + 1 : 0,
        logs: existing?.logs ?? { out: [], err: [] },
        exitCode: null,
      };
      map.set(spec.name, fake);
      return { name: fake.name, pmId: fake.pmId, pid: fake.pid };
    },

    async stop(name, _timeoutMs) {
      const p = map.get(name);
      if (!p) return { exitCode: null };
      p.status = "stopped";
      p.exitCode = 0;
      return { exitCode: 0 };
    },

    async remove(name) {
      map.delete(name);
    },

    async list() {
      return Array.from(map.values()).map(toInfo);
    },

    async describe(name) {
      const p = map.get(name);
      return p ? toInfo(p) : null;
    },

    async isAlive(name) {
      const p = map.get(name);
      return !!p && p.status === "online";
    },

    async tailLog(name, kind, lines) {
      const p = map.get(name);
      if (!p) return [];
      return p.logs[kind].slice(-lines);
    },

    crash(name, exitCode) {
      const p = map.get(name);
      if (!p) return;
      p.status = "errored";
      p.exitCode = exitCode;
    },

    log(name, kind, line) {
      const p = map.get(name);
      if (!p) return;
      p.logs[kind].push(line);
    },

    reset() {
      map.clear();
      pmIdCounter = 1;
      pidCounter = 10_000;
    },
  };
}
