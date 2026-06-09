import { readFile } from "node:fs/promises";
import type { Attachment, ChatMessage } from "./constants.js";

interface AgentLike {
  name: string;
  role: string | null;
  adapterConfig?: Record<string, unknown>;
}

/**
 * Load the agent's instructions (its AGENTS.md) so the direct LLM reply speaks in the
 * agent's voice/role. Falls back to a minimal persona if the file isn't readable.
 */
export async function loadInstructions(agent: AgentLike | null): Promise<string> {
  const cfg = agent?.adapterConfig ?? {};
  const file = typeof cfg.instructionsFilePath === "string" ? cfg.instructionsFilePath : null;
  if (file) {
    try {
      const content = (await readFile(file, "utf8")).trim();
      if (content) return stripHeartbeatLines(content);
    } catch {
      // fall through to the minimal persona
    }
  }
  const name = agent?.name ?? "Agent";
  const role = agent?.role ?? "agent";
  return `You are ${name} (${role}). Respond helpfully in the user's language.`;
}

/**
 * Drop the wake/heartbeat trigger lines from the agent's instructions. In a chat we keep the
 * agent's role/persona, but those lines tell it to "follow the Paperclip skill / run the
 * heartbeat", which makes it try to run (and then narrate) the work procedure mid-chat.
 */
function stripHeartbeatLines(instructions: string): string {
  return instructions
    .split("\n")
    .filter((line) => !/heartbeat|wake up|follow the paperclip skill|update your task with a comment/i.test(line))
    .join("\n");
}

/** Anthropic-format chat turn. */
interface Turn {
  role: "user" | "assistant";
  content: string;
}

/** A short note so the agent is aware of attachments even when vision is unavailable. */
function attachmentNote(atts: Attachment[] | undefined): string {
  if (!atts || atts.length === 0) return "";
  const names = atts.map((a) => `${a.mime?.startsWith("image/") ? "🖼" : "📎"} ${a.name}`).join(", ");
  return `\n[첨부: ${names}]`;
}

