export const DATA = {
  managedResources: "builder.managed-resources",
} as const;

export const ACTION = {
  ensureBuilderResources: "ensure-builder-resources",
  resetBuilderResources: "reset-builder-resources",
} as const;

function envValue(key: string): string {
  const value = typeof process !== "undefined" ? process.env?.[key] : undefined;
  return typeof value === "string" ? value.trim() : "";
}

export const BUILDER_MANAGED_AGENT_ADAPTER_TYPE = envValue("COS_BUILDER_AGENT_ADAPTER") || "claude_local";

export const BUILDER_MANAGED_AGENT_MODEL = "claude-fable-5";

export function builderManagedAgentAdapterPreference(): string[] {
  return [BUILDER_MANAGED_AGENT_ADAPTER_TYPE];
}

export function builderManagedAgentAdapterConfig(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    ...extra,
    model: BUILDER_MANAGED_AGENT_MODEL,
  };
  if (BUILDER_MANAGED_AGENT_ADAPTER_TYPE === "codex_local") {
    config.modelReasoningEffort = envValue("COS_BUILDER_AGENT_REASONING") || "high";
    config.extraArgs = ["--skip-git-repo-check"];
  }
  return config;
}

// 순차·연속 실행 정책: 에이전트당 run 1개(순차 보장) + 이벤트 wake 허용(연속 보장).
// 타이머 heartbeat는 끈 채로 둔다 — 연속성은 호스트의 blocker-resolved 자동 wake와
// project-builder watchdog job이 책임진다.
export const BUILDER_MANAGED_AGENT_HEARTBEAT = {
  enabled: false,
  intervalSec: 0,
  wakeOnDemand: true,
  maxConcurrentRuns: 1,
} as const;

export function builderManagedAgentRuntimeConfig(): Record<string, unknown> {
  return { heartbeat: { ...BUILDER_MANAGED_AGENT_HEARTBEAT } };
}

// reconcile 시 기존 에이전트의 heartbeat 설정이 선언과 다르면 reset 대상으로 판단한다.
export function builderManagedAgentHeartbeatDrift(agent: unknown): boolean {
  const runtimeConfig = agent && typeof agent === "object"
    ? (agent as { runtimeConfig?: unknown }).runtimeConfig
    : undefined;
  const heartbeat = runtimeConfig && typeof runtimeConfig === "object"
    ? (runtimeConfig as { heartbeat?: unknown }).heartbeat
    : undefined;
  const current = heartbeat && typeof heartbeat === "object"
    ? heartbeat as Record<string, unknown>
    : {};
  return (Object.keys(BUILDER_MANAGED_AGENT_HEARTBEAT) as Array<keyof typeof BUILDER_MANAGED_AGENT_HEARTBEAT>)
    .some((key) => current[key] !== BUILDER_MANAGED_AGENT_HEARTBEAT[key]);
}

type ManagedAgentReconcileCtx = {
  agents: {
    managed: {
      reconcile(agentKey: string, companyId: string): Promise<unknown>;
      reset(agentKey: string, companyId: string): Promise<unknown>;
    };
  };
};

/**
 * 관리 에이전트를 reconcile하되, 어댑터(LLM 프로바이더) 또는 heartbeat 실행 정책이
 * 선언값과 다르면 reset해서 재적용한다. host의 reconcile은 기존 에이전트의
 * adapterType/runtimeConfig를 갱신하지 않으므로(reset만 갱신), 이 경유 없이
 * reconcile만 하면 순차 실행 정책(maxConcurrentRuns=1)이 기존 에이전트에 반영되지 않는다.
 */
export async function reconcileBuilderAgentApplyingDrift(
  ctx: ManagedAgentReconcileCtx,
  agentKey: string,
  companyId: string,
): Promise<unknown> {
  const resolved = await ctx.agents.managed.reconcile(agentKey, companyId);
  const agent = resolved && typeof resolved === "object"
    ? (resolved as { agent?: unknown }).agent
    : undefined;
  if (!agent) return resolved;
  const currentAdapter = (agent as { adapterType?: string | null }).adapterType ?? null;
  const adapterDrift = currentAdapter !== BUILDER_MANAGED_AGENT_ADAPTER_TYPE;
  if (!adapterDrift && !builderManagedAgentHeartbeatDrift(agent)) return resolved;
  return ctx.agents.managed.reset(agentKey, companyId);
}
