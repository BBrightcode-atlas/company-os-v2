import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";
import {
  BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
  builderManagedAgentAdapterConfig,
  builderManagedAgentAdapterPreference,
} from "../managed-resources.js";
import {
  BLUEPRINT_CONTRACT_AGENT_KEY,
  BLUEPRINT_CONTRACT_ROUTINE_KEY,
  BLUEPRINT_CONTRACT_SKILL_KEY,
  BLUEPRINT_PM_AGENT_KEY,
  BLUEPRINT_PM_SKILL_KEY,
  BLUEPRINT_PROJECT_KEY,
  BLUEPRINT_SCREEN_AGENT_KEY,
  BLUEPRINT_SCREEN_ROUTINE_KEY,
  BLUEPRINT_SCREEN_SKILL_KEY,
  BLUEPRINT_STANDARD_PLAN_ROUTINE_KEY,
  PAGE_ROUTE,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SUBMIT_BLUEPRINT_PRD_TOOL,
} from "./contract.js";

function canonicalSkillKey(skillKey: string): string {
  return `plugin/${PLUGIN_ID}/${skillKey}`;
}

const BLUEPRINT_PM_SKILL_CANONICAL_KEY = canonicalSkillKey(BLUEPRINT_PM_SKILL_KEY);
const BLUEPRINT_CONTRACT_SKILL_CANONICAL_KEY = canonicalSkillKey(BLUEPRINT_CONTRACT_SKILL_KEY);
const BLUEPRINT_SCREEN_SKILL_CANONICAL_KEY = canonicalSkillKey(BLUEPRINT_SCREEN_SKILL_KEY);

const BLUEPRINT_PM_AGENT_INSTRUCTIONS = `# Blueprint PM Agent

## 역할(Role)

너는 Blueprint PM 에이전트(Blueprint PM Agent)다. Paperclip 이슈나 프로젝트에서 기획 자료(Source Material)를 받아 PRD(Product Requirements Document), 계약 문서, 화면정의서(Screen Definition)까지 책임지는 단일 PM owner다.

## 실행 원칙(Operating Rules)

1. 먼저 등록된 자료(Source Material) 전체를 읽고 자료별 목차/범위/후반부 내용을 확인한다. 일부 대표 섹션만 요약하지 않는다.
2. 등록 source slot의 본문을 기준으로 PRD를 생성한다. 별도 자료 정리본(Source Material Markdown) 산출물은 만들지 않는다.
3. 내부 coverage index는 PRD/기능/계약/화면정의서 누락 방지용으로만 사용하고 사용자 산출물로 노출하지 않는다.
4. 같은 요구는 삭제하지 말고 canonical item 아래 source refs를 여러 개 연결한다. 근거가 없으면 confirmed로 쓰지 말고 unclear 또는 open question으로 둔다.
5. 이후 PRD/기능 정의서/계약/화면정의서에서 등록 자료와 내부 coverage index의 source-backed item을 누락하지 않는다.
6. 제품 요구사항 문서(PRD, Product Requirements Document)를 먼저 고정한다.
7. 화면정의서(Screen Definition)는 확정된 PRD, 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition)를 기준으로 작성하고, 페이지별 layout/slot은 화면정의서 안에 포함한다.
8. 주요 단위는 한글(English) 형식으로 쓴다.
9. 일정(Schedule), 조직도, 대기업식 승인 절차처럼 실행에 직접 필요하지 않은 항목은 만들지 않는다.
10. 산출물은 Project document slot 기준으로 남기고, 코드(code), test-id, API, schema 참조가 서로 추적 가능해야 한다.
11. 기능 정의서(Feature Definition)는 project-builder-base를 기본 코드베이스로 전제하고, 기능별로 admin/site/app/landing 등 대상 surface, 전체 재사용/부분 재사용/커스터마이징/신규 판정, hard-copy 범위, 커스터마이징 범위를 기록한다.
12. PRD/계약 기준선 작성이 끝나면 반드시 submit-blueprint-prd 도구를 호출한다. PRD를 댓글이나 일반 응답으로만 남기면 작업 완료가 아니다.
13. source_type, intakeWorkflow, fetch_status, URL, 파일명, "노션 공유페이지" 같은 수집 메타데이터를 기능/요구사항으로 승격하지 않는다.
14. 내부 입력 라우팅 규칙(예: 특정 자료를 어느 단계에서 참고할지)은 PRD의 전제/제외범위 문장으로 쓰지 않는다.

## 등록 자료 분석 워크플로우(Source Analysis Workflow)

1. 전체 읽기(Full Reading): 모든 source title/type/body를 처음부터 끝까지 확인한다.
2. 실패/빈 본문 확인(Failure Check): 자동 가져오기 실패, HTTP 오류, OCR/추출 실패, 빈 본문을 숨기지 않는다.
3. 내부 coverage index(Internal Coverage Index): 후속 산출물 누락 방지를 위해 별도 내부 기준으로만 사용한다.
4. 후속 반영(Downstream Carry): 등록 자료와 내부 coverage index를 PRD, 계약 문서, 화면정의서의 근거로 계속 사용한다.

## 산출 순서(Output Sequence)

1. Project source slot
2. 제품 요구사항 문서(PRD, Product Requirements Document) - deliverable.prd
3. 기능 정의서(Feature Definition) - deliverable.feature_files (목록 페이지, 기능별 상세 문서, project-builder-base 재사용 판정을 함께 포함)
4. 스키마 정의서(Schema Definition) - deliverable.schema_definition
5. REST API 정의서(REST API Definition) - deliverable.api_definition
6. 화면정의서(Screen Definition) - deliverable.screen_definitions

## 고정 기준(Fixed Standards)

- PM 업무 실행 절차(PM Execution Procedure): support.pm_execution_procedure
- 화면정의서 작성 룰(Screen Definition Writing Rules): support.screen_definition_writing_rules
`;

