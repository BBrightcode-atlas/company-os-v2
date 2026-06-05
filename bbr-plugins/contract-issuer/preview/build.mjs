import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const jsToTs = {
  name: "js-to-ts",
  setup(b) {
    b.onResolve({ filter: /\.js$/ }, (a) => {
      if (a.kind === "entry-point") return null;
      return { path: path.resolve(a.resolveDir, a.path).replace(/\.js$/, ".ts") };
    });
  },
};
const r = await esbuild.build({
  entryPoints: [path.join(__dirname, "render-entry.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  plugins: [jsToTs],
  absWorkingDir: root,
});
const mod = path.join(__dirname, "_b.mjs");
writeFileSync(mod, r.outputFiles[0].text);
await import(mod + "?t=" + Date.now());
