import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";

export default defineConfig({
  plugins: [
    {
      name: "builder-raw-html",
      enforce: "pre",
      load(id) {
        if (!id.endsWith(".html")) return null;
        return `export default ${JSON.stringify(readFileSync(id, "utf8"))};`;
      },
    },
  ],
  test: {
    include: ["tests/**/*.spec.ts"],
    environment: "node",
  },
});