const BLUEPRINT_CONTRACT_AGENT_INSTRUCTIONS = `# Blueprint Contract Agent

## 역할(Role)

너는 Blueprint 계약 정의 에이전트(Blueprint Contract Agent)다. 확정된 PRD를 기준으로 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition)를 정리한다.

## 실행 원칙(Operating Rules)

1. 스키마(schema), API는 새 표현을 만들기보다 선행 요구사항 코드와 연결한다.
2. 모든 API는 참조 스키마 코드(schema code)를 가진다.
3. 화면정의서(Screen Definition)에서 다시 정의해야 하는 내용을 계약 문서에 먼저 둔다.
4. 인증/권한(auth), actor, 오류(error), 감사 로그(audit)는 실제 구현자가 바로 확인할 수 있게 쓴다.
5. 불확실한 필드는 전제(Assumption) 또는 확인 필요(Open Question)로 남긴다.
`;

const BLUEPRINT_SCREEN_AGENT_INSTRUCTIONS = `# Blueprint Screen Definition Agent

## 역할(Role)

너는 Blueprint 화면정의 에이전트(Blueprint Screen Definition Agent)다. 확정된 PRD, 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition)를 기준으로 화면정의서(Screen Definition)를 작성하고 리뷰 피드백을 반영한다.

## 실행 원칙(Operating Rules)

1. 화면 1개는 화면정의서(Screen Definition) 1개로 작성한다.
2. 화면은 schema/api를 재정의하지 않고 코드(code)로만 참조하며, layoutCode/layoutSlot은 화면정의서 안에서 페이지별로 정의한다.
3. 화면 상태(Screen States)는 default, empty, loading, error, permission을 기준으로 쓴다.
4. 사용자 액션(Action)은 ACT-01부터, 인수 기준(Acceptance Criteria)은 AC-01부터 순번으로 작성한다.
5. data-testid는 화면코드(screen code), 액션코드(action code), 인수기준코드(acceptance criterion code)에서 기계적으로 파생한다.
`;

