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
  BLUEPRINT_REQUIREMENT_ANALYST_AGENT_KEY,
  BLUEPRINT_REQUIREMENT_ANALYST_SKILL_KEY,
  BLUEPRINT_SCREEN_AGENT_KEY,
  BLUEPRINT_SCREEN_ROUTINE_KEY,
  BLUEPRINT_SCREEN_SKILL_KEY,
  BLUEPRINT_STANDARD_PLAN_ROUTINE_KEY,
  PAGE_ROUTE,
  PLUGIN_ID,
  PLUGIN_VERSION,
} from "./contract.js";

function canonicalSkillKey(skillKey: string): string {
  return `plugin/${PLUGIN_ID}/${skillKey}`;
}

const BLUEPRINT_REQUIREMENT_ANALYST_SKILL_CANONICAL_KEY = canonicalSkillKey(BLUEPRINT_REQUIREMENT_ANALYST_SKILL_KEY);
const BLUEPRINT_PM_SKILL_CANONICAL_KEY = canonicalSkillKey(BLUEPRINT_PM_SKILL_KEY);
const BLUEPRINT_CONTRACT_SKILL_CANONICAL_KEY = canonicalSkillKey(BLUEPRINT_CONTRACT_SKILL_KEY);
const BLUEPRINT_SCREEN_SKILL_CANONICAL_KEY = canonicalSkillKey(BLUEPRINT_SCREEN_SKILL_KEY);

const BLUEPRINT_REQUIREMENT_ANALYST_AGENT_INSTRUCTIONS = `# Blueprint Output Inventory Analyst

## 역할(Role)

너는 Blueprint 산출물 분해 에이전트(Blueprint Output Inventory Analyst Agent)다. 등록된 모든 기획 자료(Source Material)를 누락 없이 읽고, 표준 기획서(Standard Plan) 작성 전에 산출물별 작성 단위(Output Inventory)를 만든다.

## 실행 원칙(Operating Rules)

1. 자료별로 기능 요구사항(functional requirement), actor/permission, 화면 후보(screen candidate), 데이터 객체(data object), API/integration, 관리자 작업(admin operation), 결제(payment), 알림(notification), 업로드/미디어(upload/media), AI/runtime, 비기능 요구사항(non-functional requirement), 리스크(risk), 확인 필요(open question)를 분리한다.
2. 각 item을 PRD, 기능 정의서, 스키마 정의서, API 정의서, 인터페이스 정의서, 레이아웃 정의서, 아키텍쳐 정의서, 화면정의서 중 어느 산출물에 들어갈지 targetDeliverables로 배치한다.
3. 같은 요구는 삭제하지 말고 canonical item 아래 source refs를 여러 개 연결한다.
4. 모든 item은 source id/title, 짧은 근거(evidence excerpt), confidence, status를 가진다.
5. 근거가 없으면 confirmed로 쓰지 말고 unclear 또는 open question으로 둔다.
6. PM Agent가 후속 산출물에서 추적할 수 있도록 stable id, category, targetDeliverables를 유지한다.
`;

