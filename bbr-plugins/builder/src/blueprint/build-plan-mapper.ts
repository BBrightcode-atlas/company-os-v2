// 결정론적: Blueprint 산출물(prd)에서 task를 artifact 단위로 전개한다. LLM 없음.
//
// 사용자 요구 구조:
// - feature(FR) 단위로 묶는다(feature parent 이슈).
// - 모든 CRUD가 개별 task: 링크된 스키마 1개 = BE task 1개, API 엔드포인트 1개 = BE task 1개.
// - BE와 FE를 분리한다: BE(스키마/API), FE(surface별 화면), QA(기능 검증).
// - 각 스키마/API는 primary FR(연결된 첫 FR)에 1회만 배정해 중복 task를 만들지 않는다.
// - 끝에 제품 통합 QA + Release 게이트.
//
// 의존: API task → 그 API의 스키마 task, FE task → feature의 API task, QA → feature BE+FE,
//       통합 QA → 전 feature QA, Release → 통합 QA.

import { featureGrounding, type BlueprintPrd } from "./contract.js";
import {
  workflowKeyPart,
  type ProductBuilderTask,
  type TaskDecision,
} from "../workflow-tasks/index.js";

export type DeliverableTaskPlan = {
  productName: string;
  features: Array<{ id: string; title: string; description?: string }>;
  tasks: ProductBuilderTask[];
};

const UI_SURFACES = ["admin", "site", "app", "landing"] as const;
const SURFACE_LABEL: Record<string, string> = { admin: "관리자", site: "웹서비스", app: "앱", landing: "랜딩" };

function toTaskDecision(value: string | undefined): TaskDecision {
  if (value === "REUSE" || value === "EXTEND" || value === "N/A") return value;
  return "NEW"; // NEW / UNDECIDED / 미지정 → 실행 작업
}

function feTaskSurface(surface: string): "admin" | "app" | "landing" {
  if (surface === "admin") return "admin";
  if (surface === "landing") return "landing";
  return "app"; // site/app → app
}

