import { useMemo, useState } from "react";
import {
  useHostContext,
  useHostNavigation,
  usePluginAction,
  usePluginData,
  usePluginToast,
  type PluginPageProps,
  type PluginSidebarProps,
} from "@paperclipai/plugin-sdk/ui";
import {
  ACTION,
  ALLOWED_COMPANY_PREFIX,
  DATA,
  PAGE_ROUTE,
  SOURCE_TYPES,
  isAllowedCompany,
  type BlueprintAnalysis,
  type CosBlueprintOverview,
  type ProjectDocumentUpdateResult,
  type SourceMaterial,
  type SourceType,
} from "../contract.js";

const sidebarItemBase =
  "flex items-center gap-2.5 px-3 py-2 pointer-coarse:py-1.5 text-[13px] font-medium transition-colors";
const pageClass = "grid gap-4 p-5 text-foreground";
const pageStateClass = "p-5 text-sm text-muted-foreground";
const panelClass = "rounded-md border border-border bg-card p-4 text-card-foreground shadow-sm";
const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";
const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";
const textareaClass = `${inputClass} min-h-32 resize-y`;
const mutedClass = "text-xs leading-5 text-muted-foreground";
const rowClass = "flex flex-wrap items-center gap-2";
const primaryButtonClass =
  "inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50";
const badgeClass = "inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground";

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR");
  } catch {
    return value;
  }
}

