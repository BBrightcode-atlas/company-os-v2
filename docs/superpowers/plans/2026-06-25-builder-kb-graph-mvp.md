# Builder KB-Graph MVP (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Blueprint에 "그래프" 탭을 추가해, 등록된 자료(sources)를 연결된 지식베이스로 보여주고 산출물(project_documents 참조)까지 derive 링크로 잇는다.

**Architecture:** 그래프는 `CosBlueprintState`의 순수 함수 `buildGraphFromState`로 파생(저장 X). 자료↔자료 연결만 신규 영속(`SourceMaterial.links`, notion intake에서). UI는 React Flow+dagre(wireframe 패턴 복제)로 full-bleed 렌더. 신규 worker 엔드포인트 0.

**Tech Stack:** TypeScript, React 19, `@xyflow/react` 12, `@dagrejs/dagre` 3 (둘 다 이미 deps), vitest, `@paperclipai/plugin-sdk`.

## Global Constraints

- 대상 플러그인 디렉토리: `bbr-plugins/builder`. 빌드 `pnpm --filter paperclip-plugin-builder build`, 테스트 `pnpm --filter paperclip-plugin-builder test`, 타입체크 `pnpm --filter paperclip-plugin-builder typecheck`.
- BBR 전용. 기존 동작·레이아웃 회귀 금지(산출물/등록한 자료 탭 불변).
- **UI 컴포넌트 규칙**: raw HTML 컨트롤 금지. `src/ui/primitives.tsx`의 `Button`, `src/ui/select.tsx`의 `Select*`, `src/ui/dropdown-menu.tsx` 사용. 그래프 전용 위젯(ReactFlow/Background/Controls/MiniMap)만 예외.
- **그래프 노드 id 규칙(고정)**: source 노드 id = `source.id`. deliverable 노드 id = item code(schema/api/screen/FR) 또는 `"deliverable.prd"`. 합성키 금지(Slice 3 생성 소비 호환).
- **무손실**: 자료 본문 verbatim 유지. 그래프는 산출물을 **관리하지 않고 참조만**(클릭 시 산출물 탭으로 이동).
- 신규 패키지 추가 금지. 신규 worker DATA/ACTION 키 추가 금지(MVP는 기존 `DATA.overview` 재사용).
- ESM import 경로는 `.js` 확장자 사용(기존 코드 관례).

---

### Task 1: `buildGraphFromState` 순수 함수 + 그래프 타입 + `SourceMaterial.links` (contract.ts)

**Files:**
- Modify: `bbr-plugins/builder/src/blueprint/contract.ts` (SourceMaterial 타입 463-493 부근, 파일 끝에 그래프 타입+함수 추가)
- Test: `bbr-plugins/builder/tests/graph.spec.ts` (신규)

**Interfaces:**
- Consumes: `CosBlueprintState`(contract.ts:878-888), `SourceMaterial`, `StandardPlan`, `ScreenPlan`, `RequirementInventory`, `OUTPUT_INVENTORY_TARGETS`(같은 파일, 미export 상수).
- Produces:
  - `export type GraphNodeKind = "source" | "deliverable";`
  - `export type GraphNodeFormat = "md"|"text"|"url"|"figma"|"notion"|"csv"|"html";`
  - `export type GraphEdgeType = "links-to"|"child-of"|"derives-from"|"references"|"manual";`
  - `export type GraphNode = { id: string; kind: GraphNodeKind; subtype: string; title: string; format: GraphNodeFormat; bodyRef: { kind:"source"; sourceId:string } | { kind:"slot"; slotKey:string }; managedBy: "graph"|"project_documents"; status: "draft"|"ready"|"approved"; };`
  - `export type GraphEdge = { id: string; from: string; to: string; type: GraphEdgeType; origin: "derived"|"stored"|"manual"; evidence?: string };`
  - `export type BlueprintGraph = { nodes: GraphNode[]; edges: GraphEdge[] };`
  - `export function buildGraphFromState(state: CosBlueprintState): BlueprintGraph`
  - `SourceMaterial.links?: { external?: string[]; figma?: string[]; notionPageIds?: string[]; notionPageUrls?: string[]; children?: string[] }`

- [ ] **Step 1: Write the failing test**

