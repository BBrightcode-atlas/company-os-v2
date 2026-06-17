import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { extractText, getDocumentProxy } from "unpdf";
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
  type WireframeComment,
  type WireframeRecord,
} from "../contract.js";
import { ScreenSpecEditor } from "./screen-spec-editor.js";
import { emptyDoc, exampleScreenDoc, hasContent, type ScreenSpecDoc } from "../screen-spec.js";

const SPEC_TEMPLATE = `# 개발 기획서

## 목적
(이 제품이 해결하는 문제를 한두 문장으로)

## 주요 기능
- (기능 1)
- (기능 2)
`;

const cls = {
  input:
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
  textarea:
    "w-full min-h-[200px] resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-[13px] leading-relaxed text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
  btnPrimary:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50",
  btn:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/50 disabled:opacity-50",
  btnSmall:
    "inline-flex h-7 items-center rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent/50",
};

async function fileToText(file: File): Promise<string> {
  if (/\.pdf$/i.test(file.name)) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    return String(text ?? "");
  }
  return await file.text();
}

const fileBaseName = (name: string): string => name.replace(/\.[^.]+$/, "");

const clearFileInput = (ref: RefObject<HTMLInputElement | null>) => {
  if (ref.current) ref.current.value = "";
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
  if (!companyId) return null;
  return <ChatSidebar companyId={companyId} />;
}

function ChatSidebar({ companyId }: { companyId: string }) {
  const { data: wf, refresh } = usePluginData<WireframeRecord | null>(DATA.getCurrent, { companyId });
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

function InputView({ companyId, onCreated, onCancel }: { companyId: string; onCreated: () => void; onCancel?: () => void }) {
  const create = usePluginAction(ACTION.createWireframe);
  const trigger = usePluginAction(ACTION.triggerGenerate);
  const extract = usePluginAction(ACTION.extractScreenModel);
  const toast = usePluginToast();
  const [title, setTitle] = useState("");
  const [specDoc, setSpecDoc] = useState("");
  const [specFile, setSpecFile] = useState("");
  const [screenModel, setScreenModel] = useState<ScreenSpecDoc>(() => emptyDoc());
  const [screenFile, setScreenFile] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [busy, setBusy] = useState(false);
  const specRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLInputElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [shellHeight, setShellHeight] = useState<string>();

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (el) setShellHeight(`calc(100vh - ${Math.round(el.getBoundingClientRect().top)}px)`);
  }, []);

  const setTitleFromFile = (file: File) => {
    if (!title.trim()) setTitle(fileBaseName(file.name));
  };
  const confirmReplaceScreens = (message: string): boolean => !hasContent(screenModel) || window.confirm(message);

  async function pickSpec() {
    const f = specRef.current?.files?.[0];
    if (!f) return;
    try {
      setSpecDoc(await fileToText(f));
      setSpecFile(f.name);
      setTitleFromFile(f);
    } catch {
      toast({ title: `${f.name} 읽기 실패`, tone: "error" });
    } finally {
      clearFileInput(specRef);
    }
  }

  async function pickScreen() {
    const f = screenRef.current?.files?.[0];
    if (!f) return;
    if (!confirmReplaceScreens("현재 입력한 화면 정의서를 업로드한 파일에서 추출한 내용으로 대체할까요?")) {
      clearFileInput(screenRef);
      return;
    }
    setExtracting(true);
    try {
      const text = await fileToText(f);
      const res = (await extract({ companyId, text })) as { screenModel?: ScreenSpecDoc };
      if (res?.screenModel && res.screenModel.screens.length > 0) {
        setScreenModel(res.screenModel);
        setScreenFile(f.name);
        setTitleFromFile(f);
        toast({ title: "파일에서 화면 정의서를 채웠습니다.", tone: "success" });
      } else {
        toast({ title: "파일에서 화면 정보를 찾지 못했습니다.", tone: "error" });
      }
    } catch (e) {
      toast({ title: (e as Error).message ?? "추출 실패", tone: "error" });
    } finally {
      setExtracting(false);
      clearFileInput(screenRef);
    }
  }

  function applyScreenTemplate() {
    if (!confirmReplaceScreens("현재 입력한 화면 정의서를 예시 템플릿으로 대체할까요?")) return;
    setScreenModel(exampleScreenDoc());
    setScreenFile("");
  }

  const canSubmit = !!title.trim() && (!!specDoc.trim() || hasContent(screenModel));
  const totalRows = screenModel.screens.reduce(
    (n, s) => n + Object.values(s.tables).reduce((m, rows) => m + rows.length, 0),
    0,
  );

  async function submit() {
    if (!canSubmit) {
      toast({ title: !title.trim() ? "제목을 입력하세요." : "기획서 또는 화면 정의서를 입력하세요.", tone: "error" });
      return;
    }
    setBusy(true);
    try {
      const res = (await create({ companyId, input: { title: title.trim(), specDoc, screenModel } })) as { id?: string };
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
            개발 기획서로 맥락을, 화면 정의서로 각 화면의 구조를 정의하면 동작하는 고충실도 와이어프레임이 생성됩니다.
          </p>

          <section className={cardCls + " mb-5"} style={{ borderRadius: 12, overflow: "hidden" }}>
            <div className={cardHead}>
              <span className="text-sm font-semibold text-foreground">기본</span>
            </div>
            <div className="flex flex-col gap-4 p-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  제목 <span className="text-primary">*</span>
                </span>
                <input className={cls.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 일정 관리 앱 / 재고 대시보드 / 예약 시스템" />
              </label>
              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">개발 기획서</span>
                  <span className="text-xs text-muted-foreground">선택 · 맥락 제공용 자유 문서</span>
                  <span className="flex-1" />
                  <button className={cls.btnSmall} onClick={() => { setSpecDoc(SPEC_TEMPLATE); setSpecFile(""); }}>템플릿</button>
                  <button className={cls.btnSmall} onClick={() => specRef.current?.click()}>파일 올리기</button>
                  {specFile && <span className="max-w-[140px] truncate text-xs text-muted-foreground">{specFile}</span>}
                  <input ref={specRef} type="file" accept=".md,.markdown,.txt,.pdf" className="hidden" onChange={() => void pickSpec()} />
                </div>
                <textarea className={cls.textarea} value={specDoc} onChange={(e) => setSpecDoc(e.target.value)} placeholder={SPEC_TEMPLATE} />
              </div>
            </div>
          </section>

          <section className={cardCls} style={{ borderRadius: 12, overflow: "hidden" }}>
            <div className={cardHead}>
              <span className="text-sm font-semibold text-foreground">화면 정의서</span>
              <span className="text-xs text-muted-foreground">화면별 8섹션 구조</span>
              <span className="flex-1" />
              <button className={cls.btnSmall} onClick={applyScreenTemplate}>템플릿</button>
              <button className={cls.btnSmall} disabled={extracting} onClick={() => screenRef.current?.click()}>{extracting ? "추출 중…" : "파일 올리기"}</button>
              {screenFile && !extracting && <span className="max-w-[140px] truncate text-xs text-muted-foreground">{screenFile}</span>}
              <input ref={screenRef} type="file" accept=".md,.markdown,.txt,.pdf" className="hidden" onChange={() => void pickScreen()} />
            </div>
            <div className="p-4">
              <p className="mb-3 text-xs text-muted-foreground">
                파일을 올리면 내용을 분석해 아래 입력 항목을 자동으로 채웁니다. 화면 탭으로 화면을 전환하고, 자주 쓰는 항목은 펼쳐져 있으며 나머지는 "고급 항목"에 있습니다.
              </p>
              <ScreenSpecEditor value={screenModel} onChange={setScreenModel} />
            </div>
          </section>
        </div>
      </div>

      <div className="flex h-14 shrink-0 items-center gap-3 border-t border-border bg-background px-6">
        <span className="text-sm text-muted-foreground">
          {screenModel.screens.length}개 화면 · {totalRows}개 항목
          {!title.trim() && <span className="ml-2 text-amber-600 dark:text-amber-400">제목을 입력하세요</span>}
        </span>
        <span className="flex-1" />
        {onCancel && <button className={cls.btn} disabled={busy} onClick={onCancel}>취소</button>}
        <button className={cls.btnPrimary} disabled={busy || !canSubmit} onClick={submit}>{busy ? "생성 중…" : "와이어프레임 생성"}</button>
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
          <button key={s} onClick={() => onPick(s)} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent">{s}</button>
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
        <textarea
          rows={1}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          style={{ height: 38 }}
          value={text}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendText(text); } }}
          placeholder="무엇을 바꿀까요?"
        />
        <button
          className={cls.btnPrimary + " shrink-0"}
          disabled={busy || !text.trim()}
          onClick={() => void sendText(text)}
        >
          <ArrowUp size={16} />
          전송
        </button>
      </div>
    </div>
  );
}

