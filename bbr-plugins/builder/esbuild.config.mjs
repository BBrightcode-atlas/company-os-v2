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

if (presets.esbuild.worker) {
  // wireframe Shell(shell.html)을 worker 번들에 텍스트로 인라인 — ui 프리셋의 ".css":"text" 와 동형.
  presets.esbuild.worker.loader = {
    ...(presets.esbuild.worker.loader ?? {}),
    ".html": "text",
    ".md": "text", // DaisyUI 스킬 컴포넌트 문서(daisyui-skill/components/*.md)를 worker 번들에 인라인.
  };
}

if (presets.esbuild.ui) {
  presets.esbuild.ui.loader = {
    ...(presets.esbuild.ui.loader ?? {}),
    ".css": "text",
  };
  presets.esbuild.ui.banner = {
    ...(presets.esbuild.ui.banner ?? {}),
    js: [
      'import * as __pcReact from "react";',
      'import * as __pcReactDom from "react-dom";',
      "function require(id) {",
      '  if (id === "react") return __pcReact;',
      '  if (id === "react-dom") return __pcReactDom;',
      "  throw new Error(\"Dynamic require of '\" + id + \"' is not supported\");",
      "}",
    ].join("\n"),
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
