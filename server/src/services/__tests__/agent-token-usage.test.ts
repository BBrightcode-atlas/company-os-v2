import { beforeEach, describe, expect, it, vi } from "vitest";

// Stub @paperclipai/db so the service module can import the table symbol
// without pulling in the real drizzle schema / pg driver.
vi.mock("@paperclipai/db", () => ({
  agentTokenUsage: { __table: "agent_token_usage" },
}));

// Spy on logger.warn so we can assert best-effort swallowing on insert failure.
// vi.mock is hoisted — define the fn lazily inside the factory and retrieve it
// via the mocked module after import.
vi.mock("../../middleware/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import { recordHeartbeatTokenUsage } from "../agent-token-usage.js";
import { logger } from "../../middleware/logger.js";

const loggerWarnMock = logger.warn as unknown as ReturnType<typeof vi.fn>;

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    companyId: "company-1",
    agentId: "agent-1",
    runId: "run-1",
    issueId: "issue-1",
    model: "claude-3-5-sonnet",
    adapterType: "claude-local",
    tokensIn: 100,
    tokensOut: 50,
    tokensCacheRead: 0,
    tokensCacheWrite: 0,
    costCents: 12,
    subagentType: null,
    ...overrides,
  };
}

describe("recordHeartbeatTokenUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips db.insert when all token counters are zero (early return)", async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    const insertMock = vi.fn(() => ({ values: valuesMock }));
    const db = { insert: insertMock } as any;

    await recordHeartbeatTokenUsage(
      baseInput({ tokensIn: 0, tokensOut: 0, tokensCacheRead: 0, db }) as any,
    );

    expect(insertMock).not.toHaveBeenCalled();
    expect(valuesMock).not.toHaveBeenCalled();
    expect(loggerWarnMock).not.toHaveBeenCalled();
  });

  it("inserts a heartbeat row with the expected payload on happy path", async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    const insertMock = vi.fn(() => ({ values: valuesMock }));
    const db = { insert: insertMock } as any;

    await recordHeartbeatTokenUsage(
      baseInput({
        db,
        tokensIn: 1_000,
        tokensOut: 200,
        tokensCacheRead: 50,
        tokensCacheWrite: 10,
        costCents: 42,
        subagentType: null,
      }) as any,
    );

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledTimes(1);

    const payload = valuesMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload).toEqual({
      companyId: "company-1",
      agentId: "agent-1",
      runType: "heartbeat",
      runId: "run-1",
      issueId: "issue-1",
      subagentType: null,
      model: "claude-3-5-sonnet",
      tokensIn: 1_000,
      tokensOut: 200,
      tokensCacheRead: 50,
      tokensCacheWrite: 10,
      costCents: 42,
      adapterType: "claude-local",
    });
    expect(loggerWarnMock).not.toHaveBeenCalled();
  });

  it("swallows db errors and emits a single logger.warn call", async () => {
    const boom = new Error("pg boom");
    const valuesMock = vi.fn().mockRejectedValue(boom);
    const insertMock = vi.fn(() => ({ values: valuesMock }));
    const db = { insert: insertMock } as any;

    await expect(
      recordHeartbeatTokenUsage(baseInput({ db }) as any),
    ).resolves.toBeUndefined();

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(loggerWarnMock).toHaveBeenCalledTimes(1);

    const [logPayload, logMessage] = loggerWarnMock.mock.calls[0]!;
    expect(logPayload).toMatchObject({
      err: "pg boom",
      agentId: "agent-1",
      runId: "run-1",
      runType: "heartbeat",
    });
    expect(logMessage).toBe(
      "[agent-token-usage] insert failed — best-effort, swallowing",
    );
  });
});