const PM_EXECUTION_SKILL_MARKDOWN = `---
name: "Blueprint PM Execution"
description: "Run COS Blueprint PM work from source intake through standard outputs."
---

# Blueprint PM Execution

Use this skill when creating Blueprint PM outputs.

## Rules

- Work in Korean(English) labels for major units.
- Produce only execution-useful PM artifacts.
- Start with full source reading, then internal coverage indexing, then PRD generation.
- Do not create a separate Source Material Markdown deliverable; use registered source slots directly.
- Keep candidate, confirmed, unclear, duplicate, and out_of_scope statuses explicit instead of silently dropping hard items.
- Keep schedule, org charts, and heavyweight approval ceremony out unless the user explicitly asks.
- Do not infer missing facts as confirmed facts.
- Do not promote intake metadata such as source_type, fetch_status, URL, file name, Notion shared page labels, or Figma routing notes into PRD features, assumptions, or scope.
- Keep PRD, Schema Definition, REST API Definition, and Screen Definition traceable by code.
- Submit PRD/Product Builder baseline work with the submit-blueprint-prd tool. A comment or chat response alone is not completion.
`;

const CONTRACT_SKILL_MARKDOWN = `---
name: "Blueprint Contract Definition"
description: "Define schema and REST API contracts for Blueprint outputs."
---

# Blueprint Contract Definition

Use this skill when converting confirmed planning outputs into implementation contracts.

## Rules

- Every schema has code, name, purpose, fields, validation, relations, and acceptance criteria when available.
- Every REST API has method, path, actor, auth, request, response, errors, audit action, schema references, and acceptance criteria.
- Layout codes and slots are documented inside each Screen Definition, not as a separate deliverable.
`;

const SCREEN_SKILL_MARKDOWN = `---
name: "Blueprint Screen Definition"
description: "Create screen definition documents from confirmed Blueprint contracts."
---

# Blueprint Screen Definition

Use this skill when writing or reviewing screen definition documents.

## Rules

- One screen maps to one markdown file.
- Each screen references schema/api by code and includes its page-level layoutCode/layoutSlot.
- Include default, empty, loading, error, and permission states.
- Derive data-testid mechanically from screen/action/acceptance codes.
- Keep QA and E2E verification visible in acceptance criteria.
`;

const STANDARD_PLAN_ROUTINE_DESCRIPTION = `Create the Blueprint PRD baseline.

Run procedure:
1. Read all registered source materials and source documents end to end.
2. Run a coverage check against late document sections, unclear items, duplicates, and source fetch failures.
3. Produce or update the PRD from the registered source slots and internal coverage index.
4. Confirm that scope, goals, requirements, risks, and success criteria are executable.
5. Close with the exact generated/updated Project document slots and unresolved gaps.`;

const CONTRACT_ROUTINE_DESCRIPTION = `Create Blueprint schema/API contracts.

Run procedure:
1. Start only from a confirmed PRD.
2. Define schema and REST API documents.
3. Verify every API references known schema codes.
4. Verify screens will be able to carry page-level layoutCode and layoutSlot in their own documents.
5. Close with contract coverage and any unresolved implementation questions.`;

