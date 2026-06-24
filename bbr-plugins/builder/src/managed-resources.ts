export const DATA = {
  managedResources: "builder.managed-resources",
} as const;

export const ACTION = {
  ensureBuilderResources: "ensure-builder-resources",
  resetBuilderResources: "reset-builder-resources",
} as const;

export const BUILDER_MANAGED_AGENT_ADAPTER_TYPE = "codex_local";
export const BUILDER_MANAGED_AGENT_MODEL = "gpt-5.5";
export const BUILDER_MANAGED_AGENT_MODEL_REASONING_EFFORT = "xhigh";

export function builderManagedAgentAdapterPreference(): string[] {
  return [BUILDER_MANAGED_AGENT_ADAPTER_TYPE];
}

export function builderManagedAgentAdapterConfig(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...extra,
    model: BUILDER_MANAGED_AGENT_MODEL,
    modelReasoningEffort: BUILDER_MANAGED_AGENT_MODEL_REASONING_EFFORT,
  };
}
