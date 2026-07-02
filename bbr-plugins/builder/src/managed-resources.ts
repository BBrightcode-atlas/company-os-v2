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