Create `bbr-plugins/builder/tests/graph.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildGraphFromState, emptyState, type CosBlueprintState, type SourceMaterial } from "../src/blueprint/contract.js";

function src(partial: Partial<SourceMaterial> & { id: string }): SourceMaterial {
  return { id: partial.id, title: partial.title ?? partial.id, type: "external-plan", body: "", createdAt: "2026-01-01T00:00:00.000Z", ...partial };
}

describe("buildGraphFromState", () => {
  it("empty state → no nodes/edges", () => {
    const g = buildGraphFromState(emptyState());
    expect(g.nodes).toEqual([]);
    expect(g.edges).toEqual([]);
  });

  it("sources become source nodes with id = source.id", () => {
    const state: CosBlueprintState = { ...emptyState(), sources: [src({ id: "s1", title: "기획서", format: "md" })] };
    const g = buildGraphFromState(state);
    const n = g.nodes.find((x) => x.id === "s1");
    expect(n).toBeTruthy();
    expect(n!.kind).toBe("source");
    expect(n!.managedBy).toBe("graph");
    expect(n!.bodyRef).toEqual({ kind: "source", sourceId: "s1" });
  });

  it("source.links external → links-to edge between two registered sources matched by url", () => {
    const state: CosBlueprintState = {
      ...emptyState(),
      sources: [
        src({ id: "s1", url: "https://a.com", links: { external: ["https://b.com"] } }),
        src({ id: "s2", url: "https://b.com" }),
      ],
    };
    const g = buildGraphFromState(state);
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "s1", to: "s2", type: "links-to", origin: "stored" }));
  });

  it("screen.apis / screen.schemas → references edges; deliverable nodes are project_documents refs", () => {
    const state: CosBlueprintState = {
      ...emptyState(),
      standardPlan: {
        projectTitle: "P", overview: "", goals: [], scope: { inScope: [], outScope: [] },
        functionalRequirements: [], nonFunctionalRequirements: [],
        schemas: [{ code: "SCH-1", name: "User", description: "", fields: [] }],
        apis: [{ code: "API-1", method: "GET", path: "/u", summary: "", input: [], output: [], schemas: ["SCH-1"] }],
        layouts: [], generatedAt: "2026-01-01T00:00:00.000Z", confirmedAt: null,
      } as unknown as CosBlueprintState["standardPlan"],
      screenPlan: {
        screens: [{ code: "SCR-1", name: "로그인", description: "", layoutCode: "L1", layoutSlot: "main", route: "/login", access: "public", primaryTestId: "t", schemas: ["SCH-1"], apis: ["API-1"] }],
        generatedAt: "2026-01-01T00:00:00.000Z", confirmedAt: null,
      } as unknown as CosBlueprintState["screenPlan"],
    };
    const g = buildGraphFromState(state);
    expect(g.nodes.find((n) => n.id === "SCR-1")?.managedBy).toBe("project_documents");
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "SCR-1", to: "API-1", type: "references" }));
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "SCR-1", to: "SCH-1", type: "references" }));
    expect(g.edges).toContainEqual(expect.objectContaining({ from: "API-1", to: "SCH-1", type: "references" }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter paperclip-plugin-builder test -- graph.spec.ts`
Expected: FAIL — `buildGraphFromState is not a function` (export 없음).

- [ ] **Step 3: Add `links` to SourceMaterial**

`bbr-plugins/builder/src/blueprint/contract.ts`, SourceMaterial 타입(약 463-493) 닫는 `}` 직전에 추가:

```ts
  /** 자료↔자료 연결(지식베이스). intake에서 캡처. fingerprint에는 미포함(dedup 안정). */
  links?: {
    external?: string[];
    figma?: string[];
    notionPageIds?: string[];
    notionPageUrls?: string[];
    children?: string[];
  };
```

- [ ] **Step 4: Add graph types + `buildGraphFromState` at end of contract.ts**

`bbr-plugins/builder/src/blueprint/contract.ts` 파일 끝에 추가(같은 파일이라 `OUTPUT_INVENTORY_TARGETS` 직접 접근 가능):

