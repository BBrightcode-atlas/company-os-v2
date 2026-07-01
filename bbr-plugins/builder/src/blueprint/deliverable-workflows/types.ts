import type {
  BlueprintPrd,
  BlueprintStagePromptBase,
  ProjectDocumentSlotKey,
} from "../contract.js";

// staged 생성 1회분 공유 컨텍스트.
// base = 프롬프트 공통 입력(sources/제품설정/가이드라인/coverage),
// fallbackPrd = LLM 실패 시 각 워크플로우가 자기 deliverable만 떼어 쓰는 결정론적 산출물.
export type BlueprintStageContext = {
  base: BlueprintStagePromptBase;
  fallbackPrd: BlueprintPrd;
};

// 산출물 하나 = 격리된 워크플로우.
// - buildPrompt: 지금까지 누적된 BlueprintPrd(assembled)와 컨텍스트로 이 산출물 전용 프롬프트 생성.
// - merge: LLM JSON을 assembled 위에 overlay(자기 키만 갱신, 이전 산출물 보존).
// - applyFallback: LLM 실패 시 fallbackPrd에서 자기 deliverable 필드만 채택.
export type BlueprintDeliverableWorkflow = {
  key: string;
  label: string;
  dependsOn: string[];
  writeSlotKeys: ProjectDocumentSlotKey[];
  maxTokens: number;
  buildPrompt: (assembled: BlueprintPrd, ctx: BlueprintStageContext) => string;
  merge: (rawJson: unknown, assembled: BlueprintPrd) => BlueprintPrd;
  applyFallback: (assembled: BlueprintPrd, ctx: BlueprintStageContext) => BlueprintPrd;
};
