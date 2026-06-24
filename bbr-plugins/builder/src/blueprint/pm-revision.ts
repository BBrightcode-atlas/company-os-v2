import type { SourceMaterial } from "./contract.js";

export type PmRevisionOutput = {
  body: string;
  changeSummary: string;
};

export type PmRevisionPreviousDocument = {
  id?: string | null;
  latestRevisionNumber?: number | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function objectList(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry));
}

export function oneLine(value: string, max = 500): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

export function isPmChatDeliverableGenerationRequest(message: string): boolean {
  return /생성|재생성|산출|작성|만들|만들어|generate|regenerate|write|create/i.test(message);
}

export function isPmChatDeliverableRevisionRequest(message: string): boolean {
  return /수정|변경|고쳐|바꿔|반영|보완|정정|업데이트|추가|삭제|제거|빼|넣어|edit|modify|revise|update|change|add|remove|delete/i.test(message);
}

export function isRegenerationRequest(message: string): boolean {
  return /재생성|다시|새로|regenerate/i.test(message);
}

export function buildPmRevisionSourceContext(sources: SourceMaterial[], maxChars: number): string {
  if (sources.length === 0) return "(registered source material 없음)";
  let total = 0;
  const blocks: string[] = [];
  for (const [index, source] of sources.entries()) {
    const remaining = maxChars - total;
    if (remaining <= 0) {
      blocks.push(`...(이하 ${sources.length - index}건 자료 생략, revision source context 상한 도달)`);
      break;
    }
    const body = source.body.length > remaining ? `${source.body.slice(0, remaining)}\n...(truncated)` : source.body;
    total += body.length;
    blocks.push([
      `## Source ${index + 1}: ${source.title}`,
      `type: ${source.type}`,
      source.fileName ? `fileName: ${source.fileName}` : null,
      source.url ? `url: ${source.url}` : null,
      body,
    ].filter((line): line is string => line !== null).join("\n"));
  }
  return blocks.join("\n\n");
}

export function buildDeliverableRevisionPrompt(input: {
  title: string;
  slotKey: string;
  currentBody: string;
  request: string;
  sources: SourceMaterial[];
  sourceBodyMaxChars: number;
}): string {
  return [
    "현재 Project deliverable Markdown 산출물을 사용자의 수정 요청에 맞게 갱신하라.",
    "출력은 유효한 JSON 객체 하나뿐이다.",
    "반드시 전체 수정본 body를 반환한다. patch/diff/설명만 반환하지 않는다.",
    "사용자가 요청하지 않은 기존 섹션, 표, 코드, mermaid, 항목, 순서는 보존한다.",
    "요약, 축소, 임의 삭제는 금지한다. 삭제/제거가 명시된 경우에만 해당 내용을 제거한다.",
    "추가/변경 근거가 필요하면 Registered Source Context 안의 내용만 사용한다. 없는 사실은 open question이나 TBD로 표시한다.",
    "Markdown 형식을 유지하고, 코드펜스가 본문에 원래 필요할 때만 body 문자열 안에 보존한다.",
    "출력 JSON shape: { body: string, changeSummary: string }",
    "",
    `Deliverable title: ${input.title}`,
    `Deliverable slotKey: ${input.slotKey}`,
    "",
    "## User Revision Request",
    input.request,
    "",
    "## Current Deliverable Markdown",
    input.currentBody,
    "",
    "## Registered Source Context",
    buildPmRevisionSourceContext(input.sources, input.sourceBodyMaxChars),
  ].join("\n");
}

export function normalizeRevisionOutput(value: unknown): PmRevisionOutput {
  const record = asRecord(value);
  const body = stringValue(record.body);
  if (!body) throw new Error("PM 수정 결과에 body가 없습니다.");
  const changeSummary = stringValue(record.changeSummary) ?? "PM 채팅 수정 요청을 반영했습니다.";
  return { body, changeSummary: oneLine(changeSummary, 500) };
}

export function buildPmRevisionMetadata(input: {
  existingMetadata: unknown;
  request: string;
  revision: PmRevisionOutput;
  model: string;
  now: string;
  previousDocument: PmRevisionPreviousDocument | null | undefined;
}): Record<string, unknown> {
  const metadata = asRecord(input.existingMetadata);
  const request = oneLine(input.request, 500);
  const history = objectList(metadata.pmRevisionHistory).slice(-9);
  return {
    ...metadata,
    lastPmRevisionAt: input.now,
    lastPmRevisionRequest: request,
    lastPmRevisionSummary: input.revision.changeSummary,
    lastPmRevisionModel: input.model,
    pmRevisionHistory: [
      ...history,
      {
        at: input.now,
        request,
        summary: input.revision.changeSummary,
        previousDocumentId: input.previousDocument?.id ?? null,
        previousRevisionNumber: input.previousDocument?.latestRevisionNumber ?? null,
      },
    ],
  };
}