```ts
// ── KB Graph (Slice 1) ──────────────────────────────────────────────
export type GraphNodeKind = "source" | "deliverable";
export type GraphNodeFormat = "md" | "text" | "url" | "figma" | "notion" | "csv" | "html";
export type GraphEdgeType = "links-to" | "child-of" | "derives-from" | "references" | "manual";

export type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  subtype: string;
  title: string;
  format: GraphNodeFormat;
  bodyRef: { kind: "source"; sourceId: string } | { kind: "slot"; slotKey: string };
  managedBy: "graph" | "project_documents";
  status: "draft" | "ready" | "approved";
};
export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  type: GraphEdgeType;
  origin: "derived" | "stored" | "manual";
  evidence?: string;
};
export type BlueprintGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

function sourceNodeFormat(source: SourceMaterial): GraphNodeFormat {
  const f = source.format;
  if (f === "url" || f === "figma" || f === "notion") return f;
  if (f === "md" || f === "txt") return "md";
  return "text";
}

// 같은 자료를 가리키는지: url 동일 또는 notion pageId/url 교집합.
function sourceMatchesLink(target: SourceMaterial, link: string): boolean {
  if (target.url && target.url === link) return true;
  const ids = target.links?.notionPageIds ?? [];
  const urls = target.links?.notionPageUrls ?? [];
  return ids.includes(link) || urls.includes(link);
}

export function buildGraphFromState(state: CosBlueprintState): BlueprintGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const sourceIds = new Set(state.sources.map((s) => s.id));

  // 1) source 노드 (그래프 관리)
  for (const source of state.sources) {
    nodes.push({
      id: source.id,
      kind: "source",
      subtype: source.type,
      title: source.title,
      format: sourceNodeFormat(source),
      bodyRef: { kind: "source", sourceId: source.id },
      managedBy: "graph",
      status: "ready",
    });
  }

  // 2) 자료↔자료 links-to (등록된 다른 source와 매칭만)
  for (const source of state.sources) {
    const links = [...(source.links?.external ?? []), ...(source.links?.figma ?? [])];
    for (const link of links) {
      const target = state.sources.find((t) => t.id !== source.id && sourceMatchesLink(t, link));
      if (target) {
        edges.push({ id: `links:${source.id}:${target.id}`, from: source.id, to: target.id, type: "links-to", origin: "stored" });
      }
    }
  }

  // 3) deliverable 노드 (project_documents 참조, 읽기전용)
  const plan = state.standardPlan;
  const addDeliverable = (id: string, subtype: string, title: string, slotKey: string) => {
    if (!nodes.some((n) => n.id === id)) {
      nodes.push({ id, kind: "deliverable", subtype, title, format: "md", bodyRef: { kind: "slot", slotKey }, managedBy: "project_documents", status: "ready" });
    }
  };
  if (plan) {
    addDeliverable("deliverable.prd", "prd", `PRD - ${plan.projectTitle}`, "deliverable.prd");
    for (const s of plan.schemas) addDeliverable(s.code, "schema", `${s.code} ${s.name}`, "deliverable.schema_definition");
    for (const a of plan.apis) addDeliverable(a.code, "api", `${a.code} ${a.method} ${a.path}`, "deliverable.api_definition");
    for (const fr of plan.functionalRequirements) addDeliverable(fr.code, "feature", `${fr.code} ${fr.title}`, "deliverable.feature_files");
  }
  for (const sc of state.screenPlan?.screens ?? []) {
    addDeliverable(sc.code, "screen", `${sc.code} ${sc.name}`, "deliverable.screen_definitions");
  }

  const hasNode = (id: string) => nodes.some((n) => n.id === id);

  // 4) references: screen→api, screen→schema, api→schema
  for (const sc of state.screenPlan?.screens ?? []) {
    for (const apiCode of sc.apis ?? []) if (hasNode(apiCode)) edges.push({ id: `ref:${sc.code}:${apiCode}`, from: sc.code, to: apiCode, type: "references", origin: "derived" });
    for (const schCode of sc.schemas ?? []) if (hasNode(schCode)) edges.push({ id: `ref:${sc.code}:${schCode}`, from: sc.code, to: schCode, type: "references", origin: "derived" });
  }
  for (const a of plan?.apis ?? []) {
    for (const schCode of a.schemas ?? []) if (hasNode(schCode)) edges.push({ id: `ref:${a.code}:${schCode}`, from: a.code, to: schCode, type: "references", origin: "derived" });
  }

  // 5) derives-from: FR → source (inventory item sourceRefs 경유)
  const inv = state.requirementInventory;
  if (inv && plan) {
    const itemById = new Map(inv.items.map((it) => [it.id, it]));
    for (const fr of plan.functionalRequirements) {
      for (const itemId of fr.sourceInventoryItemIds ?? []) {
        const item = itemById.get(itemId);
        for (const ref of item?.sourceRefs ?? []) {
          if (sourceIds.has(ref.sourceId)) {
            edges.push({ id: `der:${fr.code}:${ref.sourceId}`, from: fr.code, to: ref.sourceId, type: "derives-from", origin: "derived", evidence: ref.evidenceExcerpt });
          }
        }
      }
    }
  }

  return { nodes, edges };
}
```