function toTurns(history: ChatMessage[]): Turn[] {
  const turns: Turn[] = [];
  for (const m of history) {
    if (m.role === "agent" && m.status === "streaming") continue; // skip the in-flight placeholder
    const note = m.role === "human" ? attachmentNote(m.attachments) : "";
    const body = `${(m.body ?? "").trim()}${note}`.trim();
    if (!body) continue;
    const role: "user" | "assistant" = m.role === "human" ? "user" : "assistant";
    // Anthropic requires alternating roles; merge consecutive same-role turns.
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n\n${body}`;
    else turns.push({ role, content: body });
  }
  if (turns.length === 0 || turns[turns.length - 1].role !== "user") {
    turns.push({ role: "user", content: "(빈 메시지)" });
  }
  return turns;
}

/** Build Anthropic image blocks from a message's image attachments (non-images skipped). */
function imageBlocks(atts: Attachment[] | undefined): Block[] {
  const blocks: Block[] = [];
  for (const a of atts ?? []) {
    if (!a.mime?.startsWith("image/")) continue;
    const comma = a.dataUrl.indexOf(",");
    const data = comma >= 0 ? a.dataUrl.slice(comma + 1) : a.dataUrl;
    if (!data) continue;
    blocks.push({ type: "image", source: { type: "base64", media_type: a.mime, data } });
  }
  return blocks;
}

/** Use a claude model for the chat lane (Anthropic /v1/messages). */
function chatModel(agent: AgentLike | null): string {
  const m = agent?.adapterConfig?.model;
  if (typeof m === "string" && m.startsWith("claude")) return m;
  return "claude-opus-4-8";
}

const NO_HEARTBEAT =
  "heartbeat 절차, wake 절차, Paperclip 작업 절차는 실행하지도 언급하지도 사과하지도 마라 " +
  "(\"heartbeat를 도는데 채팅이라 그러면 안 되네요\" 같은 메타 발언 금지). 너의 역할·전문성·성격으로 짧고 자연스럽게 대화하라.\n";

const GROUNDING_RULES =
  "\n=== 사실 근거 원칙 (절대) ===\n" +
  "프로젝트/이슈/런/코드 상태를 말할 때는 **반드시 먼저 도구로 조회**한 뒤 답하라. 추측·창작 금지.\n" +
  "- 특정 이슈를 말하기 전 get_issue(identifier)로 확인하고, 답에는 **식별자(예: FLO-19)를 명시**하라.\n" +
  "- 담당자/프로젝트/모델 등은 list_agents/list_projects/list_issues로 확인된 **실제 이름**만 사용하라.\n" +
  "- 도구가 '스냅샷에 없음'이라고 하면 **모른다고 말하고** 사용자에게 식별자를 직접 알려달라고 요청하라. 지어내지 마라.\n" +
  "- 키워드 전문검색(예: 'auth 관련 이슈 찾아줘')은 불가하다. list_issues는 프로젝트/담당자/상태 필터만 된다 — 이 한계를 솔직히 말하라.\n";

const PROPOSE_RULES =
  "\n=== 이슈/목표 생성 (대화 → 백로그) ===\n" +
  "대화에서 할 일이 도출되면 직접 만들지 말고 propose_issue / propose_goal로 **초안**을 만들어라. " +
  "그러면 사용자에게 확인 카드가 뜨고, 사용자가 확인을 눌러야 실제 생성·담당자 자동시작이 일어난다. " +
  "초안 만들 땐 담당자·프로젝트를 실제 이름으로 지정하라(없으면 도구가 거부하니 먼저 조회).";

/** 1:1 DM mode directive. */
const DM_DIRECTIVE =
  "\n\n=== 채팅 모드 (가장 중요) ===\n" +
  "지금은 동료와의 실시간 1:1 채팅이다. " +
  NO_HEARTBEAT +
  GROUNDING_RULES +
  PROPOSE_RULES;

/** Group-room directive — the agent knows it's one of several participants in a shared room. */
export function roomDirective(roomName: string, memberNames: string[], selfName: string): string {
  const others = memberNames.filter((n) => n !== selfName);
  return (
    "\n\n=== 그룹 룸 모드 (가장 중요) ===\n" +
    `지금은 '${roomName}' **그룹 룸**이다. 여러 명이 함께 보는 단체 채팅이다 — 1:1 아님. ` +
    `참여자: ${memberNames.join(", ")}. 너는 그 중 **${selfName}**이다. ` +
    `다른 참여자(${others.join(", ") || "동료들"})도 이 대화를 보고 각자 답한다. ` +
    "절대 '지금은 1:1 채팅이라 그룹 채팅은 안 된다'고 말하지 마라 — 지금 이게 바로 그룹 채팅이다. " +
    "동료 의견에 동의/반박/보완하며 회의하듯 짧고 자연스럽게 말하라. 이미 나온 말 반복 금지. " +
    "기록상 메시지 앞의 [이름]은 화자 표시일 뿐이니 네 답변 앞에는 붙이지 마라.\n" +
    NO_HEARTBEAT +
    GROUNDING_RULES
  );
}

export interface ChatTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

type Block =
  | { type: "text"; text?: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "tool_use"; id?: string; name?: string; input?: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };
type Msg = { role: "user" | "assistant"; content: string | Block[] };

function messagesHaveImage(messages: Msg[]): boolean {
  return messages.some((m) => Array.isArray(m.content) && m.content.some((b) => b.type === "image"));
}

/** Remove image blocks (keeping a text note) so a vision-incapable backend can still reply. */
function stripImageBlocks(messages: Msg[]): void {
  for (const m of messages) {
    if (typeof m.content === "string") continue;
    const out: Block[] = [];
    let removed = 0;
    for (const b of m.content) {
      if (b.type === "image") removed++;
      else out.push(b);
    }
    if (removed > 0) {
      if (out.length === 0) out.push({ type: "text", text: "[이미지 첨부 — 백엔드가 이미지를 처리하지 못함]" });
      m.content = out;
    }
  }
}

/**
 * Direct LLM reply via the local VibeProxy (memory: ctx.http blocks private IPs, so use the
 * worker's inherited ANTHROPIC_BASE_URL with a raw fetch). Bypasses the heavyweight agent
 * runtime (process spawn + MCP + hooks), so replies land in seconds instead of minutes.
 *
 * VibeProxy ignores the `system` field and forces a "Claude Code" identity, so the agent's
 * instructions are injected as the first user turn (with an assistant ack) instead. It DOES
 * honor Anthropic tool-use, so the chat can look up real data (agents, files) via tools.
 */
export async function chatComplete(input: {
  agent: AgentLike | null;
  instructions: string;
  history: ChatMessage[];
  tools?: ChatTool[];
  executeTool?: (name: string, args: Record<string, unknown>) => Promise<string>;
  directive?: string;
}): Promise<string> {
  const base = (process.env.ANTHROPIC_BASE_URL ?? "http://localhost:8317").replace(/\/$/, "");
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "no-key-required";
  const messages: Msg[] = [
    { role: "user", content: input.instructions + (input.directive ?? DM_DIRECTIVE) },
    { role: "assistant", content: "네, 알겠습니다. 그 에이전트로서 대화하겠습니다." },
    ...toTurns(input.history),
  ];

  // Attach the latest human turn's images as real vision blocks (only the most recent — older
  // turns keep just their text note, so the payload doesn't balloon resending every screenshot).
  const lastHuman = [...input.history].reverse().find((m) => m.role === "human");
  const imgs = imageBlocks(lastHuman?.attachments);
  if (imgs.length > 0) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role !== "user") continue;
      const prev = messages[i].content;
      const textBlocks: Block[] = typeof prev === "string" ? [{ type: "text", text: prev }] : prev;
      messages[i] = { role: "user", content: [...textBlocks, ...imgs] };
      break;
    }
  }

  for (let iteration = 0, imagesStripped = false; iteration < 6; iteration++) {
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: chatModel(input.agent),
        max_tokens: 4096,
        messages,
        ...(input.tools && input.tools.length > 0 ? { tools: input.tools } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // Some VibeProxy backends can't process image blocks ("Could not process image"). Rather
      // than fail the whole reply, drop the images (keeping a text note) and retry text-only.
      if (res.status === 400 && !imagesStripped && messagesHaveImage(messages)) {
        imagesStripped = true;
        stripImageBlocks(messages);
        iteration--;
        continue;
      }
      throw new Error(`LLM ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { stop_reason?: string; content?: Block[] };
    const content = data.content ?? [];

    if (data.stop_reason === "tool_use" && input.executeTool) {
      messages.push({ role: "assistant", content });
      const results: Block[] = [];
      for (const b of content) {
        if (b.type === "tool_use") {
          let out: string;
          try {
            out = await input.executeTool(b.name ?? "", b.input ?? {});
          } catch (e) {
            out = `오류: ${e instanceof Error ? e.message : "tool failed"}`;
          }
          results.push({ type: "tool_result", tool_use_id: b.id ?? "", content: out.slice(0, 60_000) });
        }
      }
      messages.push({ role: "user", content: results });
      continue;
    }

    const text = content
      .filter((b): b is { type: "text"; text?: string } => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("\n")
      .trim();
    return text || "(빈 응답)";
  }
  return "(도구 호출이 너무 많아 응답을 마무리하지 못했습니다.)";
}
