import type { SourceFormat } from "../contract.js";
import { isNotionSharedPageUrl } from "./notion.js";
import type { SourceIntakeWorkflowDefinition, SourceIntakeWorkflowId } from "./types.js";

export const SOURCE_INTAKE_WORKFLOW_DEFINITIONS: readonly SourceIntakeWorkflowDefinition[] = [
  {
    id: "direct_text",
    label: "직접 입력",
    inputKind: "text",
    format: "text",
    description: "PM 대화나 내부 입력으로 받은 텍스트를 자료로 등록한다.",
  },
  {
    id: "file_upload",
    label: "파일 첨부",
    inputKind: "file",
    format: "md",
    description: "txt/md/docx/pptx/pdf/xlsx 파일에서 텍스트를 추출해 자료로 등록한다.",
  },
  {
    id: "url",
    label: "URL 등록",
    inputKind: "url",
    format: "url",
    description: "일반 웹 URL을 가져와 텍스트로 정리한다.",
  },
  {
    id: "figma",
    label: "Figma 링크",
    inputKind: "url",
    format: "figma",
    description: "Figma 파일/디자인 링크를 화면 구조 자료로 가져온다.",
  },
  {
    id: "notion_shared_page",
    label: "노션공유페이지",
    inputKind: "url",
    format: "notion",
    description: "공개 Notion 공유 페이지와 접근 가능한 하위 페이지를 자료 경계별 Markdown으로 가져온다.",
  },
] as const;

const WORKFLOW_BY_ID = new Map<SourceIntakeWorkflowId, SourceIntakeWorkflowDefinition>(
  SOURCE_INTAKE_WORKFLOW_DEFINITIONS.map((workflow) => [workflow.id, workflow]),
);

function isSourceIntakeWorkflowId(value: unknown): value is SourceIntakeWorkflowId {
  return typeof value === "string" && WORKFLOW_BY_ID.has(value as SourceIntakeWorkflowId);
}

function isFigmaUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return /(^|\.)figma\.com$/i.test(url.hostname) && /\/(design|file)\//.test(url.pathname);
  } catch {
    return false;
  }
}

export function sourceIntakeWorkflowDefinition(id: SourceIntakeWorkflowId): SourceIntakeWorkflowDefinition {
  const definition = WORKFLOW_BY_ID.get(id);
  if (!definition) throw new Error(`Unknown source intake workflow: ${id}`);
  return definition;
}

export function resolveSourceIntakeWorkflow(input: {
  requestedWorkflow?: unknown;
  format?: SourceFormat | string;
  url?: string;
  fileName?: string;
  hasBody?: boolean;
}): SourceIntakeWorkflowDefinition {
  if (isSourceIntakeWorkflowId(input.requestedWorkflow)) {
    return sourceIntakeWorkflowDefinition(input.requestedWorkflow);
  }
  if (input.format === "notion" || isNotionSharedPageUrl(input.url)) {
    return sourceIntakeWorkflowDefinition("notion_shared_page");
  }
  if (input.format === "figma" || isFigmaUrl(input.url)) {
    return sourceIntakeWorkflowDefinition("figma");
  }
  if (input.url) return sourceIntakeWorkflowDefinition("url");
  if (input.fileName) return sourceIntakeWorkflowDefinition("file_upload");
  if (input.hasBody) return sourceIntakeWorkflowDefinition("direct_text");
  return sourceIntakeWorkflowDefinition("direct_text");
}