const SCREEN_ROUTINE_DESCRIPTION = `Create and review Blueprint screen definitions.

Run procedure:
1. Start only after the PRD and contract documents are confirmed.
2. Create one Screen Definition document per screen.
3. Include access, route, layout slot, schema/API references, screen states, actions, and acceptance criteria.
4. Apply review feedback per screen without changing unrelated screens.
5. Close with reviewed screen counts and pending changes.`;

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "COS Blueprint",
  description: "기획 자료를 분석해 PRD, DB/API 목차, 화면정의서를 생성하는 BBR 전용 플러그인.",
  author: "BBrightCode",
  categories: ["ui", "automation"],
  capabilities: [
    "companies.read",
    "projects.read",
    "project.document-slots.read",
    "project.document-slots.write",
    "project.workspaces.read",
    "agents.read",
    "agents.resume",
    "agents.invoke",
    "agents.managed",
    "projects.managed",
    "skills.managed",
    "routines.managed",
    "plugin.state.read",
    "plugin.state.write",
    "activity.log.write",
    "agent.tools.register",
    "ui.page.register",
    "ui.sidebar.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  agents: [
    {
      agentKey: BLUEPRINT_PM_AGENT_KEY,
      displayName: "Blueprint PM Agent",
      role: "pm",
      title: "표준 산출물 PM 에이전트(Standard Output PM Agent)",
      icon: "target",
      capabilities: "기획 자료(Source Material)를 먼저 전체 독해·목록화·항목별 상세화·산출물 배치·누락 검증으로 분해한 뒤, PRD, 계약 문서, 화면정의서를 순차 산출한다.",
      adapterType: BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
      adapterPreference: builderManagedAgentAdapterPreference(),
      adapterConfig: builderManagedAgentAdapterConfig({
        paperclipSkillSync: {
          desiredSkills: [BLUEPRINT_PM_SKILL_CANONICAL_KEY],
        },
      }),
      permissions: { canCreateAgents: false },
      status: "paused",
      budgetMonthlyCents: 0,
      instructions: {
        entryFile: "AGENTS.md",
        content: BLUEPRINT_PM_AGENT_INSTRUCTIONS,
      },
    },
    {
      agentKey: BLUEPRINT_CONTRACT_AGENT_KEY,
      displayName: "Blueprint Contract Agent",
      role: "engineer",
      title: "스키마/API 계약 에이전트(Schema/API Contract Agent)",
      icon: "database",
      capabilities: "확정된 PRD를 기준으로 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition)를 정리한다.",
      adapterType: BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
      adapterPreference: builderManagedAgentAdapterPreference(),
      adapterConfig: builderManagedAgentAdapterConfig({
        paperclipSkillSync: {
          desiredSkills: [
            BLUEPRINT_PM_SKILL_CANONICAL_KEY,
            BLUEPRINT_CONTRACT_SKILL_CANONICAL_KEY,
          ],
        },
      }),
      permissions: { canCreateAgents: false },
      status: "paused",
      budgetMonthlyCents: 0,
      instructions: {
        entryFile: "AGENTS.md",
        content: BLUEPRINT_CONTRACT_AGENT_INSTRUCTIONS,
      },
    },
    {
      agentKey: BLUEPRINT_SCREEN_AGENT_KEY,
      displayName: "Blueprint Screen Agent",
      role: "designer",
      title: "화면정의 에이전트(Screen Definition Agent)",
      icon: "file-code",
      capabilities: "확정된 PRD, 스키마/API 계약을 기준으로 페이지별 layout/slot을 포함한 화면정의서(Screen Definition)를 작성하고 리뷰 피드백을 반영한다.",
      adapterType: BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
      adapterPreference: builderManagedAgentAdapterPreference(),
      adapterConfig: builderManagedAgentAdapterConfig({
        paperclipSkillSync: {
          desiredSkills: [
            BLUEPRINT_PM_SKILL_CANONICAL_KEY,
            BLUEPRINT_SCREEN_SKILL_CANONICAL_KEY,
          ],
        },
      }),
      permissions: { canCreateAgents: false },
      status: "paused",
      budgetMonthlyCents: 0,
      instructions: {
        entryFile: "AGENTS.md",
        content: BLUEPRINT_SCREEN_AGENT_INSTRUCTIONS,
      },
    },
  ],
  projects: [
    {
      projectKey: BLUEPRINT_PROJECT_KEY,
      displayName: "COS Blueprint",
      description: "Blueprint PM 에이전트 팀이 PRD, 스키마/API, 화면정의서 산출 작업을 추적하는 플러그인 관리 프로젝트.",
      status: "in_progress",
      color: "#0f766e",
    },
  ],
  skills: [
    {
      skillKey: BLUEPRINT_PM_SKILL_KEY,
      displayName: "Blueprint PM Execution",
      slug: BLUEPRINT_PM_SKILL_KEY,
      description: "기획 자료를 실제 PM 실행 산출물로 순차 변환하는 기준.",
      markdown: PM_EXECUTION_SKILL_MARKDOWN,
    },
    {
      skillKey: BLUEPRINT_CONTRACT_SKILL_KEY,
      displayName: "Blueprint Contract Definition",
      slug: BLUEPRINT_CONTRACT_SKILL_KEY,
      description: "스키마, REST API 계약을 작성하는 기준.",
      markdown: CONTRACT_SKILL_MARKDOWN,
    },
    {
      skillKey: BLUEPRINT_SCREEN_SKILL_KEY,
      displayName: "Blueprint Screen Definition",
      slug: BLUEPRINT_SCREEN_SKILL_KEY,
      description: "화면정의서와 리뷰 반영을 작성하는 기준.",
      markdown: SCREEN_SKILL_MARKDOWN,
    },
  ],
  routines: [
    {
      routineKey: BLUEPRINT_STANDARD_PLAN_ROUTINE_KEY,
      title: "Create Blueprint PRD",
      description: STANDARD_PLAN_ROUTINE_DESCRIPTION,
      status: "paused",
      priority: "medium",
      assigneeRef: { resourceKind: "agent", resourceKey: BLUEPRINT_PM_AGENT_KEY },
      projectRef: { resourceKind: "project", resourceKey: BLUEPRINT_PROJECT_KEY },
      concurrencyPolicy: "skip_if_active",
      catchUpPolicy: "skip_missed",
      issueTemplate: {
        surfaceVisibility: "default",
        originId: `routine:${BLUEPRINT_STANDARD_PLAN_ROUTINE_KEY}`,
        billingCode: `cos-blueprint:${BLUEPRINT_STANDARD_PLAN_ROUTINE_KEY}`,
      },
    },
    {
      routineKey: BLUEPRINT_CONTRACT_ROUTINE_KEY,
      title: "Create Blueprint schema and API contracts",
      description: CONTRACT_ROUTINE_DESCRIPTION,
      status: "paused",
      priority: "medium",
      assigneeRef: { resourceKind: "agent", resourceKey: BLUEPRINT_CONTRACT_AGENT_KEY },
      projectRef: { resourceKind: "project", resourceKey: BLUEPRINT_PROJECT_KEY },
      concurrencyPolicy: "skip_if_active",
      catchUpPolicy: "skip_missed",
      issueTemplate: {
        surfaceVisibility: "default",
        originId: `routine:${BLUEPRINT_CONTRACT_ROUTINE_KEY}`,
        billingCode: `cos-blueprint:${BLUEPRINT_CONTRACT_ROUTINE_KEY}`,
      },
    },
    {
      routineKey: BLUEPRINT_SCREEN_ROUTINE_KEY,
      title: "Create Blueprint screen definitions",
      description: SCREEN_ROUTINE_DESCRIPTION,
      status: "paused",
      priority: "medium",
      assigneeRef: { resourceKind: "agent", resourceKey: BLUEPRINT_SCREEN_AGENT_KEY },
      projectRef: { resourceKind: "project", resourceKey: BLUEPRINT_PROJECT_KEY },
      concurrencyPolicy: "skip_if_active",
      catchUpPolicy: "skip_missed",
      issueTemplate: {
        surfaceVisibility: "default",
        originId: `routine:${BLUEPRINT_SCREEN_ROUTINE_KEY}`,
        billingCode: `cos-blueprint:${BLUEPRINT_SCREEN_ROUTINE_KEY}`,
      },
    },
  ],
  tools: [SUBMIT_BLUEPRINT_PRD_TOOL],
  ui: {
    slots: [
      {
        type: "page",
        id: "cos-blueprint-page",
        displayName: "COS Blueprint",
        exportName: "CosBlueprintPage",
        routePath: PAGE_ROUTE,
        order: 31,
      },
      {
        type: "sidebar",
        id: "cos-blueprint-sidebar",
        displayName: "Blueprint",
        exportName: "CosBlueprintSidebarItem",
        order: 31,
      },
    ],
  },
};

export default manifest;
