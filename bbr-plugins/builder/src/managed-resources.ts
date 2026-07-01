export const DATA = {
  managedResources: "builder.managed-resources",
} as const;

export const ACTION = {
  ensureBuilderResources: "ensure-builder-resources",
  resetBuilderResources: "reset-builder-resources",
} as const;

// 분석 산출물 생성 에이전트의 LLM 프로바이더(어댑터)를 env로 스위칭한다.
// claude_local(기본, Opus) ↔ codex_local(gpt-5.5). 어댑터를 바꾸면
// reconcile 시 기존 에이전트도 새 어댑터로 reset된다(worker의 adapter drift 처리).
function envValue(key: string): string {
  const value = typeof process !== "undefined" ? process.env?.[key] : undefined;
  return typeof value === "string" ? value.trim() : "";
}

export const BUILDER_MANAGED_AGENT_ADAPTER_TYPE = envValue("COS_BUILDER_AGENT_ADAPTER") || "claude_local";

const DEFAULT_MODEL_BY_ADAPTER: Record<string, string> = {
  claude_local: "claude-opus-4-8",
  codex_local: "gpt-5.5",
};

export const BUILDER_MANAGED_AGENT_MODEL = envValue("COS_BUILDER_AGENT_MODEL")
  || DEFAULT_MODEL_BY_ADAPTER[BUILDER_MANAGED_AGENT_ADAPTER_TYPE]
  || "claude-opus-4-8";

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
  // codex_local은 구조화 산출물 생성을 위해 reasoning effort + git 체크 skip이 필요하다.
  // (xhigh는 단일 생성에 70분+ 무진척이라 기본 high로 둔다.)
  if (BUILDER_MANAGED_AGENT_ADAPTER_TYPE === "codex_local") {
    config.modelReasoningEffort = envValue("COS_BUILDER_AGENT_REASONING") || "high";
    config.extraArgs = ["--skip-git-repo-check"];
  }
  return config;
}