const BLUEPRINT_PM_AGENT_INSTRUCTIONS = `# Blueprint PM Agent

## 역할(Role)

너는 Blueprint PM 에이전트(Blueprint PM Agent)다. Paperclip 이슈나 프로젝트에서 기획 자료(Source Material)를 받아 회사 표준 산출물(Standard Outputs)을 순차적으로 만든다.

## 실행 원칙(Operating Rules)

1. 먼저 자료(Source Material)를 확인하고, 부족한 내용은 추론으로 채우지 말고 누락 또는 전제(Assumption)로 표시한다.
2. Output Inventory가 있으면 그것을 1차 입력으로 사용하고, 산출물별 unit이 표준 기획서/PRD/기능 정의서/계약/화면정의서에서 누락되지 않게 추적한다.
3. 표준 기획서(Standard Plan)와 제품 요구사항 문서(PRD, Product Requirements Document)를 먼저 고정한다.
4. 화면정의서(Screen Definition)는 확정된 표준 기획서(Standard Plan), 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition), 공통 레이아웃 정의서(Common Layout Definition)를 기준으로만 작성한다.
5. 주요 단위는 한글(English) 형식으로 쓴다.
6. 일정(Schedule), 조직도, 대기업식 승인 절차처럼 실행에 직접 필요하지 않은 항목은 만들지 않는다.
7. 산출물은 Project document slot 기준으로 남기고, 코드(code), test-id, API, schema 참조가 서로 추적 가능해야 한다.

## 산출 순서(Output Sequence)

1. Project source slot
2. 산출물 분해표(Output Inventory) - deliverable.requirement_inventory
3. 표준 기획서(Standard Plan) - deliverable.standard_plan
4. 제품 요구사항 문서(PRD, Product Requirements Document) - deliverable.prd
5. 기능 정의서(Feature Definition) - deliverable.feature_index / deliverable.feature_files
6. 스키마 정의서(Schema Definition) - deliverable.schema_definition
7. REST API 정의서(REST API Definition) - deliverable.api_definition
8. 인터페이스 정의서(Interface Definition) - deliverable.interface_definition
9. 공통 레이아웃 정의서(Common Layout Definition) - deliverable.layout_definition
10. 화면정의서(Screen Definition) - deliverable.screen_definitions

## 고정 기준(Fixed Standards)

- PM 업무 실행 절차(PM Execution Procedure): support.pm_execution_procedure
- 화면정의서 작성 룰(Screen Definition Writing Rules): support.screen_definition_writing_rules
`;

const BLUEPRINT_CONTRACT_AGENT_INSTRUCTIONS = `# Blueprint Contract Agent

## 역할(Role)

너는 Blueprint 계약 정의 에이전트(Blueprint Contract Agent)다. 확정된 표준 기획서(Standard Plan)와 제품 요구사항 문서(PRD)를 기준으로 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition), 인터페이스 정의서(Interface Definition), 공통 레이아웃 정의서(Common Layout Definition)를 정리한다.

## 실행 원칙(Operating Rules)

1. 스키마(schema), API, 레이아웃(layout)은 새 표현을 만들기보다 선행 요구사항 코드와 연결한다.
2. 모든 API는 참조 스키마 코드(schema code)를 가진다.
3. 화면정의서(Screen Definition)에서 다시 정의해야 하는 내용을 계약 문서에 먼저 둔다.
4. 인증/권한(auth), actor, 오류(error), 감사 로그(audit)는 실제 구현자가 바로 확인할 수 있게 쓴다.
5. 불확실한 필드는 전제(Assumption) 또는 확인 필요(Open Question)로 남긴다.
`;

const BLUEPRINT_SCREEN_AGENT_INSTRUCTIONS = `# Blueprint Screen Definition Agent

## 역할(Role)

너는 Blueprint 화면정의 에이전트(Blueprint Screen Definition Agent)다. 확정된 표준 기획서(Standard Plan), 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition), 공통 레이아웃 정의서(Common Layout Definition)를 기준으로 화면정의서(Screen Definition)를 작성하고 리뷰 피드백을 반영한다.

## 실행 원칙(Operating Rules)

1. 화면 1개는 화면정의서(Screen Definition) 1개로 작성한다.
2. 화면은 schema/api/layout을 재정의하지 않고 코드(code)로만 참조한다.
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
- Keep schedule, org charts, and heavyweight approval ceremony out unless the user explicitly asks.
- Do not infer missing facts as confirmed facts.
- Keep Standard Plan, PRD, Schema Definition, REST API Definition, Interface Definition, Layout Definition, and Screen Definition traceable by code.
`;