> NOTE: `depends-on`(OUTPUT_INVENTORY_TARGETS slot-level)은 노드가 per-item이라 매핑이 어색해 MVP에서 제외. `references`가 실제 의존을 이미 인코딩함. (spec §3.4 대비 의도적 deviation.)

> 파이프라인 NOTE: `standardPlan`은 자료 정리본 이후의 **산출물 생성용 분석 모델**이다. deliverable 노드(schema/api/screen/FR)는 standardPlan/screenPlan에서 **존재가 파생**되고 `bodyRef.slotKey`는 project_documents slot을 가리킨다(본문 정본). standardPlan만 있고 `write-standard-plan-docs` 미실행이면 노드는 보이되 슬롯 본문은 빌 수 있다(정상, 클릭 시 산출물 탭으로 이동).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter paperclip-plugin-builder test -- graph.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter paperclip-plugin-builder typecheck`
Expected: 에러 없음.

- [ ] **Step 7: Commit**

```bash
git add bbr-plugins/builder/src/blueprint/contract.ts bbr-plugins/builder/tests/graph.spec.ts
git commit -m "feat(builder): add buildGraphFromState pure derivation + SourceMaterial.links"
```

---

### Task 2: Notion 링크 캡처·영속 (register-source-document)

**Files:**
- Modify: `bbr-plugins/builder/src/blueprint/contract.ts` (`extractIntakeLinks` 추가, KB Graph 섹션)
- Modify: `bbr-plugins/builder/src/blueprint/worker.ts` (notion 분기 ~2278-2287, source 구성/fingerprint ~2372-2388)
- Test: `bbr-plugins/builder/tests/graph.spec.ts` (Task 1 파일에 describe 추가)

**Interfaces:**
- Produces: `export function extractIntakeLinks(metadata: Record<string, unknown> | undefined): SourceMaterial["links"] | undefined` (contract.ts, 순수). register-source-document notion 분기가 호출해 `source.links` 영속.
- Consumes: `fetchNotionSharedPageSource` 반환 `metadata.{externalLinks, figmaLinks, pageIds, pageUrls}`, `SourceMaterial.links`(Task 1). `sourceFingerprint`(worker.ts:647-662)는 `{type,format,fileName,url,body}`만 해시 → links 미포함(dedup 구조적으로 안정, 별도 테스트 불필요).

- [ ] **Step 1: Write the failing test for the pure extractor**

`bbr-plugins/builder/tests/graph.spec.ts`에 describe 블록 추가(Task 1 테스트 파일 재사용). 상단 import에 `extractIntakeLinks` 추가:

```ts
import { buildGraphFromState, emptyState, extractIntakeLinks, type CosBlueprintState, type SourceMaterial } from "../src/blueprint/contract.js";
```

파일 끝에 추가:

```ts
describe("extractIntakeLinks", () => {
  it("maps notion metadata link arrays to SourceMaterial.links", () => {
    const links = extractIntakeLinks({
      externalLinks: ["https://b.com"],
      figmaLinks: ["https://figma.com/x"],
      pageIds: ["pid-1"],
      pageUrls: ["https://n.so/p"],
      pageCount: 3, // non-link noise ignored
    });
    expect(links).toEqual({
      external: ["https://b.com"],
      figma: ["https://figma.com/x"],
      notionPageIds: ["pid-1"],
      notionPageUrls: ["https://n.so/p"],
    });
  });

  it("returns undefined when no link arrays present", () => {
    expect(extractIntakeLinks({ pageCount: 1 })).toBeUndefined();
    expect(extractIntakeLinks(undefined)).toBeUndefined();
    expect(extractIntakeLinks({ externalLinks: [] })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter paperclip-plugin-builder test -- graph.spec.ts`
Expected: FAIL — `extractIntakeLinks is not a function`.

- [ ] **Step 3: Implement `extractIntakeLinks` in contract.ts**

`bbr-plugins/builder/src/blueprint/contract.ts`, `buildGraphFromState` 위(같은 KB Graph 섹션)에 추가:

```ts
export function extractIntakeLinks(metadata: Record<string, unknown> | undefined): SourceMaterial["links"] | undefined {
  if (!metadata) return undefined;
  const arr = (key: string): string[] => (Array.isArray(metadata[key]) ? (metadata[key] as unknown[]).filter((v): v is string => typeof v === "string") : []);
  const external = arr("externalLinks");
  const figma = arr("figmaLinks");
  const notionPageIds = arr("pageIds");
  const notionPageUrls = arr("pageUrls");
  if (!external.length && !figma.length && !notionPageIds.length && !notionPageUrls.length) return undefined;
  return { external, figma, notionPageIds, notionPageUrls };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter paperclip-plugin-builder test -- graph.spec.ts`
Expected: PASS (Task 1 4개 + extractIntakeLinks 2개).

- [ ] **Step 5: Wire into the register notion branch**

`bbr-plugins/builder/src/blueprint/worker.ts`:
1. notion 등 fetch 변수 선언부(약 2271)에 추가: `let intakeLinks: SourceMaterial["links"] | undefined;`
2. notion 분기에서 `const notion = await fetchNotionSharedPageSource(url);` 직후 추가: `intakeLinks = extractIntakeLinks(notion.metadata);`
3. `source.fingerprint = fingerprint;`(약 2388) 직후, `withStateLock` 전에 추가: `if (intakeLinks) source.links = intakeLinks;`
4. `worker.ts` 상단 contract import에 `extractIntakeLinks` 추가(없으면).

```ts
// (2271 부근)
    let intakeLinks: SourceMaterial["links"] | undefined;
// (notion 분기, fetchNotionSharedPageSource 직후)
      intakeLinks = extractIntakeLinks(notion.metadata);
// (2388, source.fingerprint = fingerprint; 직후)
    if (intakeLinks) source.links = intakeLinks;
```

- [ ] **Step 6: Typecheck + build**

Run: `pnpm --filter paperclip-plugin-builder typecheck`
Expected: 에러 없음.
Run: `pnpm --filter paperclip-plugin-builder build`
Expected: 빌드 성공.

> 실 notion 등록 → 링크 영속·엣지 출현은 Task 5 브라우저 검증에서 확인(네트워크 의존이라 단위 테스트는 순수 추출기 `extractIntakeLinks`까지).

- [ ] **Step 7: Commit**

```bash
git add bbr-plugins/builder/src/blueprint/contract.ts bbr-plugins/builder/src/blueprint/worker.ts bbr-plugins/builder/tests/graph.spec.ts
git commit -m "feat(builder): persist notion external/figma links onto SourceMaterial.links"
```

---

### Task 3: `BlueprintGraphView` RF 컴포넌트 + 순수 매핑

**Files:**
- Create: `bbr-plugins/builder/src/blueprint/ui/BlueprintGraphView.tsx`
- Create: `bbr-plugins/builder/src/blueprint/ui/graph-rf.ts` (순수 매핑 + dagre 레이아웃, 테스트 대상)
- Test: `bbr-plugins/builder/tests/graph-rf.spec.ts` (신규)

**Interfaces:**
- Consumes: `BlueprintGraph`, `GraphNode`, `GraphEdge`(Task 1). `@xyflow/react`, `@dagrejs/dagre`.
- Produces:
  - `graph-rf.ts`: `export function toRfElements(graph: BlueprintGraph): { rfNodes: RFNode[]; rfEdges: RFEdge[] }` (dagre LR 위치 포함), `export function ensureBlueprintRfStyles(): void`.
  - `BlueprintGraphView.tsx`: `export function BlueprintGraphView(props: { graph: BlueprintGraph; onSourceClick: (sourceId: string) => void; onDeliverableClick: (slotKey: string) => void }): JSX.Element`.

- [ ] **Step 1: Write the failing test for the pure mapping**

Create `bbr-plugins/builder/tests/graph-rf.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toRfElements } from "../src/blueprint/ui/graph-rf.js";
import type { BlueprintGraph } from "../src/blueprint/contract.js";

const graph: BlueprintGraph = {
  nodes: [
    { id: "s1", kind: "source", subtype: "external-plan", title: "기획서", format: "md", bodyRef: { kind: "source", sourceId: "s1" }, managedBy: "graph", status: "ready" },
    { id: "SCR-1", kind: "deliverable", subtype: "screen", title: "로그인", format: "md", bodyRef: { kind: "slot", slotKey: "deliverable.screen_definitions" }, managedBy: "project_documents", status: "ready" },
  ],
  edges: [{ id: "e1", from: "SCR-1", to: "s1", type: "derives-from", origin: "derived" }],
};

describe("toRfElements", () => {
  it("maps nodes/edges and assigns numeric positions via dagre", () => {
    const { rfNodes, rfEdges } = toRfElements(graph);
    expect(rfNodes).toHaveLength(2);
    const n = rfNodes.find((x) => x.id === "s1")!;
    expect(typeof n.position.x).toBe("number");
    expect(typeof n.position.y).toBe("number");
    expect(n.type).toBe("blueprint");
    expect(n.data.kind).toBe("source");
    expect(rfEdges).toHaveLength(1);
    expect(rfEdges[0]).toMatchObject({ source: "SCR-1", target: "s1" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter paperclip-plugin-builder test -- graph-rf.spec.ts`
Expected: FAIL — `Cannot find module .../graph-rf.js`.

- [ ] **Step 3: Implement `graph-rf.ts`**

Create `bbr-plugins/builder/src/blueprint/ui/graph-rf.ts`:

```ts
import dagre from "@dagrejs/dagre";
import { MarkerType, type Edge as RFEdge, type Node as RFNode } from "@xyflow/react";
import type { BlueprintGraph, GraphEdgeType, GraphNodeKind } from "../contract.js";

export type BlueprintNodeData = { label: string; kind: GraphNodeKind; subtype: string };
const NODE_W = 220;
const NODE_H = 56;

const EDGE_COLOR: Record<GraphEdgeType, string> = {
  "links-to": "#64748b",
  "child-of": "#64748b",
  "derives-from": "#2563eb",
  references: "#0d9488",
  manual: "#a855f7",
};

export function toRfElements(graph: BlueprintGraph): { rfNodes: RFNode<BlueprintNodeData>[]; rfEdges: RFEdge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 24, ranksep: 80, marginx: 16, marginy: 16 });
  for (const n of graph.nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of graph.edges) if (graph.nodes.some((n) => n.id === e.from) && graph.nodes.some((n) => n.id === e.to)) g.setEdge(e.from, e.to);
  dagre.layout(g);

  const rfNodes: RFNode<BlueprintNodeData>[] = graph.nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: "blueprint",
      position: { x: (pos?.x ?? 0) - NODE_W / 2, y: (pos?.y ?? 0) - NODE_H / 2 },
      data: { label: n.title, kind: n.kind, subtype: n.subtype },
    };
  });
  const rfEdges: RFEdge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    style: { stroke: EDGE_COLOR[e.type] },
    markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLOR[e.type] },
  }));
  return { rfNodes, rfEdges };
}

let stylesInjected = false;
export function ensureBlueprintRfStyles(): void {
  if (stylesInjected || typeof document === "undefined") return;
  if (document.querySelector("style[data-rf-styles]")) { stylesInjected = true; return; }
  // @ts-expect-error esbuild .css → text loader
  import("@xyflow/react/dist/style.css").then((mod) => {
    const css = (mod as { default?: string }).default;
    if (!css) return;
    const tag = document.createElement("style");
    tag.setAttribute("data-rf-styles", "true");
    tag.textContent = css;
    document.head.appendChild(tag);
    stylesInjected = true;
  });
}
```

> NOTE: CSS 주입은 wireframe `ensureReactFlowStyles`와 충돌 방지 위해 **공유 DOM attr `data-rf-styles`** 가드. wireframe 쪽 가드 키와 동일 attr를 쓰면 이중주입 방지(있으면 skip).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter paperclip-plugin-builder test -- graph-rf.spec.ts`
Expected: PASS.

- [ ] **Step 5: Implement `BlueprintGraphView.tsx`**

Create `bbr-plugins/builder/src/blueprint/ui/BlueprintGraphView.tsx`:

```tsx
import { useEffect, useMemo } from "react";
import {
  Background, Controls, MiniMap, ReactFlow, ConnectionLineType,
  useEdgesState, useNodesState, type NodeProps, type Node,
} from "@xyflow/react";
import type { BlueprintGraph } from "../contract.js";
import { ensureBlueprintRfStyles, toRfElements, type BlueprintNodeData } from "./graph-rf.js";

function BlueprintNode({ data }: NodeProps<Node<BlueprintNodeData>>) {
  const isSource = data.kind === "source";
  return (
    <div
      style={{
        width: 220, minHeight: 56, borderRadius: 8, padding: "8px 12px",
        border: `1px solid ${isSource ? "#cbd5e1" : "#99f6e4"}`,
        background: isSource ? "#f8fafc" : "#f0fdfa", fontSize: 12,
      }}
      data-testid={`graph-node-${data.kind}`}
    >
      <div style={{ fontSize: 10, color: "#64748b" }}>{isSource ? "자료" : "산출물"} · {data.subtype}</div>
      <div style={{ fontWeight: 600, marginTop: 2 }}>{data.label}</div>
    </div>
  );
}

const nodeTypes = { blueprint: BlueprintNode };

export function BlueprintGraphView(props: {
  graph: BlueprintGraph;
  onSourceClick: (sourceId: string) => void;
  onDeliverableClick: (slotKey: string) => void;
}) {
  useEffect(() => { ensureBlueprintRfStyles(); }, []);
  const { rfNodes, rfEdges } = useMemo(() => toRfElements(props.graph), [props.graph]);
  const [nodes, , onNodesChange] = useNodesState(rfNodes);
  const [edges, , onEdgesChange] = useEdgesState(rfEdges);

  const byId = useMemo(() => new Map(props.graph.nodes.map((n) => [n.id, n])), [props.graph]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable
        onNodeClick={(_, node) => {
          const meta = byId.get(node.id);
          if (!meta) return;
          if (meta.bodyRef.kind === "source") props.onSourceClick(meta.bodyRef.sourceId);
          else props.onDeliverableClick(meta.bodyRef.slotKey);
        }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable position="top-right" />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter paperclip-plugin-builder typecheck`
Expected: 에러 없음.

- [ ] **Step 7: Commit**

```bash
git add bbr-plugins/builder/src/blueprint/ui/BlueprintGraphView.tsx bbr-plugins/builder/src/blueprint/ui/graph-rf.ts bbr-plugins/builder/tests/graph-rf.spec.ts
git commit -m "feat(builder): BlueprintGraphView RF component + dagre mapping"
```

---

### Task 4: Blueprint UI에 "그래프" 탭 통합

**Files:**
- Modify: `bbr-plugins/builder/src/blueprint/ui/index.tsx` (WorkspaceTab 100, pill 1116-1148, badge 1134, content grid 1150-1244)

**Interfaces:**
- Consumes: `buildGraphFromState`(Task 1), `BlueprintGraphView`(Task 3), 기존 `overview.state`(usePluginData(DATA.overview) 381-384), 상태 setter `setActiveTab`/`setSelectedDeliverableKey`/`setSelectedSourceKey`(405-407).
- Produces: 동작하는 그래프 탭(브라우저 검증).

- [ ] **Step 1: Extend WorkspaceTab type**

`index.tsx:100`:

```tsx
type WorkspaceTab = "deliverables" | "sources" | "graph";
```

- [ ] **Step 2: Add the "그래프" pill Button**

`index.tsx` pill wrapper(약 1116-1148) 안, 기존 두 Button 뒤에 추가(기존 Button의 className/variant 패턴을 그대로 따른다 — 아래는 기존 "등록한 자료" 버튼과 동일 형태):

```tsx
              <Button
                type="button"
                variant={activeTab === "graph" ? "secondary" : "ghost"}
                className={cn("h-8 px-3", activeTab === "graph" && "bg-background shadow-sm")}
                onClick={() => setActiveTab("graph")}
              >
                그래프
              </Button>
```

- [ ] **Step 3: Fix badge count for graph tab**

`index.tsx:422` 부근 `activeRowsCount` 정의(기존: `activeTab === "deliverables" ? deliverableRows.length : sourceItems.length`)를 교체:

```tsx
  const graphNodeCount = useMemo(() => (overview?.state ? buildGraphFromState(overview.state).nodes.length : 0), [overview?.state]);
  const activeRowsCount =
    activeTab === "deliverables" ? deliverableRows.length :
    activeTab === "graph" ? graphNodeCount :
    sourceItems.length;
```

상단 import에 추가: `buildGraphFromState`를 기존 `../contract.js` import 구문에 합치고, `useMemo`가 이미 import되어 있지 않으면 react import에 추가.

- [ ] **Step 4: Render graph full-bleed when active**

`index.tsx` content grid(약 1150) — 기존 `<div className="grid min-h-0 flex-1 overflow-hidden" style={{ gridTemplateColumns: "320px minmax(0, 1fr)" }}>...</div>` 전체를 조건 분기로 감싼다:

```tsx
        {activeTab === "graph" ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            {overview?.state ? (
              <BlueprintGraphView
                graph={buildGraphFromState(overview.state)}
                onSourceClick={(sourceId) => { setActiveTab("sources"); setSelectedSourceKey(sourceId); }}
                onDeliverableClick={(slotKey) => { setActiveTab("deliverables"); setSelectedDeliverableKey(slotKey); }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">프로젝트를 선택하세요.</div>
            )}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 overflow-hidden" style={{ gridTemplateColumns: "320px minmax(0, 1fr)" }}>
            {/* ...기존 nav + content section 그대로... */}
          </div>
        )}
```

> 주의: 기존 grid 내부(nav 1154-1204 + section 1206-1243)는 `else` 분기에 **그대로** 옮긴다. 코드 삭제 금지 — 래핑만.
> 주의: `onSourceClick`이 `setSelectedSourceKey(sourceId)`를 호출 — source 노드의 selection 키는 `source.id`이고 sources 탭의 `selectedSourceKey`도 source.id 기반이어야 한다. 만약 sources 탭이 다른 키를 쓰면(예: slot doc id) 그 매핑을 확인해 맞춘다(아래 Step 6 브라우저 검증에서 확인).

- [ ] **Step 5: Add imports**

`index.tsx` 상단 import에 추가:

```tsx
import { BlueprintGraphView } from "./BlueprintGraphView.js";
```
그리고 `../contract.js` import 목록에 `buildGraphFromState` 추가.

- [ ] **Step 6: Build + typecheck**

Run: `pnpm --filter paperclip-plugin-builder build`
Expected: 빌드 성공.
Run: `pnpm --filter paperclip-plugin-builder typecheck`
Expected: 에러 없음.

- [ ] **Step 7: Commit**

```bash
git add bbr-plugins/builder/src/blueprint/ui/index.tsx
git commit -m "feat(builder): add 그래프 tab to Blueprint with full-bleed KB graph"
```

---

### Task 5: 헤드 브라우저 통합 검증 (메모리 규칙: API 200 ≠ UI 동작)

**Files:** (없음 — 검증 + 발견 시 수정 커밋)

**Interfaces:** 전체 MVP end-to-end.

- [ ] **Step 1: 서버 기동**

dev server 기동 후 BBR 회사 Blueprint 페이지 접속. (`/browse` skill 사용; `mcp__claude-in-chrome__*` 금지.)

- [ ] **Step 2: 그래프 탭 렌더 확인**

`[산출물 | 등록한 자료 | 그래프]` 3탭 보이는지, "그래프" 클릭 시 콘텐츠 영역 full-bleed로 RF 그래프(자료 노드 + 산출물 참조 노드 + 화살표) 렌더, MiniMap/Controls 표시 확인. 스크린샷.

- [ ] **Step 3: source 노드 클릭 → sources 탭 + 선택**

자료 노드 클릭 → "등록한 자료" 탭으로 전환 + 해당 자료 본문(md) 표시되는지. (selection 키 불일치 발견 시 Step 4에서 수정.)

- [ ] **Step 4: deliverable 노드 클릭 → 산출물 탭 + 선택**

산출물 참조 노드(예: SCR-1) 클릭 → "산출물" 탭 전환 + 해당 산출물 표시. (slotKey 선택 키 불일치 시 `setSelectedDeliverableKey`에 넘기는 값이 `deliverableRows[].slotKey`와 일치하는지 확인·수정.)

- [ ] **Step 5: notion 자료 등록 → links-to 엣지 출현**

notion 공유페이지(외부/figma 링크 포함) 1건 등록 → 그래프 재진입 시 자료↔자료 `links-to` 엣지(회색)가 등록된 다른 자료와 매칭되어 보이는지. (매칭 자료가 없으면 엣지 없음이 정상.)

- [ ] **Step 6: 회귀 확인**

"산출물"/"등록한 자료" 탭 기존 동작·레이아웃 불변, PM 채팅 정상(그래프 탭에서 채팅 시 백엔드 "unknown" 컨텍스트로 graceful) 확인.

- [ ] **Step 7: 발견된 수정 커밋 (있으면)**

```bash
git add -A
git commit -m "fix(builder): KB graph tab integration fixes from browser QA"
```

---

## Self-Review 결과 (작성자 점검)

- **Spec 커버리지**: §3.2 노드(Task1), §3.3/3.4 엣지(Task1), §3.5 자료링크 영속(Task2), §3.7 UI 탭+full-bleed+wrapper(Task4), §8.4 buildGraphFromState in contract.ts(Task1), §8.5 크로스탭(Task4), §8.6 RF copy-pattern(Task3), §8.7 노드 id=source.id 고정(Task1 규칙). depends-on은 의도적 제외(per-item 노드, Task1 NOTE). 다형 csv/html·선택생성·wiki는 후속 슬라이스(MVP 제외, spec §4 일치).
- **Placeholder 스캔**: 없음(모든 step에 실제 코드/명령).
- **타입 일관성**: `buildGraphFromState`/`BlueprintGraph`/`toRfElements`/`BlueprintGraphView` 시그니처 Task1↔3↔4 일치. `SourceMaterial.links` 필드 Task1 정의 = Task2 사용.
- **알려진 검증 의존**: notion 영속(Task2)·노드 클릭 selection 키 일치(Task4)는 브라우저(Task5)에서 최종 확인.
