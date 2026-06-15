import { describe, expect, it } from "vitest";
import manifest from "../src/manifest.js";

describe("portfolio manifest", () => {
  it("declares a portfolio page route and read-only capabilities", () => {
    expect(manifest.displayName).toBe("Portfolio");
    expect(manifest.capabilities).toEqual(expect.arrayContaining([
      "projects.read",
      "issues.read",
      "agents.read",
      "ui.page.register",
    ]));
    expect(manifest.capabilities).not.toEqual(expect.arrayContaining([
      "issues.create",
      "issues.update",
      "projects.managed",
    ]));
    expect(manifest.ui?.slots).toContainEqual(expect.objectContaining({
      type: "page",
      routePath: "portfolio",
      exportName: "PortfolioPage",
    }));
  });
});
