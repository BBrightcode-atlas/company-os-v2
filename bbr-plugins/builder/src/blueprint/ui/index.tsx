import { useEffect, useMemo, useRef, useState } from "react";
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
  DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID,
  PAGE_ROUTE,
  PRODUCT_BUILDER_BLUEPRINT_OPTIONS,
  SCREEN_ACCESS_LABEL,
  SOURCE_TYPES,
  buildWikiPages,
  isAllowedCompany,
  renderScreenDefinition,
  wikiSpaceForProject,
  type CosBlueprintOverview,
  type ProjectDocumentSlotsView,
  type ProjectDocumentSlotViewerRow,
  type ProjectDocumentUpdateResult,
  type ProjectSummary,
  type ProductBuilderBlueprintId,
  type ScreenDefinition,
  type ScreenPlan,
  type ScreenReview,
  type SourceDocumentRegisterResult,
  type SourceMaterial,
  type SourceOriginalDownload,
  type SourceType,
  type StandardPlan,
} from "../contract.js";
import { Markdown } from "./Markdown.js";
import { FILE_ACCEPT, parseFile, type ParsedFile } from "./parse.js";
import { registerPagesToWiki } from "./wiki.js";
import { Button, Card, Input, Label, Select, Textarea, cn } from "../../ui/primitives.js";

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

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ko-KR");
  } catch {
    return value;
  }
}

