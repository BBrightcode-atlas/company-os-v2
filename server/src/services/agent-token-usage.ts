import type { Db } from "@paperclipai/db";
import { agentTokenUsage } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";

/**
 * Phase M1 계측 — heartbeat_runs 완료 시점에 agent_token_usage 에 토큰 사용량 기록.
 *
 * 북극성 "accepted PR per 1M tokens" 측정 원천.
 * 실패해도 heartbeat 흐름은 깨지지 않도록 best-effort 로 처리 (try/catch + log).
 */

export interface RecordHeartbeatTokenUsageInput {
  db: Db;
  companyId: string;
  agentId: string;
  runId: string;
  issueId: string | null;
  model: string;
  adapterType: string;
  tokensIn: number;
  tokensOut: number;
  tokensCacheRead?: number;
  tokensCacheWrite?: number;
  costCents?: number | null;
  /**
   * subagent 로 spawn 된 경우 type 이름 (예: "cos-builder").
   * Coordinator 본인 실행이면 null.
   * heartbeat 경로에서는 일단 null — subagent 별 세부 트래킹은 Phase M2.
   */
  subagentType?: string | null;
}

/**
 * heartbeat_runs 완료 시 호출. Coordinator 레벨 집계.
 */
export async function recordHeartbeatTokenUsage(
  input: RecordHeartbeatTokenUsageInput,
): Promise<void> {
  const {
    db,
    companyId,
    agentId,
    runId,
    issueId,
    model,
    adapterType,
    tokensIn,
    tokensOut,
    tokensCacheRead = 0,
    tokensCacheWrite = 0,
    costCents = null,
    subagentType = null,
  } = input;

  // 토큰이 전혀 없는 경우는 기록 안 함 (에러/auth-only 런 등)
  if (tokensIn === 0 && tokensOut === 0 && tokensCacheRead === 0) {
    return;
  }

  try {
    await db.insert(agentTokenUsage).values({
      companyId,
      agentId,
      runType: "heartbeat",
      runId,
      issueId,
      subagentType,
      model,
      tokensIn,
      tokensOut,
      tokensCacheRead,
      tokensCacheWrite,
      costCents,
      adapterType,
    });
  } catch (err) {
    // 계측 실패는 운영에 영향 주면 안 됨. 로그만 남기고 swallow.
    logger.warn(
      {
        err: err instanceof Error ? err.message : String(err),
        agentId,
        runId,
        runType: "heartbeat",
      },
      "[agent-token-usage] insert failed — best-effort, swallowing",
    );
  }
}

/**
 * sub_agent_runs 완료 시 호출. subagent 레벨 세부 집계. (Phase M2 용 stub)
 */
export async function recordSubAgentTokenUsage(
  input: Omit<RecordHeartbeatTokenUsageInput, "subagentType"> & {
    subagentType: string;
    subAgentRunId: string;
  },
): Promise<void> {
  const { db, subAgentRunId, subagentType, ...rest } = input;
  if (rest.tokensIn === 0 && rest.tokensOut === 0 && rest.tokensCacheRead === 0) {
    return;
  }
  try {
    await db.insert(agentTokenUsage).values({
      companyId: rest.companyId,
      agentId: rest.agentId,
      runType: "subagent",
      runId: subAgentRunId,
      issueId: rest.issueId,
      subagentType,
      model: rest.model,
      tokensIn: rest.tokensIn,
      tokensOut: rest.tokensOut,
      tokensCacheRead: rest.tokensCacheRead ?? 0,
      tokensCacheWrite: rest.tokensCacheWrite ?? 0,
      costCents: rest.costCents ?? null,
      adapterType: rest.adapterType,
    });
  } catch (err) {
    logger.warn(
      {
        err: err instanceof Error ? err.message : String(err),
        agentId: rest.agentId,
        subAgentRunId,
        subagentType,
      },
      "[agent-token-usage] subagent insert failed — best-effort, swallowing",
    );
  }
}
