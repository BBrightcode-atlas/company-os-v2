import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import {
  useHostContext,
  useHostLocation,
  useHostNavigation,
  usePluginAction,
  usePluginData,
  usePluginToast,
  type PluginPageProps,
  type PluginRouteSidebarProps,
  type PluginSidebarProps,
} from "@paperclipai/plugin-sdk/ui";
import {
  ACTION,
  DATA,
  WIREFRAME_OUTPUT_FILE,
  type WireframeComment,
  type WireframeProjectSummary,
  type WireframeRecord,
  type WireframeUpstreamSlot,
  type WireframeUpstreamSlots,
} from "../contract.js";
import { Badge, Button, Card, Input, Label, Select, Textarea } from "../../ui/primitives.js";

const cls = {
  input:
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
  btnPrimary:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50",
  btn:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/50 disabled:opacity-50",
};

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

let wfCreating = false;
const wfCreatingListeners = new Set<() => void>();
function setWfCreating(value: boolean) {
  if (wfCreating === value) return;
  wfCreating = value;
  wfCreatingListeners.forEach((l) => l());
}
function useWfCreating(): boolean {
  const [value, setValue] = useState(wfCreating);
  useEffect(() => {
    const listener = () => setValue(wfCreating);
    wfCreatingListeners.add(listener);
    setValue(wfCreating);
    return () => { wfCreatingListeners.delete(listener); };
  }, []);
  return value;
}

export function WireframesSidebarItem(_props: PluginSidebarProps) {
  const nav = useHostNavigation();
  const loc = useHostLocation();
  const active = /(^|\/)wireframes(\/|$)/.test(loc.pathname);
  const linkCls =
    "flex items-center gap-2.5 px-3 py-2 pointer-coarse:py-1.5 text-[13px] font-medium transition-colors " +
    (active ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50 hover:text-foreground");
  return (
    <a
      {...nav.linkProps("/wireframes")}
      className={linkCls}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          setWfCreating(false);
          nav.navigate("/wireframes");
        }
      }}
    >
      <span className="relative shrink-0" aria-hidden>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      </span>
      <span className="flex-1 truncate">Wireframe</span>
    </a>
  );
}

export function WireframesRouteSidebar({ context }: PluginRouteSidebarProps) {
  const companyId = context.companyId ?? null;
  const projectId = context.projectId ?? null;
  if (!companyId) return null;
  return <ChatSidebar companyId={companyId} projectId={projectId} />;
}

function ChatSidebar({ companyId, projectId }: { companyId: string; projectId?: string | null }) {
  const { data: wf, refresh } = usePluginData<WireframeRecord | null>(
    DATA.getCurrent,
    { companyId, projectId: projectId || undefined },
  );
  const creating = useWfCreating();
  const hidden = !wf || creating;
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = hidden
      ? "[data-secondary-sidebar]{display:none !important;}"
      : "[data-secondary-sidebar]{width:320px !important;}@keyframes wf-dot{0%,80%,100%{opacity:.3}40%{opacity:1}}.wf-dot{animation:wf-dot 1.2s infinite both}@keyframes wf-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}.wf-in{animation:wf-in .18s ease-out both}";
    document.head.appendChild(style);
    return () => style.remove();
  }, [hidden]);
  if (!wf || creating) return null;
  return <ChatPanel companyId={companyId} id={wf.id} onRevised={() => void refresh()} />;
}

