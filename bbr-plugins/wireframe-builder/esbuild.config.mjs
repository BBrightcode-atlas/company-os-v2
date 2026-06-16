import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPluginBundlerPresets } from "@paperclipai/plugin-sdk/bundlers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHARED_V2 = path.join(
  __dirname,
  "node_modules/.pnpm/@paperclipai+shared@file+.paperclip-sdk+shared-v2.tgz/node_modules/@paperclipai/shared",
);

const presets = createPluginBundlerPresets({ uiEntry: "src/ui/index.tsx" });
for (const key of ["worker", "manifest", "ui"]) {
  presets.esbuild[key].alias = {
    ...(presets.esbuild[key].alias ?? {}),
    "@paperclipai/shared": SHARED_V2,
  };
}
const watch = process.argv.includes("--watch");

const workerCtx = await esbuild.context(presets.esbuild.worker);
const manifestCtx = await esbuild.context(presets.esbuild.manifest);
const uiCtx = await esbuild.context(presets.esbuild.ui);

if (watch) {
  await Promise.all([workerCtx.watch(), manifestCtx.watch(), uiCtx.watch()]);
  console.log("esbuild watch mode enabled for worker, manifest, and ui");
} else {
  await Promise.all([workerCtx.rebuild(), manifestCtx.rebuild(), uiCtx.rebuild()]);
  await Promise.all([workerCtx.dispose(), manifestCtx.dispose(), uiCtx.dispose()]);
}
