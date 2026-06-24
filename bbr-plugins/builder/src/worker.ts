import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
  type PluginHealthDiagnostics,
} from "@paperclipai/plugin-sdk";
import { ACTION as BUILDER_ACTION, DATA as BUILDER_DATA } from "./managed-resources.js";
import { PLUGIN_ID, PLUGIN_VERSION } from "./manifest.js";
import {
  BLUEPRINT_AGENT_KEYS,
  BLUEPRINT_PROJECT_KEY,
  BLUEPRINT_ROUTINE_KEYS,
  BLUEPRINT_SKILL_KEYS,
  isAllowedCompany,
} from "./blueprint/contract.js";
import blueprintPlugin from "./blueprint/worker.js";
import wireframePlugin from "./wireframe/worker.js";
import {
  BUILDER_AGENT_KEYS as PRODUCT_BUILDER_AGENT_KEYS,
  BUILDER_SKILL_KEY as PRODUCT_BUILDER_SKILL_KEY,
} from "./project-builder/contract.js";
import projectBuilderPlugin from "./project-builder/worker.js";

const modules: Array<{ key: string; plugin: PaperclipPlugin }> = [
  { key: "blueprint", plugin: blueprintPlugin },
  { key: "wireframe", plugin: wireframePlugin },
  { key: "project-builder", plugin: projectBuilderPlugin },
];

const BUILDER_AGENT_RESOURCE_KEYS = [
  ...BLUEPRINT_AGENT_KEYS,
  ...PRODUCT_BUILDER_AGENT_KEYS,
] as const;
const BUILDER_SKILL_RESOURCE_KEYS = [
  ...BLUEPRINT_SKILL_KEYS,
  PRODUCT_BUILDER_SKILL_KEY,
] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function companyIdFromParams(params: Record<string, unknown>): string {
  const companyId = stringValue(params.companyId);
  if (!companyId) throw new Error("companyId is required");
  if (!isAllowedCompany(companyId)) throw new Error("Builder is only available for the BBR company");
  return companyId;
}

async function safeLog(ctx: PluginContext, entry: Parameters<PluginContext["activity"]["log"]>[0]): Promise<void> {
  try {
    await ctx.activity.log(entry);
  } catch (error) {
    ctx.logger?.info?.(`Builder activity.log failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getBuilderManagedResources(ctx: PluginContext, companyId: string) {
  const [managedAgents, managedProject, managedSkills, managedRoutines] = await Promise.all([
    Promise.all(BUILDER_AGENT_RESOURCE_KEYS.map((agentKey) => ctx.agents.managed.get(agentKey, companyId))),
    ctx.projects.managed.get(BLUEPRINT_PROJECT_KEY, companyId),
    Promise.all(BUILDER_SKILL_RESOURCE_KEYS.map((skillKey) => ctx.skills.managed.get(skillKey, companyId))),
    Promise.all(BLUEPRINT_ROUTINE_KEYS.map((routineKey) => ctx.routines.managed.get(routineKey, companyId))),
  ]);
  return { managedAgents, managedProject, managedSkills, managedRoutines };
}

async function reconcileBuilderManagedResources(
  ctx: PluginContext,
  companyId: string,
  mode: "reconcile" | "reset",
) {
  const managedProjectPromise = mode === "reset"
    ? ctx.projects.managed.reset(BLUEPRINT_PROJECT_KEY, companyId)
    : ctx.projects.managed.reconcile(BLUEPRINT_PROJECT_KEY, companyId);
  const [managedProject, managedAgents, managedSkills] = await Promise.all([
    managedProjectPromise,
    Promise.all(BUILDER_AGENT_RESOURCE_KEYS.map((agentKey) => (
      mode === "reset"
        ? ctx.agents.managed.reset(agentKey, companyId)
        : ctx.agents.managed.reconcile(agentKey, companyId)
    ))),
    Promise.all(BUILDER_SKILL_RESOURCE_KEYS.map((skillKey) => (
      mode === "reset"
        ? ctx.skills.managed.reset(skillKey, companyId)
        : ctx.skills.managed.reconcile(skillKey, companyId)
    ))),
  ]);
  const managedRoutines = await Promise.all(
    BLUEPRINT_ROUTINE_KEYS.map((routineKey) => (
      mode === "reset"
        ? ctx.routines.managed.reset(routineKey, companyId)
        : ctx.routines.managed.reconcile(routineKey, companyId)
    )),
  );
  return { managedAgents, managedProject, managedSkills, managedRoutines };
}

const plugin = definePlugin({
  async setup(ctx: PluginContext) {
    for (const module of modules) {
      await module.plugin.definition.setup(ctx);
    }

    ctx.data.register(BUILDER_DATA.managedResources, async (params) => {
      const companyId = stringValue(asRecord(params).companyId);
      if (!companyId || !isAllowedCompany(companyId)) return null;
      return getBuilderManagedResources(ctx, companyId);
    });

    ctx.actions.register(BUILDER_ACTION.ensureBuilderResources, async (params) => {
      const companyId = companyIdFromParams(asRecord(params));
      const resolved = await reconcileBuilderManagedResources(ctx, companyId, "reconcile");
      await safeLog(ctx, {
        companyId,
        message: "Builder managed resources ensured",
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: {
          agentKeys: BUILDER_AGENT_RESOURCE_KEYS,
          projectKey: BLUEPRINT_PROJECT_KEY,
          skillKeys: BUILDER_SKILL_RESOURCE_KEYS,
          routineKeys: BLUEPRINT_ROUTINE_KEYS,
        },
      });
      return resolved;
    });

    ctx.actions.register(BUILDER_ACTION.resetBuilderResources, async (params) => {
      const companyId = companyIdFromParams(asRecord(params));
      const resolved = await reconcileBuilderManagedResources(ctx, companyId, "reset");
      await safeLog(ctx, {
        companyId,
        message: "Builder managed resources reset",
        entityType: "plugin",
        entityId: PLUGIN_ID,
        metadata: {
          agentKeys: BUILDER_AGENT_RESOURCE_KEYS,
          projectKey: BLUEPRINT_PROJECT_KEY,
          skillKeys: BUILDER_SKILL_RESOURCE_KEYS,
          routineKeys: BLUEPRINT_ROUTINE_KEYS,
        },
      });
      return resolved;
    });
  },

  async onHealth(): Promise<PluginHealthDiagnostics> {
    const checks = await Promise.all(
      modules.map(async (module) => {
        try {
          const health = module.plugin.definition.onHealth
            ? await module.plugin.definition.onHealth()
            : { status: "ok" as const };
          return { module: module.key, ...health };
        } catch (error) {
          return {
            module: module.key,
            status: "error" as const,
            message: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );
    const hasError = checks.some((check) => check.status === "error");
    const hasDegraded = checks.some((check) => check.status === "degraded");
    return {
      status: hasError ? "error" : hasDegraded ? "degraded" : "ok",
      message: "Builder plugin worker is running",
      details: {
        pluginId: PLUGIN_ID,
        version: PLUGIN_VERSION,
        modules: checks,
      },
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