const UPSTREAM_STATUS_META: Record<string, { label: string; cls: string }> = {
  ready: { label: "준비됨", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  approved: { label: "승인됨", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  draft: { label: "초안", cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  empty: { label: "비어있음", cls: "" },
  "n/a": { label: "해당 없음", cls: "" },
};

function SlotStatusBadge({ status }: { status: string }) {
  const meta = UPSTREAM_STATUS_META[status] ?? { label: status, cls: "" };
  return <Badge className={meta.cls}>{meta.label}</Badge>;
}

function UpstreamSlotRow({ label, slot, fallback }: { label: string; slot: WireframeUpstreamSlot | null; fallback: string }) {
  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {slot?.screenCount != null && <span className="text-xs text-muted-foreground">화면 {slot.screenCount}개</span>}
        <span className="flex-1" />
        {slot ? <SlotStatusBadge status={slot.status} /> : <Badge>없음</Badge>}
      </div>
      <div className="p-3">
        {slot?.hasBody ? (
          <>
            {!slot.included && (
              <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
                이 산출물은 아직 와이어프레임에 포함되지 않습니다(ready 상태 필요).
              </p>
            )}
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-2 text-xs text-muted-foreground">{slot.bodyPreview}</pre>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{fallback}</p>
        )}
      </div>
    </div>
  );
}

function UpstreamPreview({ upstream, loading, cardCls, cardHead }: {
  upstream: WireframeUpstreamSlots | null | undefined;
  loading: boolean;
  cardCls: string;
  cardHead: string;
}) {
  if (loading && !upstream) {
    return (
      <Card className={cardCls} style={{ borderRadius: 12, overflow: "hidden" }}>
        <div className={cardHead}><span className="text-sm font-semibold text-foreground">Blueprint 산출물</span></div>
        <div className="p-4 text-sm text-muted-foreground">Blueprint 산출물 확인 중…</div>
      </Card>
    );
  }
  const ready = Boolean(upstream?.ready);
  const screenCount = upstream?.screenDefinitions?.screenCount ?? null;
  return (
    <Card className={cardCls} style={{ borderRadius: 12, overflow: "hidden" }}>
      <div className={cardHead}>
        <span className="text-sm font-semibold text-foreground">Blueprint 산출물</span>
        <span className="text-xs text-muted-foreground">프로젝트 slot에서 자동으로 불러옵니다</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className={`rounded-md border px-3 py-2 text-sm ${ready ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
          {ready
            ? `Blueprint 화면정의서${screenCount != null ? ` ${screenCount}개 화면` : ""}으로 와이어프레임을 생성합니다.`
            : "Blueprint에서 화면정의서를 확정(전 화면 승인)하면 와이어프레임을 만들 수 있습니다."}
        </div>
        <UpstreamSlotRow label="화면 정의서 (필수)" slot={upstream?.screenDefinitions ?? null} fallback="아직 화면정의서가 없습니다. Blueprint에서 먼저 생성하세요." />
        <UpstreamSlotRow label="표준 기획서 (선택)" slot={upstream?.standardPlan ?? null} fallback="표준 기획서가 없거나 아직 준비되지 않았습니다." />
      </div>
    </Card>
  );
}

function InputView({
  companyId,
  projectId,
  projects,
  onProjectIdChange,
  onCreated,
  onCancel,
}: {
  companyId: string;
  projectId: string;
  projects: WireframeProjectSummary[];
  onProjectIdChange: (projectId: string) => void;
  onCreated: () => void;
  onCancel?: () => void;
}) {
  const create = usePluginAction(ACTION.createWireframe);
  const trigger = usePluginAction(ACTION.triggerGenerate);
  const toast = usePluginToast();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const [shellHeight, setShellHeight] = useState<string>();

  const hasProject = Boolean(projectId);
  // Wireframe은 Blueprint 산출물(slot) 전용. 항상 호출하고 projectId 미선택이면 worker가 빈 묶음 반환.
  const { data: upstream, loading: upstreamLoading } = usePluginData<WireframeUpstreamSlots>(
    DATA.upstreamSlots,
    { companyId, projectId: projectId || undefined },
  );

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (el) setShellHeight(`calc(100vh - ${Math.round(el.getBoundingClientRect().top)}px)`);
  }, []);

  const screenReady = Boolean(upstream?.ready);
  const canSubmit = hasProject && !!title.trim() && screenReady;

  async function submit() {
    if (!canSubmit) {
      toast({
        title: !hasProject
          ? "프로젝트를 선택하세요."
          : !title.trim()
            ? "제목을 입력하세요."
            : "Blueprint 화면정의서가 준비(ready)되어야 생성할 수 있습니다.",
        tone: "error",
      });
      return;
    }
    setBusy(true);
    try {
      const res = (await create({ companyId, projectId, input: { title: title.trim(), projectId } })) as { id?: string };
      if (res?.id) await trigger({ companyId, id: res.id });
      onCreated();
    } catch (e) {
      toast({ title: (e as Error).message ?? "생성 실패", tone: "error" });
      setBusy(false);
    }
  }

  const cardCls = "rounded-xl border border-border bg-card";
  const cardHead = "flex items-center gap-2 border-b border-border px-4 py-2.5";

  return (
    <div ref={shellRef} className="-m-4 flex flex-col md:-m-6" style={{ height: shellHeight }}>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <h1 className="text-xl font-bold text-foreground">와이어프레임 만들기</h1>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">
            프로젝트를 선택하면 Blueprint가 만든 화면정의서·표준기획서를 그대로 사용해 동작하는 고충실도 와이어프레임이 생성됩니다.
          </p>

          <Card className={cardCls + " mb-5"} style={{ borderRadius: 12, overflow: "hidden" }}>
            <div className={cardHead}>
              <span className="text-sm font-semibold text-foreground">기본</span>
            </div>
            <div className="flex flex-col gap-4 p-4">
              <Label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  프로젝트 <span className="text-primary">*</span>
                </span>
                <Select className={cls.input} value={projectId} onChange={(e) => onProjectIdChange(e.target.value)}>
                  <option value="">프로젝트를 선택하세요</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}{project.status ? ` · ${project.status}` : ""}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  제목 <span className="text-primary">*</span>
                </span>
                <Input className={cls.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 일정 관리 앱 / 재고 대시보드 / 예약 시스템" />
              </Label>
            </div>
          </Card>

          {hasProject ? (
            <UpstreamPreview upstream={upstream} loading={upstreamLoading} cardCls={cardCls} cardHead={cardHead} />
          ) : (
            <Card className={cardCls} style={{ borderRadius: 12, overflow: "hidden" }}>
              <div className={cardHead}>
                <span className="text-sm font-semibold text-foreground">Blueprint 산출물</span>
              </div>
              <div className="p-6 text-center text-sm text-muted-foreground">
                먼저 프로젝트를 선택하세요. 와이어프레임은 Blueprint가 만든 화면정의서(필수)와 표준기획서로 생성됩니다.
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="flex h-14 shrink-0 items-center gap-3 border-t border-border bg-background px-6">
        <span className="text-sm text-muted-foreground">
          {!hasProject
            ? "프로젝트를 선택하세요"
            : upstream?.screenDefinitions?.screenCount != null
              ? `화면 ${upstream.screenDefinitions.screenCount}개 (Blueprint)`
              : "Blueprint 화면정의서 기준"}
          {hasProject && !title.trim() && <span className="ml-2 text-amber-600 dark:text-amber-400">제목을 입력하세요</span>}
          {hasProject && title.trim() && !screenReady && <span className="ml-2 text-amber-600 dark:text-amber-400">화면정의서 준비 필요</span>}
        </span>
        <span className="flex-1" />
        {onCancel && <Button className={cls.btn} disabled={busy} onClick={onCancel}>취소</Button>}
        <Button className={cls.btnPrimary} disabled={busy || !canSubmit} onClick={submit}>{busy ? "생성 중…" : "와이어프레임 생성"}</Button>
      </div>
    </div>
  );
}

function cleanBody(s: string): string {
  return (s || "").replace(/===WF_[A-Z_]+===/g, "").trim();
}

function AiAvatar() {
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground" style={{ width: 24, height: 24 }} aria-hidden>
      <Sparkles size={14} />
    </span>
  );
}

function ChatMessage({ c }: { c: WireframeComment }) {
  const body = cleanBody(c.body);
  if (!body) return null;
  if (c.authorType === "user") {
    return (
      <div className="wf-in flex">
        <div className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" style={{ marginLeft: "auto", maxWidth: "85%", whiteSpace: "pre-wrap", borderBottomRightRadius: 3 }}>{body}</div>
      </div>
    );
  }
  if (c.authorType === "system") {
    return <div className="wf-in px-2 text-center text-xs text-muted-foreground" style={{ whiteSpace: "pre-wrap" }}>{body}</div>;
  }
  const revision = c.kind === "revision";
  return (
    <div className="wf-in flex gap-2">
      <AiAvatar />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          Wireframe AI
          {revision && <span>· ✓ 수정 완료</span>}
        </div>
        <div className="text-sm text-foreground" style={{ whiteSpace: "pre-wrap" }}>{body}</div>
      </div>
    </div>
  );
}

function ChatThinking() {
  return (
    <div className="wf-in flex items-center gap-2">
      <AiAvatar />
      <div className="flex items-center gap-1 text-muted-foreground" style={{ height: 24 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="wf-dot inline-block rounded-full" style={{ width: 6, height: 6, backgroundColor: "currentColor", animationDelay: `${i * 0.16}s` }} />
        ))}
      </div>
    </div>
  );
}

const CHAT_SUGGESTIONS = ["통계 화면 추가", "목록을 칸반 보드로", "다크 모드 적용", "검색 필터 추가"];

function ChatWelcome({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="wf-in flex flex-col gap-3 px-1 py-2">
      <div className="flex items-center gap-2">
        <AiAvatar />
        <span className="text-sm font-semibold text-foreground">무엇을 바꿀까요?</span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">자연어로 요청하면 와이어프레임과 화면 정의서가 함께 업데이트됩니다.</p>
      <div className="flex flex-wrap gap-1.5">
        {CHAT_SUGGESTIONS.map((s) => (
          <Button key={s} onClick={() => onPick(s)} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent">{s}</Button>
        ))}
      </div>
    </div>
  );
}

function ChatPanel({ companyId, id, onRevised }: { companyId: string; id: string; onRevised: () => void }) {
  const { data, refresh } = usePluginData<WireframeComment[]>(DATA.listComments, { companyId, id });
  const addComment = usePluginAction(ACTION.addComment);
  const toast = usePluginToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const baselineRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const comments = data ?? [];

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => void refresh(), 4000);
    return () => clearInterval(t);
  }, [busy, refresh]);

  useEffect(() => {
    if (!busy) return;
    if (comments.length < baselineRef.current + 2) return;
    const last = comments[comments.length - 1];
    if (last.authorType === "user") return;
    setBusy(false);
    if (last.authorType === "assistant" && last.kind === "revision") {
      onRevised();
    } else {
      toast({ title: cleanBody(last.body) || "수정 실패", tone: "error" });
    }
  }, [comments, busy, onRevised, toast]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length, busy]);

  async function sendText(raw: string) {
    const body = raw.trim();
    if (!body || busy) return;
    setText("");
    baselineRef.current = comments.length;
    setBusy(true);
    try {
      await addComment({ companyId, id, body });
      await refresh();
    } catch (e) {
      setBusy(false);
      toast({ title: (e as Error).message ?? "전송 실패", tone: "error" });
    }
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        {comments.length === 0 ? (
          <ChatWelcome onPick={(t) => void sendText(t)} />
        ) : (
          comments.map((c) => <ChatMessage key={c.id} c={c} />)
        )}
        {busy && <ChatThinking />}
      </div>
      <div className="flex h-14 shrink-0 items-center gap-2 border-t border-border px-3">
        <Textarea
          rows={1}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          style={{ height: 38 }}
          value={text}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendText(text); } }}
          placeholder="무엇을 바꿀까요?"
        />
        <Button
          className={cls.btnPrimary + " shrink-0"}
          disabled={busy || !text.trim()}
          onClick={() => void sendText(text)}
        >
          <ArrowUp size={16} />
          전송
        </Button>
      </div>
    </div>
  );
}

function Workspace({ companyId, wf, onRefresh, onNew }: { companyId: string; wf: WireframeRecord; onRefresh: () => void; onNew: () => void }) {
  const trigger = usePluginAction(ACTION.triggerGenerate);
  const syncSlot = usePluginAction(ACTION.syncDeliverableSlot);
  const toast = usePluginToast();
  const shellRef = useRef<HTMLDivElement>(null);
  const [shellHeight, setShellHeight] = useState<string>();
  const syncedRef = useRef<string>("");

  // 생성/수정은 fire-and-forget job이라 slot 기록을 못 한다. 완료(generated)되면
  // 동기 액션으로 deliverable.wireframe_html slot을 기록한다(invocation scope 유효).
  useEffect(() => {
    if (wf.status !== "generated" || !wf.projectId || !wf.html) return;
    const key = `${wf.id}:${wf.updatedAt}`;
    if (syncedRef.current === key) return;
    syncedRef.current = key;
    void syncSlot({ companyId, id: wf.id });
  }, [wf.status, wf.projectId, wf.html, wf.id, wf.updatedAt, companyId, syncSlot]);

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (el) setShellHeight(`calc(100vh - ${Math.round(el.getBoundingClientRect().top)}px)`);
  }, []);

  function exportHtml() {
    if (!wf.html) {
      toast({ title: "다운로드할 HTML이 없습니다.", tone: "error" });
      return;
    }
    download(WIREFRAME_OUTPUT_FILE, wf.html, "text/html");
    toast({ title: "wireframe.html 다운로드", tone: "success" });
  }

  return (
    <div ref={shellRef} className="-m-4 md:-m-6 flex flex-col" style={{ height: shellHeight }}>
      <header className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
        <Button className={cls.btn} onClick={onNew}>← 입력</Button>
        <span className="flex-1" />
        <Button className={cls.btn} disabled={!wf.html} onClick={exportHtml}>⬇ HTML</Button>
        <Button
          className={cls.btn}
          disabled={wf.status === "generating"}
          onClick={async () => { await trigger({ companyId, id: wf.id }); onRefresh(); }}
        >
          {wf.status === "generating" ? "생성 중…" : "재생성"}
        </Button>
      </header>
      {wf.status === "error" && (
        <div className="mb-2 rounded-md border border-border bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">생성 오류: {wf.errorMessage}</div>
      )}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 justify-center overflow-auto bg-muted/40 p-4">
          {wf.html ? (
            <iframe
              title="wireframe"
              className="h-full w-full max-w-[1120px] rounded-md border border-border bg-background shadow-sm"
              srcDoc={wf.html}
              sandbox="allow-scripts"
            />
          ) : (
            <div className="self-center text-sm text-muted-foreground">
              {wf.status === "generating" ? "와이어프레임 생성 중… (자동 갱신)" : "아직 생성되지 않았습니다."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WireframesPage(props: PluginPageProps) {
  const host = useHostContext();
  const companyId = host.companyId ?? props.context?.companyId ?? null;
  if (!companyId) {
    return <div className="px-6 py-16 text-center text-sm text-muted-foreground">회사 정보를 불러오는 중…</div>;
  }
  const cid = companyId as string;
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => host.projectId ?? props.context?.projectId ?? "");
  const { data: projectRows } = usePluginData<WireframeProjectSummary[]>(DATA.projects, { companyId: cid });
  const projects = projectRows ?? [];
  const { data: wf, loading, refresh } = usePluginData<WireframeRecord | null>(
    DATA.getCurrent,
    { companyId: cid, projectId: selectedProjectId || undefined },
  );
  const creating = useWfCreating();

  useEffect(() => {
    setWfCreating(false);
    return () => setWfCreating(false);
  }, []);

  useEffect(() => {
    if (!wf?.id) return;
    const t = setInterval(() => void refresh(), 4000);
    return () => clearInterval(t);
  }, [wf?.id, refresh]);

  if (loading && !wf) return <div className="px-6 py-16 text-center text-sm text-muted-foreground">불러오는 중…</div>;
  if (creating || !wf) {
    return (
      <InputView
        companyId={cid}
        projectId={selectedProjectId}
        projects={projects}
        onProjectIdChange={setSelectedProjectId}
        onCreated={() => { setWfCreating(false); void refresh(); }}
        onCancel={wf ? () => setWfCreating(false) : undefined}
      />
    );
  }
  return <Workspace companyId={cid} wf={wf} onRefresh={() => void refresh()} onNew={() => setWfCreating(true)} />;
}