function sourceTypeLabel(value: SourceType): string {
  switch (value) {
    case "internal-plan":
      return "내부 기획";
    case "external-plan":
      return "외부 기획";
    case "meeting-note":
      return "회의록";
    case "reference":
      return "참고자료";
    case "other":
      return "기타";
  }
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-3 py-2">
      <div className={mutedClass}>{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function SourceList({ sources }: { sources: SourceMaterial[] }) {
  if (sources.length === 0) return <div className={mutedClass}>등록된 기획 자료가 없습니다.</div>;
  return (
    <div className="grid gap-2">
      {sources.map((source) => (
        <div key={source.id} className="rounded-md border border-border bg-background/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 truncate text-sm font-medium">{source.title}</div>
            <span className={badgeClass}>{sourceTypeLabel(source.type)}</span>
          </div>
          <div className={mutedClass}>{formatDate(source.createdAt)}</div>
          <div className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{source.body}</div>
        </div>
      ))}
    </div>
  );
}

function AnalysisSummary({ analysis }: { analysis: BlueprintAnalysis | null }) {
  if (!analysis) {
    return <div className={mutedClass}>분석을 실행하면 표준 기획서, 인터페이스, 레이아웃, 화면정의서 목차가 표시됩니다.</div>;
  }

  return (
    <div className="grid gap-3">
      <div>
        <h3 className="text-sm font-semibold">{analysis.projectTitle}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{analysis.summary}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Schema" value={analysis.schemas.length} />
        <Stat label="API" value={analysis.apis.length} />
        <Stat label="Layout" value={analysis.layouts.length} />
        <Stat label="Screen" value={analysis.screens.length} />
      </div>
      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">화면코드</th>
              <th className="px-3 py-2 font-medium">화면명</th>
              <th className="px-3 py-2 font-medium">Layout</th>
              <th className="px-3 py-2 font-medium">test-id</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {analysis.screens.map((screen) => (
              <tr key={screen.code} className="border-t border-border">
                <td className="px-3 py-2 font-mono">{screen.code}</td>
                <td className="px-3 py-2">{screen.name}</td>
                <td className="px-3 py-2 font-mono">{screen.layoutCode}</td>
                <td className="px-3 py-2 font-mono">{screen.primaryTestId}</td>
                <td className="px-3 py-2">{screen.actions.map((action) => action.code).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CosBlueprintPage({ context }: PluginPageProps) {
  const host = useHostContext();
  const toast = usePluginToast();
  const companyId = context?.companyId ?? host.companyId ?? "";
  const projectId = context?.projectId ?? host.projectId ?? "";
  const { data: overview, loading, error, refresh } = usePluginData<CosBlueprintOverview>(
    DATA.overview,
    companyId ? { companyId } : undefined,
  );
  const saveSource = usePluginAction(ACTION.saveSource);
  const runAnalysis = usePluginAction(ACTION.runAnalysis);
  const updateDocs = usePluginAction(ACTION.updateProjectDocuments);
  const reset = usePluginAction(ACTION.reset);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<SourceType>("internal-plan");
  const [body, setBody] = useState("");
  const [analysisTitle, setAnalysisTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const state = overview?.state;
  const canAnalyze = Boolean(companyId && state?.sources.length);
  const canUpdateDocs = Boolean(companyId && state?.analysis);
  const sourceCount = state?.sources.length ?? 0;
  const stepLabel = useMemo(() => {
    if (!sourceCount) return "1. 기획 자료 등록";
    if (!state?.analysis) return "2. LLM 분석";
    return "6. 프로젝트 문서 업데이트";
  }, [sourceCount, state?.analysis]);

  async function handleSaveSource() {
    if (!companyId) return;
    setBusy("save");
    try {
      await saveSource({ companyId, title, type, body });
      setTitle("");
      setBody("");
      await refresh();
      toast({ tone: "success", title: "기획 자료를 저장했습니다." });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "자료 저장 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleRunAnalysis() {
    if (!companyId) return;
    setBusy("analysis");
    try {
      const result = await runAnalysis({ companyId, title: analysisTitle }) as BlueprintAnalysis;
      await refresh();
      toast({ tone: "success", title: `화면 ${result.screens.length}개 정의를 생성했습니다.` });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "분석 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleUpdateDocs() {
    if (!companyId) return;
    setBusy("docs");
    try {
      const result = await updateDocs({ companyId, projectId }) as ProjectDocumentUpdateResult;
      await refresh();
      toast({ tone: result.ok ? "success" : "warn", title: result.message });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "문서 업데이트 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    if (!companyId) return;
    setBusy("reset");
    try {
      await reset({ companyId });
      await refresh();
      toast({ tone: "success", title: "COS Blueprint 상태를 초기화했습니다." });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "초기화 실패" });
    } finally {
      setBusy(null);
    }
  }

  if (!companyId) return <div className={pageStateClass}>회사 컨텍스트가 필요합니다.</div>;
  if (!isAllowedCompany(companyId, context?.companyPrefix ?? host.companyPrefix)) {
    return <div className={pageStateClass}>COS Blueprint는 {ALLOWED_COMPANY_PREFIX} 회사 전용입니다.</div>;
  }
  if (loading) return <div className={pageStateClass}>COS Blueprint 로딩중...</div>;
  if (error) return <div className={cn(pageStateClass, "text-destructive")}>COS Blueprint 오류: {error.message}</div>;

  return (
    <div className={pageClass} data-testid="cos-blueprint-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">COS Blueprint</h1>
          <div className={mutedClass}>기획 자료에서 스키마, API, 표준 기획서, 레이아웃, 화면정의서를 생성합니다.</div>
        </div>
        <div className={rowClass}>
          <span className={badgeClass}>{stepLabel}</span>
          <button className={secondaryButtonClass} disabled={busy !== null} onClick={() => void handleReset()}>
            초기화
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <section className={panelClass}>
          <div className="mb-3">
            <h2 className="text-sm font-semibold">1. 기획 자료 등록</h2>
            <p className={mutedClass}>내부 기획, 외부 기획, 회의록, 참고자료를 소스로 저장합니다.</p>
          </div>
          <div className="grid gap-3">
            <label>
              <span className={labelClass}>자료 제목</span>
              <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              <span className={labelClass}>자료 유형</span>
              <select className={inputClass} value={type} onChange={(event) => setType(event.target.value as SourceType)}>
                {SOURCE_TYPES.map((entry) => (
                  <option key={entry} value={entry}>{sourceTypeLabel(entry)}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>자료 본문</span>
              <textarea className={textareaClass} value={body} onChange={(event) => setBody(event.target.value)} />
            </label>
            <button className={primaryButtonClass} disabled={busy !== null || !title.trim() || !body.trim()} onClick={() => void handleSaveSource()}>
              {busy === "save" ? "저장중..." : "자료 저장"}
            </button>
          </div>
        </section>

        <section className={panelClass}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">2-5. 분석 및 산출물</h2>
              <p className={mutedClass}>LLM 분석 후 DB/API 목차, 표준 기획서, 화면 기획서 구조를 검토합니다.</p>
            </div>
            <div className={rowClass}>
              <input
                className={cn(inputClass, "h-8 w-56")}
                placeholder="프로젝트명 선택 입력"
                value={analysisTitle}
                onChange={(event) => setAnalysisTitle(event.target.value)}
              />
              <button className={primaryButtonClass} disabled={busy !== null || !canAnalyze} onClick={() => void handleRunAnalysis()}>
                {busy === "analysis" ? "분석중..." : "LLM 분석"}
              </button>
              <button className={secondaryButtonClass} disabled={busy !== null || !canUpdateDocs} onClick={() => void handleUpdateDocs()}>
                {busy === "docs" ? "업데이트중..." : "프로젝트 문서 업데이트"}
              </button>
            </div>
          </div>
          <AnalysisSummary analysis={state?.analysis ?? null} />
        </section>
      </div>

      <section className={panelClass}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">등록 자료</h2>
          <span className={badgeClass}>{sourceCount}개</span>
        </div>
        <SourceList sources={state?.sources ?? []} />
      </section>
    </div>
  );
}

export function CosBlueprintSidebarItem({ context }: PluginSidebarProps) {
  const nav = useHostNavigation();
  const companyPrefix = context?.companyPrefix;
  const href = companyPrefix ? `/${companyPrefix}/${PAGE_ROUTE}` : `/${PAGE_ROUTE}`;
  if (!isAllowedCompany(context?.companyId, companyPrefix)) return null;

  return (
    <a
      {...nav.linkProps(href)}
      className={cn(
        sidebarItemBase,
        "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
      )}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-current text-[10px] font-semibold">C</span>
      <span>COS Blueprint</span>
    </a>
  );
}
