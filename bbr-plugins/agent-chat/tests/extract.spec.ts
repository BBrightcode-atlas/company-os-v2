import { describe, expect, it } from "vitest";
import { extractAssistantText, extractRunReply } from "../src/constants.js";

describe("extractAssistantText", () => {
  it("pulls Claude Code assistant text from stream-json", () => {
    const raw = [
      `{"type":"system","subtype":"init"}`,
      `{"type":"assistant","message":{"content":[{"type":"text","text":"안녕하세요"}]}}`,
      `{"type":"result","result":"안녕하세요"}`,
    ].join("\n");
    expect(extractAssistantText(raw)).toBe("안녕하세요");
  });

  it("pulls Codex agent_message text from stream-json", () => {
    const raw = [
      `{"type":"thread.started","thread_id":"x"}`,
      `{"type":"item.completed","item":{"id":"r","type":"reasoning","text":"thinking"}}`,
      `{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"처리하겠습니다."}}`,
      `{"type":"turn.completed"}`,
    ].join("\n");
    expect(extractAssistantText(raw)).toBe("처리하겠습니다.");
  });

  it("falls back to raw when no assistant lines are present", () => {
    expect(extractAssistantText("plain text reply")).toBe("plain text reply");
  });
});

describe("extractRunReply", () => {
  it("prefers claude result, then codex summary", () => {
    expect(extractRunReply({ result: "claude-reply" })).toBe("claude-reply");
    expect(extractRunReply({ summary: "codex-summary" })).toBe("codex-summary");
  });

  it("parses assistant text from stdout when no result/summary", () => {
    const stdout = `{"type":"item.completed","item":{"type":"agent_message","text":"from-stdout"}}`;
    expect(extractRunReply({ stdout })).toBe("from-stdout");
  });
});
