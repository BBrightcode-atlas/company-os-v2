import { describe, expect, it } from "vitest";
import { pluginManifestV1Schema } from "@paperclipai/shared";
import manifest from "../src/manifest.js";

describe("manifest", () => {
  it("validates against the plugin manifest schema", () => {
    expect(() => pluginManifestV1Schema.parse(manifest)).not.toThrow();
  });

  it("declares chat capabilities + database + slots", () => {
    const m = pluginManifestV1Schema.parse(manifest);
    expect(m.database).toMatchObject({ migrationsDir: "migrations" });
    expect(m.capabilities).toEqual(
      expect.arrayContaining([
        "agents.read",
        "database.namespace.migrate",
        "database.namespace.read",
        "database.namespace.write",
      ]),
    );
    const slotTypes = (m.ui?.slots ?? []).map((s) => s.type);
    expect(slotTypes).toEqual(expect.arrayContaining(["sidebar", "page"]));
    const page = (m.ui?.slots ?? []).find((s) => s.type === "page");
    expect(page).toMatchObject({ routePath: "chat", exportName: "ChatPage" });
  });
});