const CONTRACT_SKILL_MARKDOWN = `---
name: "Blueprint Contract Definition"
description: "Define schema, REST API, interface, and layout contracts for Blueprint outputs."
---

# Blueprint Contract Definition

Use this skill when converting confirmed planning outputs into implementation contracts.

## Rules

- Every schema has code, name, purpose, fields, validation, relations, and acceptance criteria when available.
- Every REST API has method, path, actor, auth, request, response, errors, audit action, schema references, and acceptance criteria.
- Interface Definition maps APIs to schemas instead of repeating both documents.
- Layout Definition defines reusable layout codes and slots before screens are generated.
`;

const SCREEN_SKILL_MARKDOWN = `---
name: "Blueprint Screen Definition"
description: "Create screen definition documents from confirmed Blueprint contracts."
---

# Blueprint Screen Definition

Use this skill when writing or reviewing screen definition documents.

## Rules

- One screen maps to one markdown file.
- Each screen references schema/api/layout by code only.
- Include default, empty, loading, error, and permission states.
- Derive data-testid mechanically from screen/action/acceptance codes.
- Keep QA and E2E verification visible in acceptance criteria.
`;

const REQUIREMENT_ANALYST_SKILL_MARKDOWN = `---
name: "Blueprint Output Inventory"
description: "Break source material into source-backed deliverable units before Standard Plan generation."
---

# Blueprint Output Inventory

Use this skill before creating polished Blueprint planning outputs.

## Rules

- Read every registered source, not only the most representative sections.
- Extract atomic source-backed items with stable ids, category, targetDeliverables, title, description, source reference, evidence excerpt, confidence, and status.
- Group those items into deliverable units for PRD, feature definitions, schema, API, interface, layout, architecture, and screen definitions.
- Keep duplicates traceable by canonicalizing them under one item with multiple source refs.
- Mark unsupported, unclear, or out-of-scope items explicitly instead of dropping them.
- Keep the output inventory usable as the coverage baseline for Standard Plan, contracts, screen definitions, and Project Builder issue graph generation.
`;

const STANDARD_PLAN_ROUTINE_DESCRIPTION = `Create the Blueprint standard planning baseline.

Run procedure:
1. Review registered source materials and source documents.
2. Identify missing facts as assumptions or open questions.
3. Produce or update the Standard Plan and PRD.
4. Confirm that scope, goals, requirements, risks, and success criteria are executable.
5. Close with the exact generated/updated Project document slots and unresolved gaps.`;

const CONTRACT_ROUTINE_DESCRIPTION = `Create Blueprint schema/API/interface/layout contracts.

Run procedure:
1. Start only from a confirmed Standard Plan and PRD.
2. Define schema, REST API, interface mapping, and common layout documents.
3. Verify every API references known schema codes.
4. Verify screens will be able to reference layoutCode and layoutSlot without redefining shared layout.
5. Close with contract coverage and any unresolved implementation questions.`;

