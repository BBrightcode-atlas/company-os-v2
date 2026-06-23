import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
  type PluginHealthDiagnostics,
} from "@paperclipai/plugin-sdk";
import { PLUGIN_ID, PLUGIN_VERSION } from "./manifest.js";
import blueprintPlugin from "./blueprint/worker.js";
import wireframePlugin from "./wireframe/worker.js";
import projectBuilderPlugin from "./project-builder/worker.js";

const modules: Array<{ key: string; plugin: PaperclipPlugin }> = [
  { key: "blueprint", plugin: blueprintPlugin },
  { key: "wireframe", plugin: wireframePlugin },
  { key: "project-builder", plugin: projectBuilderPlugin },
];

const plugin = definePlugin({
  async setup(ctx: PluginContext) {
    for (const module of modules) {
      await module.plugin.definition.setup(ctx);
    }
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