function formatOptionalDate(value: string | null | undefined): string {
  return value ? formatDate(value) : "-";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// base64 → Blob 다운로드 트리거(브라우저).
function triggerDownload(fileName: string, contentType: string, base64: string): void {
  const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  const blob = new Blob([bytes], { type: contentType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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

function productBuilderBlueprintLabel(value: ProductBuilderBlueprintId): string {
  return PRODUCT_BUILDER_BLUEPRINT_OPTIONS.find((option) => option.id === value)?.label
    ?? PRODUCT_BUILDER_BLUEPRINT_OPTIONS[0]?.label
    ?? value;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-3 py-2">
      <div className={mutedClass}>{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function SourceList({ sources, onDownload, downloadingId }: {
  sources: SourceMaterial[];
  onDownload?: (source: SourceMaterial) => void;
  downloadingId?: string | null;
}) {
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
          {source.url ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={badgeClass}>URL</span>
              <a className="truncate text-xs text-primary underline-offset-4 hover:underline" href={source.url} target="_blank" rel="noreferrer">
                {source.url}
              </a>
              {source.fetchStatus ? <span className={badgeClass}>{source.fetchStatus}</span> : null}
            </div>
          ) : null}
          <div className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{source.body}</div>
          {source.originalPath ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={badgeClass}>원본 {source.originalSize ? formatBytes(source.originalSize) : ""}</span>
              <Button
                className={secondaryButtonClass}
                data-testid="cos-blueprint-download-original"
                disabled={!onDownload || downloadingId === source.id}
                onClick={() => onDownload?.(source)}
              >
                {downloadingId === source.id ? "다운로드중..." : "원본 다운로드"}
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

const slotGroupLabel: Record<ProjectDocumentSlotViewerRow["slotGroup"], string> = {
  source: "원천 자료(Source)",
  support: "고정 기준(Support)",
  deliverable: "산출물(Deliverable)",
};
const slotStatusLabel: Record<ProjectDocumentSlotViewerRow["status"], string> = {
  empty: "비어 있음",
  draft: "초안",
  ready: "준비됨",
  approved: "승인됨",
  "n/a": "해당 없음",
};
const slotStatusClass: Record<ProjectDocumentSlotViewerRow["status"], string> = {
  empty: "border-border bg-muted text-muted-foreground",
  draft: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  ready: "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300",
  approved: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "n/a": "border-border bg-background text-muted-foreground",
};

function ProjectDocumentSlotsPanel({ view, loading, error, onRefresh, projectName }: {
  view: ProjectDocumentSlotsView | null;
  loading: boolean;
  error: { message: string } | null;
  onRefresh: () => void;
  projectName: string | null;
}) {
  const slots = view?.slots ?? [];
  const groups: ProjectDocumentSlotViewerRow["slotGroup"][] = ["source", "support", "deliverable"];

  return (
    <Card className={panelClass} data-testid="cos-blueprint-project-document-slots">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Project 문서 슬롯(Project Document Slots)</h2>
          <p className={mutedClass}>
            {projectName ? `대상 프로젝트: ${projectName}` : "대상 프로젝트가 선택되지 않았습니다."}
            {view?.checkedAt ? ` · 확인 ${formatDate(view.checkedAt)}` : ""}
          </p>
        </div>
        <Button className={secondaryButtonClass} disabled={loading} onClick={onRefresh}>
          {loading ? "확인중..." : "새로고침"}
        </Button>
      </div>

      {error ? (
        <div className={cn(mutedClass, "text-destructive")}>Project document slot 오류: {error.message}</div>
      ) : null}
      {!error && loading && slots.length === 0 ? <div className={mutedClass}>Project document slot 확인중...</div> : null}
      {!error && !loading && slots.length === 0 ? (
        <div className={mutedClass}>대상 프로젝트를 선택하면 slot 목록을 표시합니다.</div>
      ) : null}

      {groups.map((group) => {
        const groupSlots = slots.filter((slot) => slot.slotGroup === group);
        if (groupSlots.length === 0) return null;
        return (
          <div key={group} className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground">{slotGroupLabel[group]}</h3>
              <span className={badgeClass}>{groupSlots.length}</span>
            </div>
            <div className="overflow-hidden rounded-md border border-border">
              {groupSlots.map((slot) => {
                const body = slot.document?.body ?? "";
                const bodyPreview = body.length > 20000 ? `${body.slice(0, 20000)}\n\n... (본문 일부만 표시)` : body;
                return (
                  <details key={slot.slotKey} className="border-t border-border first:border-t-0">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2 hover:bg-accent/40">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{slot.title}</div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">{slot.slotKey}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(badgeClass, slotStatusClass[slot.status])}>{slotStatusLabel[slot.status]}</span>
                        <span className={badgeClass}>{slot.required ? "필수" : "선택"}</span>
                        <span className={badgeClass}>{slot.document ? "문서" : slot.artifact ? "아티팩트" : "비어 있음"}</span>
                      </div>
                    </summary>
                    <div className="grid gap-3 border-t border-border bg-background/50 px-3 py-3">
                      <div className="grid gap-2 text-xs md:grid-cols-4">
                        <div><span className="text-muted-foreground">Content Type</span><div>{slot.contentType ?? "-"}</div></div>
                        <div><span className="text-muted-foreground">Document ID</span><div className="truncate font-mono">{slot.documentId ?? "-"}</div></div>
                        <div><span className="text-muted-foreground">Artifact ID</span><div className="truncate font-mono">{slot.artifactId ?? "-"}</div></div>
                        <div><span className="text-muted-foreground">Updated</span><div>{formatOptionalDate(slot.updatedAt)}</div></div>
                      </div>
                      {slot.document ? (
                        <div className="grid gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{slot.document.title ?? slot.title}</span>
                            <span>{slot.document.format}</span>
                            <span>rev {slot.document.latestRevisionNumber}</span>
                            <span>{formatOptionalDate(slot.document.updatedAt)}</span>
                          </div>
                          <div className="max-h-96 overflow-auto rounded-md border border-border bg-card p-3">
                            <Markdown text={bodyPreview} />
                          </div>
                        </div>
                      ) : null}
                      {slot.artifact ? (
                        <div className="grid gap-2 text-xs">
                          <div className="text-muted-foreground">
                            {slot.artifact.originalFilename ?? slot.artifact.artifactId} · {slot.artifact.contentType} · {formatBytes(slot.artifact.byteSize)}
                          </div>
                          <a
                            className="font-mono text-primary underline-offset-4 hover:underline"
                            href={slot.artifact.contentPath}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {slot.artifact.contentPath}
                          </a>
                        </div>
                      ) : null}
                      {slot.metadata ? (
                        <pre className="max-h-40 overflow-auto rounded-md border border-border bg-muted p-2 text-[11px] text-muted-foreground">
                          {JSON.stringify(slot.metadata, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function StandardPlanSummary({ plan }: { plan: StandardPlan | null }) {
  if (!plan) {
    return <div className={mutedClass}>표준 기획서를 생성하면 개요·목표·범위·기능 요구사항·DB/API 개요가 표시됩니다.</div>;
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{plan.projectTitle}</h3>
        <span className={badgeClass}>
          {plan.confirmedAt ? `확정됨 · ${formatDate(plan.confirmedAt)}` : "미확정"}
        </span>
      </div>
      <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{plan.overview}</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="목표" value={plan.goals.length} />
        <Stat label="기능요구" value={plan.functionalRequirements.length} />
        <Stat label="Schema" value={plan.schemas.length} />
        <Stat label="API" value={plan.apis.length} />
      </div>
      <div>
        <div className={labelClass}>범위</div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-md border border-border bg-background/40 p-2">
            <div className={mutedClass}>포함</div>
            <ul className="mt-1 list-disc pl-4 text-xs leading-5">{plan.scope.inScope.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div className="rounded-md border border-border bg-background/40 p-2">
            <div className={mutedClass}>제외</div>
            <ul className="mt-1 list-disc pl-4 text-xs leading-5">{plan.scope.outOfScope.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        </div>
      </div>
      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">코드</th>
              <th className="px-3 py-2 font-medium">기능</th>
              <th className="px-3 py-2 font-medium">우선순위</th>
              <th className="px-3 py-2 font-medium">설명</th>
            </tr>
          </thead>
          <tbody>
            {plan.functionalRequirements.map((fr) => (
              <tr key={fr.code} className="border-t border-border">
                <td className="px-3 py-2 font-mono">{fr.code}</td>
                <td className="px-3 py-2">{fr.title}</td>
                <td className="px-3 py-2">{fr.priority ?? "-"}</td>
                <td className="px-3 py-2 text-muted-foreground">{fr.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const accessBadge: Record<string, string> = {
  public: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  authenticated: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  admin: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
};
const reviewStatusLabel: Record<ScreenReview["status"], string> = {
  pending: "검토 대기",
  approved: "승인됨",
  "changes-requested": "수정 요청",
};

function ScreenReviewPane({ screenPlan, projectTitle, busy, onReview, onRegenerate }: {
  screenPlan: ScreenPlan | null;
  projectTitle: string;
  busy: string | null;
  onReview: (screenCode: string, input: { status?: ScreenReview["status"]; comment?: string }) => Promise<void>;
  onRegenerate: (screenCode: string, feedback: string) => Promise<void>;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedback, setFeedback] = useState("");

  if (!screenPlan || screenPlan.screens.length === 0) {
    return <div className={mutedClass}>표준 기획서 확정 후 화면정의서를 생성하면 화면별 리뷰가 표시됩니다.</div>;
  }

  const screens = screenPlan.screens;
  const index = Math.min(selectedIndex, screens.length - 1);
  const screen: ScreenDefinition = screens[index];
  const review = screenPlan.reviews?.[screen.code];
  const doc = renderScreenDefinition(screen, projectTitle);
  const move = (delta: number) => {
    setSelectedIndex(Math.min(Math.max(index + delta, 0), screens.length - 1));
    setFeedback("");
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{screen.code}</span>
          <span className="truncate text-sm font-semibold">{screen.name}</span>
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", accessBadge[screen.access] ?? badgeClass)}>
            {SCREEN_ACCESS_LABEL[screen.access] ?? screen.access}
          </span>
        </div>
        <div className={rowClass}>
          <span className={mutedClass}>화면 {index + 1} / {screens.length}</span>
          <Button className={secondaryButtonClass} disabled={busy !== null || index === 0} onClick={() => move(-1)}>이전</Button>
          <Button className={secondaryButtonClass} disabled={busy !== null || index === screens.length - 1} onClick={() => move(1)}>다음</Button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_minmax(280px,360px)]">
        <div className="min-w-0 overflow-auto rounded-md border border-border bg-background/30 p-3 text-sm" data-testid="cos-blueprint-screen-doc">
          <Markdown text={doc} />
        </div>

        <div className="grid content-start gap-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">리뷰</span>
            <span className={badgeClass}>{reviewStatusLabel[review?.status ?? "pending"]}</span>
          </div>

          {review?.comments?.length ? (
            <div className="grid max-h-40 gap-1.5 overflow-auto">
              {review.comments.map((c) => (
                <div key={c.id} className="rounded-md border border-border bg-background/40 p-2 text-xs leading-5">
                  <div className="whitespace-pre-wrap">{c.body}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{formatDate(c.createdAt)}</div>
                </div>
              ))}
            </div>
          ) : <div className={mutedClass}>아직 피드백이 없습니다.</div>}

          <Label className="mt-1 grid gap-1">
            <span className={labelClass}>피드백</span>
            <Textarea
              className={cn(inputClass, "min-h-20 resize-y")}
              data-testid="cos-blueprint-feedback"
              placeholder="수정이 필요한 점을 적으세요. 재생성 시 LLM이 반영합니다."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className={secondaryButtonClass}
              disabled={busy !== null || !feedback.trim()}
              onClick={() => { void onReview(screen.code, { comment: feedback.trim() }).then(() => setFeedback("")); }}
            >
              {busy === "review" ? "저장중..." : "코멘트 저장"}
            </Button>
            <Button
              className={primaryButtonClass}
              data-testid="cos-blueprint-regenerate"
              disabled={busy !== null}
              onClick={() => { void onRegenerate(screen.code, feedback.trim()).then(() => setFeedback("")); }}
            >
              {busy === "regen" ? "재생성중..." : "재생성"}
            </Button>
          </div>
          <Button
            className={secondaryButtonClass}
            disabled={busy !== null || review?.status === "approved"}
            onClick={() => { void onReview(screen.code, { status: "approved" }); }}
          >
            {review?.status === "approved" ? "승인됨" : "승인"}
          </Button>
        </div>
      </div>
    </div>
  );
}

type PendingSource = ParsedFile & { type: SourceType; file: File };

export function CosBlueprintPage({ context }: PluginPageProps) {
  const host = useHostContext();
  const toast = usePluginToast();
  const companyId = context?.companyId ?? host.companyId ?? "";
  const hostProjectId = context?.projectId ?? host.projectId ?? "";
  const { data: overview, loading, error, refresh } = usePluginData<CosBlueprintOverview>(
    DATA.overview,
    companyId ? { companyId } : undefined,
  );
  const { data: projects } = usePluginData<ProjectSummary[]>(
    DATA.projects,
    companyId ? { companyId } : undefined,
  );
  const registerSource = usePluginAction(ACTION.registerSourceDocument);
  const setProductBuilderBlueprint = usePluginAction(ACTION.setProductBuilderBlueprint);
  const runStandardPlan = usePluginAction(ACTION.runStandardPlan);
  const confirmStandardPlan = usePluginAction(ACTION.confirmStandardPlan);
  const writeStandardPlanDocs = usePluginAction(ACTION.writeStandardPlanDocs);
  const runScreens = usePluginAction(ACTION.runScreens);
  const writeScreenDocs = usePluginAction(ACTION.writeScreenDocs);
  const reviewScreen = usePluginAction(ACTION.reviewScreen);
  const regenerateScreen = usePluginAction(ACTION.regenerateScreen);
  const readSourceOriginal = usePluginAction(ACTION.readSourceOriginal);
  const reset = usePluginAction(ACTION.reset);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [pending, setPending] = useState<PendingSource[]>([]);
  const [parsing, setParsing] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<SourceType>("internal-plan");
  const [body, setBody] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [urlType, setUrlType] = useState<SourceType>("external-plan");
  const [urlValue, setUrlValue] = useState("");
  const [urlNotes, setUrlNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const projectList = projects ?? [];
  const projectId = selectedProjectId || hostProjectId || projectList[0]?.id || "";
  const selectedProject = projectList.find((project) => project.id === projectId) ?? null;
  const {
    data: projectDocumentSlots,
    loading: projectSlotsLoading,
    error: projectSlotsError,
    refresh: refreshProjectSlots,
  } = usePluginData<ProjectDocumentSlotsView>(
    DATA.projectDocumentSlots,
    companyId && projectId ? { companyId, projectId } : undefined,
  );
  const state = overview?.state;
  const standardPlan = state?.standardPlan ?? null;
  const screenPlan = state?.screenPlan ?? null;
  const job = state?.job ?? null;
  const productBuilderBlueprintId = state?.productBuilderBlueprintId ?? DEFAULT_PRODUCT_BUILDER_BLUEPRINT_ID;
  const jobRunning = job?.status === "running";
  const confirmed = Boolean(standardPlan?.confirmedAt);
  const canGenerate = Boolean(companyId && state?.sources.length) && !jobRunning;
  const canConfirm = Boolean(companyId && standardPlan && !confirmed) && !jobRunning;
  const canWriteDocs = Boolean(companyId && standardPlan) && !jobRunning;
  const sourceCount = state?.sources.length ?? 0;

  // LLM 액션은 fire-and-forget이라 job=running 동안 폴링한다. 완료/실패 전환 시 토스트.
  const prevJobRef = useRef<string | null>(null);
  useEffect(() => {
    if (!jobRunning) return;
    const id = setInterval(() => { void refresh(); }, 2500);
    return () => clearInterval(id);
  }, [jobRunning, refresh]);
  useEffect(() => {
    const wasRunning = prevJobRef.current === "running";
    if (wasRunning && job?.status === "error") {
      toast({ tone: "error", title: job.message || "작업에 실패했습니다." });
    } else if (wasRunning && !job) {
      toast({ tone: "success", title: "작업을 완료했습니다." });
    }
    prevJobRef.current = job?.status ?? null;
  }, [job, toast]);

  const stepLabel = useMemo(() => {
    if (!sourceCount) return "1. 기획 자료 등록";
    if (!standardPlan) return "2. 표준 기획서 생성";
    if (!confirmed) return "3. 표준 기획서 확정";
    return "4. 화면정의서";
  }, [sourceCount, standardPlan, confirmed]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setParsing(true);
    const parsed: PendingSource[] = [];
    for (const file of Array.from(fileList)) {
      try {
        const result = await parseFile(file);
        parsed.push({ ...result, type, file });
      } catch (err) {
        toast({ tone: "error", title: err instanceof Error ? err.message : `${file.name} 파싱 실패` });
      }
    }
    if (parsed.length) setPending((prev) => [...prev, ...parsed]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setParsing(false);
  }

  function updatePending(index: number, patch: Partial<PendingSource>) {
    setPending((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  function removePending(index: number) {
    setPending((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function registerOne(input: {
    title: string;
    type: SourceType;
    body?: string;
    url?: string;
    fetchUrl?: boolean;
    fileName?: string;
    format?: string;
  }): Promise<SourceDocumentRegisterResult> {
    return await registerSource({
      companyId,
      projectId,
      title: input.title,
      type: input.type,
      body: input.body,
      url: input.url,
      fetchUrl: input.fetchUrl,
      fileName: input.fileName,
      format: input.format,
    }) as SourceDocumentRegisterResult;
  }

  async function handleRegisterFiles() {
    if (!companyId || pending.length === 0) return;
    setBusy("files");
    const remaining: PendingSource[] = [];
    let saved = 0;
    let docWritten = 0;
    let failed = 0;
    try {
      for (const item of pending) {
        try {
          const result = await registerOne({
            title: item.fileName,
            type: item.type,
            body: item.text,
            fileName: item.fileName,
            format: item.format,
          });
          saved += 1;
          if (result.ok) docWritten += 1;
        } catch (err) {
          failed += 1;
          remaining.push(item);
          toast({ tone: "error", title: `${item.fileName}: ${err instanceof Error ? err.message : "등록 실패"}` });
        }
      }
      setPending(remaining);

      await refresh();
      refreshProjectSlots();
      const parts = projectId
        ? [
          `자료 ${saved}건 저장`,
          `문서 ${docWritten}건`,
          failed ? `실패 ${failed}건` : "",
        ]
        : [`자료 ${saved}건 저장(프로젝트 미선택, 문서 미기록)`, failed ? `실패 ${failed}건` : ""];
      toast({ tone: failed ? "warn" : "success", title: `${parts.filter(Boolean).join(", ")}.` });
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadOriginal(source: SourceMaterial) {
    if (!companyId || !source.originalPath) return;
    setDownloadingId(source.id);
    try {
      const result = await readSourceOriginal({
        companyId,
        projectId: source.originalProjectId ?? projectId,
        sourceId: source.id,
      }) as SourceOriginalDownload;
      if (!result.ok || !result.dataBase64) {
        toast({ tone: "warn", title: result.message || "원본을 가져오지 못했습니다." });
        return;
      }
      triggerDownload(
        result.fileName ?? source.fileName ?? "original",
        result.contentType ?? "application/octet-stream",
        result.dataBase64,
      );
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "원본 다운로드 실패" });
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleRegisterManual() {
    if (!companyId) return;
    setBusy("manual");
    try {
      const result = await registerOne({ title, type, body });
      setTitle("");
      setBody("");
      await refresh();
      refreshProjectSlots();
      toast({ tone: result.ok ? "success" : "warn", title: result.message });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "자료 등록 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleSetProductBuilderBlueprint(blueprintId: ProductBuilderBlueprintId) {
    if (!companyId) return;
    setBusy("product-type");
    try {
      const result = await setProductBuilderBlueprint({ companyId, projectId, blueprintId }) as {
        message?: string;
        slotMetadataUpdated?: boolean;
      };
      await refresh();
      refreshProjectSlots();
      toast({
        tone: result.slotMetadataUpdated ? "success" : "info",
        title: result.message ?? "Product Builder 제품 유형을 저장했습니다.",
      });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "제품 유형 저장 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleRegisterUrl() {
    if (!companyId) return;
    setBusy("url");
    try {
      const result = await registerOne({
        title: urlTitle,
        type: urlType,
        body: urlNotes,
        url: urlValue,
        format: "url",
        fetchUrl: true,
      });
      setUrlTitle("");
      setUrlValue("");
      setUrlNotes("");
      await refresh();
      refreshProjectSlots();
      toast({ tone: result.ok ? "success" : "warn", title: result.message });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "URL 등록 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleGeneratePlan() {
    if (!companyId) return;
    setBusy("plan");
    try {
      // fire-and-forget: 액션은 즉시 반환하고 백그라운드 LLM 진행. job 폴링이 결과를 반영한다.
      await runStandardPlan({ companyId });
      await refresh();
      toast({ tone: "info", title: "표준 기획서를 생성 중입니다..." });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "표준 기획서 생성 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirmPlan() {
    if (!companyId) return;
    setBusy("confirm");
    try {
      await confirmStandardPlan({ companyId, projectId });
      await refresh();
      refreshProjectSlots();
      toast({ tone: "success", title: "표준 기획서를 확정했습니다. 화면정의서 단계로 진행할 수 있습니다." });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "확정 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleWritePlanDocs() {
    if (!companyId) return;
    setBusy("plandocs");
    try {
      const result = await writeStandardPlanDocs({ companyId, projectId }) as ProjectDocumentUpdateResult;
      await refresh();
      refreshProjectSlots();
      toast({ tone: result.ok ? "success" : "warn", title: result.message });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "문서 산출 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleRunScreens() {
    if (!companyId) return;
    setBusy("screens");
    try {
      await runScreens({ companyId });
      await refresh();
      toast({ tone: "info", title: "화면정의서를 생성 중입니다..." });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "화면정의서 생성 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleWriteScreenDocs() {
    if (!companyId) return;
    setBusy("screendocs");
    try {
      const result = await writeScreenDocs({ companyId, projectId }) as ProjectDocumentUpdateResult;
      await refresh();
      refreshProjectSlots();
      toast({ tone: result.ok ? "success" : "warn", title: result.message });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "문서 산출 실패" });
    } finally {
      setBusy(null);
    }
  }

  // 산출물(①/②)을 선택 프로젝트의 wiki space에 페이지로 등재한다.
  // worker 우회 — UI board 세션으로 wiki apiRoute(file-as-page)를 직접 호출(./wiki.ts).
  async function handleRegisterToWiki(phase: "standard" | "screens") {
    if (!companyId) return;
    // 목록에 없어도(archived/로딩 race) host projectId가 있으면 등재 가능하게 한다.
    // wikiSpaceForProject는 {id,name}만 필요하므로 plan 제목을 이름 후보로 쓴다.
    const project = selectedProject
      ?? (projectId ? { id: projectId, name: standardPlan?.projectTitle ?? "프로젝트" } : null);
    if (!project) {
      toast({ tone: "warn", title: "위키에 등재하려면 대상 프로젝트를 선택하세요." });
      return;
    }
    // 디스크 산출(worker)과 동일하게 standardPlan.projectTitle을 우선 사용한다.
    const projectTitle = standardPlan?.projectTitle ?? project.name;
    const pages = phase === "standard"
      ? buildWikiPages(standardPlan, null, projectTitle)
      : buildWikiPages(null, screenPlan, projectTitle);
    if (pages.length === 0) {
      toast({ tone: "warn", title: "등재할 산출물이 없습니다." });
      return;
    }
    setBusy(phase === "standard" ? "wiki-standard" : "wiki-screens");
    try {
      const space = wikiSpaceForProject(project);
      const result = await registerPagesToWiki(companyId, space, pages);
      const tone = result.failed ? (result.filed ? "warn" : "error") : "success";
      toast({
        tone,
        title: `위키 '${space.displayName}'에 ${result.filed}건 등재${result.failed ? `, 실패 ${result.failed}건` : ""}.`,
      });
      for (const failure of result.failures.slice(0, 3)) {
        toast({ tone: "error", title: failure });
      }
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "위키 등재 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleReviewScreen(screenCode: string, input: { status?: ScreenReview["status"]; comment?: string }) {
    if (!companyId) return;
    setBusy("review");
    try {
      await reviewScreen({ companyId, screenCode, ...input });
      await refresh();
      toast({ tone: "success", title: input.status === "approved" ? "화면을 승인했습니다." : "피드백을 저장했습니다." });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "리뷰 저장 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleRegenerateScreen(screenCode: string, feedback: string) {
    if (!companyId) return;
    setBusy("regen");
    try {
      await regenerateScreen({ companyId, screenCode, feedback });
      await refresh();
      toast({ tone: "info", title: `화면 ${screenCode}을(를) 재생성 중입니다...` });
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error ? err.message : "화면 재생성 실패" });
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    if (!companyId) return;
    setBusy("reset");
    try {
      await reset({ companyId });
      setPending([]);
      setUrlTitle("");
      setUrlValue("");
      setUrlNotes("");
      await refresh();
      refreshProjectSlots();
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
          <Button className={secondaryButtonClass} disabled={busy !== null} onClick={() => void handleReset()}>
            초기화
          </Button>
        </div>
      </div>

      <Card className={cn(panelClass, "grid gap-2")}>
        <Label className="grid gap-1.5">
          <span className={labelClass}>대상 프로젝트</span>
          <Select
            className={inputClass}
            data-testid="cos-blueprint-project-select"
            value={projectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
          >
            <option value="">(프로젝트 미선택 — 자료만 저장)</option>
            {projectList.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}{project.status ? ` · ${project.status}` : ""}
              </option>
            ))}
          </Select>
        </Label>
        <p className={mutedClass}>
          선택한 프로젝트 기준으로 source slot과 deliverable slot을 갱신합니다. 산출물은 Project document slot에 등록되며, 미선택 시 자료는 회사 단위로만 저장됩니다.
        </p>
        <Label className="mt-2 grid gap-1.5">
          <span className={labelClass}>제품 유형(Product Type)</span>
          <Select
            className={inputClass}
            data-testid="cos-blueprint-product-builder-blueprint"
            value={productBuilderBlueprintId}
            disabled={busy !== null}
            onChange={(event) => void handleSetProductBuilderBlueprint(event.target.value as ProductBuilderBlueprintId)}
          >
            {PRODUCT_BUILDER_BLUEPRINT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Label>
        <div className={mutedClass}>
          Product Builder는 이 선택값을 Project document slot metadata에서 읽어 기본 워크플로우로 사용합니다.
          현재 기준: {productBuilderBlueprintLabel(productBuilderBlueprintId)}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,460px)_1fr]">
        <Card className={panelClass}>
          <div className="mb-3">
            <h2 className="text-sm font-semibold">1. 기획 자료 등록</h2>
            <p className={mutedClass}>파일을 드래그&드롭하거나 직접 입력으로 등록합니다. 등록한 자료는 아래 목록에 쌓입니다.</p>
          </div>

          <div className="grid gap-3">
            <div
              className={cn(
                "grid gap-2 rounded-md border border-dashed p-3 transition-colors",
                dragOver ? "border-primary bg-accent/40" : "border-border",
              )}
              onDragOver={(event) => { event.preventDefault(); if (busy === null && !parsing) setDragOver(true); }}
              onDragLeave={(event) => { event.preventDefault(); setDragOver(false); }}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                if (busy === null && !parsing) void handleFiles(event.dataTransfer.files);
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={labelClass}>파일 업로드</span>
                <span className={mutedClass}>txt · md · docx · pptx · pdf · xlsx</span>
              </div>
              <Button
                type="button"
                className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input bg-background/40 px-4 py-6 text-center text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                data-testid="cos-blueprint-dropzone"
                disabled={busy !== null || parsing}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="font-medium">{dragOver ? "여기에 놓으세요" : "파일을 여기로 드래그"}</span>
                <span className={mutedClass}>또는 클릭하여 선택 · 여러 개 가능</span>
              </Button>
              <Input
                ref={fileInputRef}
                className="hidden"
                type="file"
                multiple
                accept={FILE_ACCEPT}
                data-testid="cos-blueprint-file-input"
                disabled={busy !== null || parsing}
                onChange={(event) => void handleFiles(event.target.files)}
              />
              {parsing ? <span className={mutedClass}>파일 분석중...</span> : null}
              <span className={mutedClass}>파일은 텍스트로 추출되어 선택한 프로젝트의 source slot에 등록됩니다.</span>

              {pending.length > 0 ? (
                <div className="grid gap-2" data-testid="cos-blueprint-pending-list">
                  {pending.map((item, index) => (
                    <div key={`${item.fileName}-${index}`} className="grid gap-2 rounded-md border border-border bg-background/40 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-xs font-medium">{item.fileName}</span>
                        <span className={badgeClass}>{item.format} · {item.text.length}자</span>
                      </div>
                      <div className={rowClass}>
                        <Select
                          className={cn(inputClass, "h-8 w-40")}
                          value={item.type}
                          disabled={busy !== null}
                          onChange={(event) => updatePending(index, { type: event.target.value as SourceType })}
                        >
                          {SOURCE_TYPES.map((entry) => (
                            <option key={entry} value={entry}>{sourceTypeLabel(entry)}</option>
                          ))}
                        </Select>
                        <Button
                          className={secondaryButtonClass}
                          disabled={busy !== null}
                          onClick={() => removePending(index)}
                        >
                          제거
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    className={primaryButtonClass}
                    data-testid="cos-blueprint-register-files"
                    disabled={busy !== null}
                    onClick={() => void handleRegisterFiles()}
                  >
                    {busy === "files" ? "등록중..." : `파일 ${pending.length}건 등록`}
                  </Button>
                </div>
              ) : null}
            </div>

            <details className="rounded-md border border-border p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">URL 등록</summary>
              <div className="mt-3 grid gap-3">
                <Label>
                  <span className={labelClass}>자료 제목</span>
                  <Input className={inputClass} value={urlTitle} onChange={(event) => setUrlTitle(event.target.value)} />
                </Label>
                <Label>
                  <span className={labelClass}>자료 URL</span>
                  <Input
                    className={inputClass}
                    type="url"
                    placeholder="https://..."
                    value={urlValue}
                    onChange={(event) => setUrlValue(event.target.value)}
                  />
                </Label>
                <Label>
                  <span className={labelClass}>자료 유형</span>
                  <Select className={inputClass} value={urlType} onChange={(event) => setUrlType(event.target.value as SourceType)}>
                    {SOURCE_TYPES.map((entry) => (
                      <option key={entry} value={entry}>{sourceTypeLabel(entry)}</option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  <span className={labelClass}>메모</span>
                  <Textarea className={cn(textareaClass, "min-h-20")} value={urlNotes} onChange={(event) => setUrlNotes(event.target.value)} />
                </Label>
                <Button
                  className={primaryButtonClass}
                  disabled={busy !== null || !urlTitle.trim() || !urlValue.trim()}
                  onClick={() => void handleRegisterUrl()}
                >
                  {busy === "url" ? "등록중..." : "URL 등록"}
                </Button>
              </div>
            </details>

            <details className="rounded-md border border-border p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">직접 입력</summary>
              <div className="mt-3 grid gap-3">
                <Label>
                  <span className={labelClass}>자료 제목</span>
                  <Input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} />
                </Label>
                <Label>
                  <span className={labelClass}>자료 유형</span>
                  <Select className={inputClass} value={type} onChange={(event) => setType(event.target.value as SourceType)}>
                    {SOURCE_TYPES.map((entry) => (
                      <option key={entry} value={entry}>{sourceTypeLabel(entry)}</option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  <span className={labelClass}>자료 본문</span>
                  <Textarea className={textareaClass} value={body} onChange={(event) => setBody(event.target.value)} />
                </Label>
                <Button
                  className={primaryButtonClass}
                  disabled={busy !== null || !title.trim() || !body.trim()}
                  onClick={() => void handleRegisterManual()}
                >
                  {busy === "manual" ? "등록중..." : "자료 등록"}
                </Button>
              </div>
            </details>

            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">등록된 자료</h3>
                <span className={badgeClass}>{sourceCount}개</span>
              </div>
              <SourceList sources={state?.sources ?? []} onDownload={handleDownloadOriginal} downloadingId={downloadingId} />
            </div>
          </div>
        </Card>

        <Card className={panelClass}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">① 표준 기획서</h2>
              <p className={mutedClass}>등록 자료에서 개요·목표·범위·기능 요구사항·DB/API 개요를 생성하고 확정합니다.</p>
            </div>
            <div className={rowClass}>
              <Button
                className={primaryButtonClass}
                data-testid="cos-blueprint-generate-plan"
                disabled={busy !== null || !canGenerate}
                onClick={() => void handleGeneratePlan()}
              >
                {jobRunning && job?.kind === "standard-plan" ? "생성중..." : standardPlan ? "재생성" : "표준 기획서 생성"}
              </Button>
              <Button
                className={primaryButtonClass}
                data-testid="cos-blueprint-confirm-plan"
                disabled={busy !== null || !canConfirm}
                onClick={() => void handleConfirmPlan()}
              >
                {busy === "confirm" ? "확정중..." : confirmed ? "확정됨" : "확정"}
              </Button>
              <Button
                className={secondaryButtonClass}
                disabled={busy !== null || !canWriteDocs}
                onClick={() => void handleWritePlanDocs()}
              >
                {busy === "plandocs" ? "산출중..." : "문서 산출"}
              </Button>
              <Button
                className={secondaryButtonClass}
                data-testid="cos-blueprint-wiki-standard"
                disabled={busy !== null || !standardPlan || !projectId || jobRunning}
                onClick={() => void handleRegisterToWiki("standard")}
              >
                {busy === "wiki-standard" ? "등재중..." : "위키 등재"}
              </Button>
            </div>
          </div>
          <StandardPlanSummary plan={standardPlan} />
        </Card>
      </div>

      <Card className={panelClass}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">② 화면정의서 리뷰</h2>
            <p className={mutedClass}>
              {confirmed
                ? "화면별 문서를 검토하고 피드백을 남기면 LLM이 해당 화면만 재생성합니다."
                : "표준 기획서를 먼저 확정하세요. 확정 전에는 생성할 수 없습니다."}
            </p>
          </div>
          <div className={rowClass}>
            <Button
              className={primaryButtonClass}
              data-testid="cos-blueprint-run-screens"
              disabled={busy !== null || !confirmed || jobRunning}
              onClick={() => void handleRunScreens()}
            >
              {jobRunning && job?.kind === "screens" ? "생성중..." : screenPlan ? "전체 재생성" : "화면정의서 생성"}
            </Button>
            <Button
              className={secondaryButtonClass}
              data-testid="cos-blueprint-write-screen-docs"
              disabled={busy !== null || !screenPlan || jobRunning}
              onClick={() => void handleWriteScreenDocs()}
            >
              {busy === "screendocs" ? "산출중..." : "문서 산출"}
            </Button>
            <Button
              className={secondaryButtonClass}
              data-testid="cos-blueprint-wiki-screens"
              disabled={busy !== null || !screenPlan || !projectId || jobRunning}
              onClick={() => void handleRegisterToWiki("screens")}
            >
              {busy === "wiki-screens" ? "등재중..." : "위키 등재"}
            </Button>
          </div>
        </div>
        <ScreenReviewPane
          screenPlan={screenPlan}
          projectTitle={standardPlan?.projectTitle ?? "프로젝트"}
          busy={jobRunning ? (job?.kind === "screen" ? "regen" : "job") : busy}
          onReview={handleReviewScreen}
          onRegenerate={handleRegenerateScreen}
        />
      </Card>

      <ProjectDocumentSlotsPanel
        view={projectDocumentSlots}
        loading={projectSlotsLoading}
        error={projectSlotsError}
        onRefresh={refreshProjectSlots}
        projectName={selectedProject?.name ?? (projectId ? standardPlan?.projectTitle ?? projectId : null)}
      />
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
      <span>Blueprint</span>
    </a>
  );
}