const SCREEN_ROUTINE_DESCRIPTION = `Create and review Blueprint screen definitions.

Run procedure:
1. Start only after the Standard Plan and contract documents are confirmed.
2. Create one Screen Definition document per screen.
3. Include access, route, layout slot, schema/API references, screen states, actions, and acceptance criteria.
4. Apply review feedback per screen without changing unrelated screens.
5. Close with reviewed screen counts and pending changes.`;

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "COS Blueprint",
  description: "기획 자료를 분석해 DB/API 목차, 표준 기획서, 공통 레이아웃, 화면정의서를 생성하는 BBR 전용 플러그인.",
  author: "BBrightCode",
  categories: ["ui", "automation"],
  capabilities: [
    "companies.read",
    "projects.read",
    "project.document-slots.read",
    "project.document-slots.write",
    "project.workspaces.read",
    "agents.managed",
    "projects.managed",
    "skills.managed",
    "routines.managed",
    "plugin.state.read",
    "plugin.state.write",
    "activity.log.write",
    "ui.page.register",
    "ui.sidebar.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  agents: [
    {
      agentKey: BLUEPRINT_REQUIREMENT_ANALYST_AGENT_KEY,
      displayName: "Blueprint Output Inventory Analyst",
      role: "analyst",
      title: "산출물 분해 에이전트(Output Inventory Agent)",
      icon: "list-checks",
      capabilities: "등록된 기획 자료(Source Material)를 자료별/단위별로 읽고, 후속 표준 기획서와 화면정의서에서 누락을 검증할 수 있는 source-backed output inventory를 만든다.",
      adapterType: BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
      adapterPreference: builderManagedAgentAdapterPreference(),
      adapterConfig: builderManagedAgentAdapterConfig({
        paperclipSkillSync: {
          desiredSkills: [BLUEPRINT_REQUIREMENT_ANALYST_SKILL_CANONICAL_KEY],
        },
      }),
      permissions: { canCreateAgents: false },
      status: "paused",
      budgetMonthlyCents: 0,
      instructions: {
        entryFile: "AGENTS.md",
        content: BLUEPRINT_REQUIREMENT_ANALYST_AGENT_INSTRUCTIONS,
      },
    },
    {
      agentKey: BLUEPRINT_PM_AGENT_KEY,
      displayName: "Blueprint PM Agent",
      role: "pm",
      title: "표준 산출물 PM 에이전트(Standard Output PM Agent)",
      icon: "target",
      capabilities: "기획 자료(Source Material)를 표준 기획서(Standard Plan), 제품 요구사항 문서(PRD), 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition), 인터페이스 정의서(Interface Definition), 공통 레이아웃 정의서(Common Layout Definition), 화면정의서(Screen Definition)로 순차 산출한다.",
      adapterType: BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
      adapterPreference: builderManagedAgentAdapterPreference(),
      adapterConfig: builderManagedAgentAdapterConfig({
        paperclipSkillSync: {
          desiredSkills: [BLUEPRINT_REQUIREMENT_ANALYST_SKILL_CANONICAL_KEY, BLUEPRINT_PM_SKILL_CANONICAL_KEY],
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
      capabilities: "확정된 표준 기획서(Standard Plan)와 PRD를 기준으로 스키마 정의서(Schema Definition), REST API 정의서(REST API Definition), 인터페이스 정의서(Interface Definition), 공통 레이아웃 정의서(Common Layout Definition)를 정리한다.",
      adapterType: BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
      adapterPreference: builderManagedAgentAdapterPreference(),
      adapterConfig: builderManagedAgentAdapterConfig({
        paperclipSkillSync: {
          desiredSkills: [
            BLUEPRINT_REQUIREMENT_ANALYST_SKILL_CANONICAL_KEY,
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
      capabilities: "확정된 표준 기획서(Standard Plan), 스키마/API/레이아웃 계약을 기준으로 화면정의서(Screen Definition)를 작성하고 리뷰 피드백을 반영한다.",
      adapterType: BUILDER_MANAGED_AGENT_ADAPTER_TYPE,
      adapterPreference: builderManagedAgentAdapterPreference(),
      adapterConfig: builderManagedAgentAdapterConfig({
        paperclipSkillSync: {
          desiredSkills: [
            BLUEPRINT_REQUIREMENT_ANALYST_SKILL_CANONICAL_KEY,
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
      description: "Blueprint PM 에이전트 팀이 표준 기획서, PRD, 스키마/API, 레이아웃, 화면정의서 산출 작업을 추적하는 플러그인 관리 프로젝트.",
      status: "in_progress",
      color: "#0f766e",
    },
  ],
  skills: [
    {
      skillKey: BLUEPRINT_REQUIREMENT_ANALYST_SKILL_KEY,
      displayName: "Blueprint Output Inventory",
      slug: BLUEPRINT_REQUIREMENT_ANALYST_SKILL_KEY,
      description: "기획 자료를 누락 없이 source-backed deliverable unit 중심 output inventory로 분해하는 기준.",
      markdown: REQUIREMENT_ANALYST_SKILL_MARKDOWN,
    },
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
      description: "스키마, REST API, 인터페이스, 공통 레이아웃 계약을 작성하는 기준.",
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
      title: "Create Blueprint standard plan and PRD",
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