export function buildDeliverableTaskPlan(prd: BlueprintPrd): DeliverableTaskPlan {
  const grounding = featureGrounding(prd);
  const schemaByCode = new Map(prd.schemas.map((schema) => [schema.code, schema]));
  const apiByCode = new Map(prd.apis.map((api) => [api.code, api]));

  const assignedSchemas = new Set<string>();
  const assignedApis = new Set<string>();
  const tasks: ProductBuilderTask[] = [];
  const features: DeliverableTaskPlan["features"] = [];
  const featureQaKeys: string[] = [];

  for (const fr of prd.functionalRequirements) {
    const fid = workflowKeyPart(fr.code);
    features.push({ id: fr.code, title: fr.title, description: fr.description });
    const g = grounding.get(fr.code) ?? { schemaCodes: [], apiCodes: [], decisions: [] };

    // primary FR에만 배정(중복 방지).
    const mySchemas = g.schemaCodes.filter((code) => !assignedSchemas.has(code));
    mySchemas.forEach((code) => assignedSchemas.add(code));
    const myApis = g.apiCodes.filter((code) => !assignedApis.has(code));
    myApis.forEach((code) => assignedApis.add(code));

    const priority: ProductBuilderTask["priority"] = fr.priority === "must" ? "high" : "medium";
    const beKeysForFeature: string[] = [];
    const schemaTaskKeyByCode = new Map<string, string>();

    // BE: 스키마 task(데이터 모델) 1개씩.
    for (const code of mySchemas) {
      const schema = schemaByCode.get(code);
      const key = `FEAT-${fid}-BE-${code}`;
      schemaTaskKeyByCode.set(code, key);
      beKeysForFeature.push(key);
      tasks.push({
        key,
        phase: fr.title,
        title: `데이터 모델 ${schema?.name ?? code} (${code})`,
        description: schema?.description ?? `${fr.title}의 ${code} 데이터 모델/스키마.`,
        surfaces: ["api"],
        targetPaths: [],
        decision: toTaskDecision(schema?.baseReuseDecision),
        category: "backend",
        priority,
        agentRole: "Backend Engineer",
        deliverables: [],
        acceptanceCriteria: schema?.acceptanceCriteria ?? [],
        workflowRole: "feature-stage",
        featureId: fr.code,
        stageSlug: "be",
        stageOrder: 1,
      });
    }

    // BE: API task — 엔드포인트 1개 = task 1개. 의존: 그 API가 쓰는 스키마 task.
    for (const code of myApis) {
      const api = apiByCode.get(code);
      const key = `FEAT-${fid}-BE-${code}`;
      beKeysForFeature.push(key);
      const dependsOn = (api?.schemas ?? [])
        .map((schemaCode) => schemaTaskKeyByCode.get(schemaCode))
        .filter((k): k is string => Boolean(k));
      tasks.push({
        key,
        phase: fr.title,
        title: `API ${api ? `${api.method} ${api.path}` : code} (${code})`,
        description: api?.summary ?? `${fr.title}의 ${code} API 엔드포인트.`,
        surfaces: ["api"],
        targetPaths: [],
        decision: toTaskDecision(api?.baseReuseDecision),
        category: "backend",
        priority,
        agentRole: "Backend Engineer",
        deliverables: [],
        acceptanceCriteria: api?.acceptanceCriteria ?? [],
        dependsOn,
        workflowRole: "feature-stage",
        featureId: fr.code,
        stageSlug: "be",
        stageOrder: 1,
      });
    }

    // FE: UI surface별 화면 task. BE(이 feature의 API)에 의존.
    const feKeysForFeature: string[] = [];
    const uiSurfaces = (fr.targetSurfaces ?? []).filter((surface): surface is typeof UI_SURFACES[number] =>
      (UI_SURFACES as readonly string[]).includes(surface),
    );
    const beApiKeys = myApis.map((code) => `FEAT-${fid}-BE-${code}`);
    for (const surface of uiSurfaces) {
      const key = `FEAT-${fid}-FE-${surface.toUpperCase()}`;
      feKeysForFeature.push(key);
      tasks.push({
        key,
        phase: fr.title,
        title: `${SURFACE_LABEL[surface] ?? surface} 화면 — ${fr.title}`,
        description: `${fr.title} 기능의 ${SURFACE_LABEL[surface] ?? surface}(${surface}) 화면을 구현한다. 입력/조회/상태/빈·로딩·에러·권한없음 처리 포함.`,
        surfaces: [feTaskSurface(surface)],
        targetPaths: [],
        decision: "NEW",
        category: "frontend",
        priority,
        agentRole: "Frontend Engineer",
        deliverables: [],
        acceptanceCriteria: [],
        dependsOn: beApiKeys,
        workflowRole: "feature-stage",
        featureId: fr.code,
        stageSlug: "fe",
        stageOrder: 3,
      });
    }

    // QA: 기능 검증. feature의 BE+FE 전부에 의존.
    const hasWork = beKeysForFeature.length > 0 || feKeysForFeature.length > 0;
    if (hasWork) {
      const qaKey = `FEAT-${fid}-QA`;
      featureQaKeys.push(qaKey);
      tasks.push({
        key: qaKey,
        phase: fr.title,
        title: `기능 QA — ${fr.title}`,
        description: `${fr.title}의 API·화면·권한·예외 흐름을 선택된 surface에 맞춰 검증한다.`,
        surfaces: ["qa"],
        targetPaths: [],
        decision: "NEW",
        category: "qa",
        priority,
        agentRole: "QA Engineer",
        deliverables: [],
        acceptanceCriteria: [],
        dependsOn: [...beKeysForFeature, ...feKeysForFeature],
        workflowRole: "feature-stage",
        featureId: fr.code,
        stageSlug: "full-qa",
        stageOrder: 5,
      });
    }
  }

  // 제품 통합 QA + Release 게이트(작업이 하나라도 있을 때).
  if (featureQaKeys.length > 0) {
    tasks.push({
      key: "INTEGRATION-QA-001",
      phase: "통합 QA",
      title: "제품 통합 QA",
      description: "전 feature를 합친 cross-feature 통합·회귀 QA. 배포 직전 게이트.",
      surfaces: ["qa"],
      targetPaths: [],
      decision: "NEW",
      category: "qa",
      priority: "high",
      agentRole: "QA Engineer",
      deliverables: ["cross-feature 통합 시나리오", "회귀 테스트", "배포 전 운영 준비 검증"],
      acceptanceCriteria: [],
      dependsOn: [...featureQaKeys],
      workflowRole: "integration-qa",
    });
    tasks.push({
      key: "RELEASE-001",
      phase: "통합 Release",
      title: "main 머지 + release Tag",
      description: "통합 QA 통과 후 제품을 main에 머지하고 release tag를 발행한다.",
      surfaces: ["ops"],
      targetPaths: [],
      decision: "NEW",
      category: "ops",
      priority: "high",
      agentRole: "Release Manager",
      deliverables: ["main 머지", "release tag", "배포 검증 evidence"],
      acceptanceCriteria: [],
      dependsOn: ["INTEGRATION-QA-001"],
      workflowRole: "release",
    });
  }

  return { productName: prd.projectTitle, features, tasks };
}

