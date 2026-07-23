import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const sharedV2 = path.join(
  rootDir,
  "node_modules/.pnpm/@paperclipai+shared@file+.paperclip-sdk+shared-v2.tgz/node_modules/@paperclipai/shared",
);

export default defineConfig({
  resolve: {
    alias: {
      "@paperclipai/shared": sharedV2,
    },
  },
  test: {
    include: ["tests/**/*.spec.ts"],
    environment: "node",
    server: {
      deps: {
        inline: ["@paperclipai/plugin-sdk"],
      },
    },
  },
});
