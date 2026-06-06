import { redactEventPayload } from "./redaction.js";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactRecordForRead(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (!isPlainRecord(value)) return null;
  return redactEventPayload(value) ?? {};
}

function redactRequiredRecordForRead(value: unknown): Record<string, unknown> {
  return redactRecordForRead(value) ?? {};
}

export function redactAgentReadModel<T extends {
  adapterConfig?: unknown;
  runtimeConfig?: unknown;
  metadata?: unknown;
}>(agent: T): T {
  const redacted: Record<string, unknown> = { ...agent };
  if ("adapterConfig" in agent) {
    redacted.adapterConfig = redactRequiredRecordForRead(agent.adapterConfig);
  }
  if ("runtimeConfig" in agent) {
    redacted.runtimeConfig = redactRequiredRecordForRead(agent.runtimeConfig);
  }
  if ("metadata" in agent) {
    redacted.metadata = redactRecordForRead(agent.metadata);
  }
  return redacted as T;
}

export function redactProjectReadModel<T extends { env?: unknown }>(project: T): T {
  if (!("env" in project)) return project;
  return {
    ...project,
    env: redactRecordForRead(project.env),
  } as T;
}

export function redactRoutineReadModel<T extends { env?: unknown }>(routine: T): T {
  if (!("env" in routine)) return routine;
  return {
    ...routine,
    env: redactRecordForRead(routine.env),
  } as T;
}

export function redactRoutineDetailReadModel<T extends {
  env?: unknown;
  project?: unknown;
  assignee?: unknown;
}>(routine: T): T {
  return {
    ...redactRoutineReadModel(routine),
    project: isPlainRecord(routine.project) ? redactProjectReadModel(routine.project) : routine.project,
    assignee: isPlainRecord(routine.assignee) ? redactAgentReadModel(routine.assignee) : routine.assignee,
  };
}

function redactRoutineRevisionSnapshot(snapshot: unknown): unknown {
  if (!isPlainRecord(snapshot)) return snapshot;
  return {
    ...snapshot,
    routine: isPlainRecord(snapshot.routine) ? redactRoutineReadModel(snapshot.routine) : snapshot.routine,
  };
}

export function redactRoutineRevisionReadModel<T extends { snapshot?: unknown }>(revision: T): T {
  return {
    ...revision,
    snapshot: redactRoutineRevisionSnapshot(revision.snapshot),
  };
}

export function redactRoutineRestoreResultReadModel<T extends {
  routine?: unknown;
  revision?: unknown;
}>(result: T): T {
  return {
    ...result,
    routine: isPlainRecord(result.routine) ? redactRoutineReadModel(result.routine) : result.routine,
    revision: isPlainRecord(result.revision)
      ? redactRoutineRevisionReadModel(result.revision)
      : result.revision,
  };
}
