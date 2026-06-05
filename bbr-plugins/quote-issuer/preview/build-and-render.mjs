// 프리뷰 전용: sample-entry.ts 를 번들해 실행 → preview.html 생성.
// .js 확장자 import 를 .ts 로 매핑하는 인라인 resolve 플러그인 포함(types-only deps 라 외부 의존 없음).
import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const jsToTs = {
  name: "js-to-ts",
  setup(build) {
    build.onResolve({ filter: /\.js$/ }, (args) => {
      if (args.kind === "entry-point") return null;
      const abs = path.resolve(args.resolveDir, args.path);
      return { path: abs.replace(/\.js$/, ".ts") };
    });
  },
};

const entry = process.argv[2] || "sample-entry.ts";
const result = await esbuild.build({
  entryPoints: [path.join(__dirname, entry)],
  bundle: true,
  format: "esm",
  platform: "node",
  write: false,
  plugins: [jsToTs],
  absWorkingDir: root,
});

const code = result.outputFiles[0].text;
const mod = path.join(__dirname, "_bundle.mjs");
writeFileSync(mod, code);
await import(mod + "?t=" + Date.now());