function Workspace({ companyId, wf, onRefresh, onNew }: { companyId: string; wf: WireframeRecord; onRefresh: () => void; onNew: () => void }) {
  const trigger = usePluginAction(ACTION.triggerGenerate);
  const toast = usePluginToast();
  const shellRef = useRef<HTMLDivElement>(null);
  const [shellHeight, setShellHeight] = useState<string>();

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (el) setShellHeight(`calc(100vh - ${Math.round(el.getBoundingClientRect().top)}px)`);
  }, []);

  function exportAll() {
    download("기획서.md", wf.specDoc || "", "text/markdown");
    download("화면정의서.md", wf.screenDoc || "", "text/markdown");
    if (wf.html) download("wireframe.html", wf.html, "text/html");
    toast({ title: "기획서·화면 정의서·HTML 다운로드", tone: "success" });
  }

  return (
    <div ref={shellRef} className="-m-4 md:-m-6 flex flex-col" style={{ height: shellHeight }}>
      <header className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
        <button className={cls.btn} onClick={onNew}>← 입력</button>
        <span className="flex-1" />
        <button className={cls.btn} onClick={exportAll}>⬇ Export</button>
        <button
          className={cls.btn}
          disabled={wf.status === "generating"}
          onClick={async () => { await trigger({ companyId, id: wf.id }); onRefresh(); }}
        >
          {wf.status === "generating" ? "생성 중…" : "재생성"}
        </button>
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
  const { data: wf, loading, refresh } = usePluginData<WireframeRecord | null>(DATA.getCurrent, { companyId: cid });
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
    return <InputView companyId={cid} onCreated={() => { setWfCreating(false); void refresh(); }} onCancel={wf ? () => setWfCreating(false) : undefined} />;
  }
  return <Workspace companyId={cid} wf={wf} onRefresh={() => void refresh()} onNew={() => setWfCreating(true)} />;
}