// feature 단위 + BE/FE/QA 분리로 task 목록 MD를 렌더한다(실제 task 1행씩).
export function renderDeliverableTaskListMarkdown(plan: DeliverableTaskPlan, issueByTaskKey?: Map<string, string>): string {
  const issueRef = (key: string): string => issueByTaskKey?.get(key) ?? "—";
  const decisionKo: Record<string, string> = { NEW: "신규(NEW)", EXTEND: "확장(EXTEND)", REUSE: "재사용(REUSE)", "N/A": "해당없음(N/A)" };
  const lines: string[] = [];
  lines.push(`# 전체 Task 목록(Full Task List) - ${plan.productName}`);
  lines.push("");
  const total = plan.tasks.length;
  const be = plan.tasks.filter((t) => t.stageSlug === "be").length;
  const fe = plan.tasks.filter((t) => t.stageSlug === "fe").length;
  const qa = plan.tasks.filter((t) => t.category === "qa").length;
  lines.push(`총 ${total} task — BE ${be}, FE ${fe}, QA ${qa}, Release ${plan.tasks.filter((t) => t.workflowRole === "release").length}. 기능 단위로 묶이고 BE/FE/QA로 분리됩니다.`);
  lines.push("");

  const renderRows = (tasks: ProductBuilderTask[]): string[] => tasks.map((t) =>
    `| \`${t.key}\` | ${t.title} | ${decisionKo[t.decision] ?? t.decision} | ${t.agentRole} | ${(t.dependsOn ?? []).map((d) => `\`${d}\``).join(", ") || "—"} | ${issueRef(t.key)} |`,
  );
  const header = "| Task Key | 작업(Task) | 판정 | 담당 | 의존(Blockers) | Issue |\n| --- | --- | --- | --- | --- | --- |";

  lines.push("## 기능별 Task(Feature Tasks)");
  for (const feature of plan.features) {
    const featureTasks = plan.tasks.filter((t) => t.featureId === feature.id);
    if (featureTasks.length === 0) continue;
    lines.push("");
    lines.push(`### ${feature.title} (${feature.id})`);
    const beTasks = featureTasks.filter((t) => t.stageSlug === "be");
    const feTasks = featureTasks.filter((t) => t.stageSlug === "fe");
    const qaTasks = featureTasks.filter((t) => t.stageSlug === "full-qa");
    if (beTasks.length) { lines.push("", "#### BE", header, ...renderRows(beTasks)); }
    if (feTasks.length) { lines.push("", "#### FE", header, ...renderRows(feTasks)); }
    if (qaTasks.length) { lines.push("", "#### QA", header, ...renderRows(qaTasks)); }
  }

  const gateTasks = plan.tasks.filter((t) => t.workflowRole === "integration-qa" || t.workflowRole === "release");
  if (gateTasks.length) {
    lines.push("", "## 통합/Release", header, ...renderRows(gateTasks));
  }
  return lines.join("\n");
}
