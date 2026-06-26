import { describe, expect, it } from "vitest";
import { scanContentLinks, titleFromNotionProperties } from "../src/blueprint/source-intake/notion-official.js";

describe("scanContentLinks", () => {
  it("외부 링크는 수집하고 노션 내부 링크는 제외한다", () => {
    const text = [
      "see https://example.com/docs and https://www.notion.so/abc123",
      "design https://www.figma.com/file/XYZ/spec",
      "trailing https://acme.io/page.",
    ].join("\n");
    const { external, figma } = scanContentLinks(text);
    expect(external).toContain("https://example.com/docs");
    expect(external).toContain("https://www.figma.com/file/XYZ/spec");
    expect(external).toContain("https://acme.io/page");
    expect(external.some((u) => u.includes("notion.so"))).toBe(false);
    expect(figma).toEqual(["https://www.figma.com/file/XYZ/spec"]);
  });

  it("링크가 없으면 빈 배열을 반환한다", () => {
    expect(scanContentLinks("plain text only")).toEqual({ external: [], figma: [] });
  });
});

describe("titleFromNotionProperties", () => {
  it("title 타입 속성의 평문 제목을 추출한다", () => {
    const props = {
      Name: { type: "title", title: [{ plain_text: "회사 " }, { plain_text: "법인 정보" }] },
      Status: { type: "select", select: { name: "Draft" } },
    };
    expect(titleFromNotionProperties(props)).toBe("회사 법인 정보");
  });

  it("title 속성이 없으면 undefined 를 반환한다", () => {
    expect(titleFromNotionProperties({ Status: { type: "select" } })).toBeUndefined();
    expect(titleFromNotionProperties(undefined)).toBeUndefined();
  });
});
