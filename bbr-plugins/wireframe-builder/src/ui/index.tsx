import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { extractText, getDocumentProxy } from "unpdf";
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

const SPEC_TEMPLATE = `# 개발 기획서

## 목적
(이 제품이 해결하는 문제를 한두 문장으로)

## 주요 기능
- (기능 1)
- (기능 2)
`;

const SCREEN_TEMPLATE = `# 화면설계서

## 화면 목록
| ID | 화면명 | 비고 |
|---------|--------|------|
| SCR-001 | (첫 화면 이름) | 진입 화면 |
| SCR-002 | (다음 화면 이름) | |

## SCR-001 (화면 이름)
- [요소] 위치와 설명을 적는다 (표·차트·캘린더·지도·드래그 등 무엇이든 가능)
- [버튼: 이름] → 누르면 일어나는 동작, 또는 이동할 화면(예: SCR-002)
- (이 화면에 필요한 요소를 자유롭게 기술)

## SCR-002 (화면 이름)
- [버튼: 뒤로] → SCR-001 로 이동

## 플로우
SCR-001 → SCR-002 → SCR-001
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

export function WireframesRouteSidebar(_props: PluginRouteSidebarProps) {
  const nav = useHostNavigation();
  return (
    <div className="flex h-full flex-col text-foreground">
      <button
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent/50 hover:text-foreground"
        onClick={() => nav.navigate("/dashboard")}
      >
        <span aria-hidden>←</span> Dashboard
      </button>
      <div className="px-3 pb-1 pt-3 text-base font-semibold">Wireframe Builder</div>
      <p className="px-3 text-xs text-muted-foreground">개발 기획서·화면설계서로 조작 가능한 와이어프레임을 생성하고 채팅으로 수정합니다.</p>
    </div>
  );
}

function InputView({ companyId, onCreated, onCancel }: { companyId: string; onCreated: () => void; onCancel?: () => void }) {
  const create = usePluginAction(ACTION.createWireframe);
  const trigger = usePluginAction(ACTION.triggerGenerate);
  const toast = usePluginToast();
  const [title, setTitle] = useState("");
  const [specDoc, setSpecDoc] = useState("");
  const [screenDoc, setScreenDoc] = useState("");
  const [specFile, setSpecFile] = useState("");
  const [screenFile, setScreenFile] = useState("");
  const [busy, setBusy] = useState(false);
  const specRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLInputElement>(null);

  async function pick(ref: RefObject<HTMLInputElement | null>, setText: (s: string) => void, setName: (s: string) => void) {
    const f = ref.current?.files?.[0];
    if (!f) return;
    try {
      const t = await fileToText(f);
      setText(t);
      setName(f.name);
      if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
    } catch {
      toast({ title: `${f.name} 읽기 실패`, tone: "error" });
    }
  }

  async function submit() {
    if (!specDoc.trim() && !screenDoc.trim()) {
      toast({ title: "기획서 또는 화면설계서를 입력하세요.", tone: "error" });
      return;
    }
    setBusy(true);
    try {
      const res = (await create({ companyId, input: { title: title.trim() || "와이어프레임", specDoc, screenDoc } })) as { id?: string };
      if (res?.id) await trigger({ companyId, id: res.id });
      onCreated();
    } catch (e) {
      toast({ title: (e as Error).message ?? "생성 실패", tone: "error" });
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <h1 className="mb-1 text-xl font-bold text-foreground">와이어프레임 만들기</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        개발 기획서와 화면설계서를 넣으면 조작 가능한 고충실도 와이어프레임이 생성됩니다. 화면설계서는 "어느 화면의 어디에 어떤 요소가 있고 각 요소가 무슨 동작/이동을 하는지" 적으면 됩니다.
      </p>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-foreground">제목</label>
        <input className={cls.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 일정 관리 앱 / 재고 대시보드 / 예약 시스템" />
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">개발 기획서</span>
          <span className="text-xs text-muted-foreground">.md / .txt / .pdf</span>
          <span className="flex-1" />
          <button className={cls.btnSmall} onClick={() => { setSpecDoc(SPEC_TEMPLATE); setSpecFile(""); }}>템플릿</button>
          <button className={cls.btnSmall} onClick={() => specRef.current?.click()}>파일</button>
          {specFile && <span className="max-w-[160px] truncate text-xs text-muted-foreground">{specFile}</span>}
          <input ref={specRef} type="file" accept=".md,.markdown,.txt,.pdf" className="hidden" onChange={() => void pick(specRef, setSpecDoc, setSpecFile)} />
        </div>
        <textarea className={cls.textarea} value={specDoc} onChange={(e) => setSpecDoc(e.target.value)} placeholder={SPEC_TEMPLATE} />
      </div>

      <div className="mb-5">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">화면설계서</span>
          <span className="text-xs text-muted-foreground">.md / .txt / .pdf</span>
          <span className="flex-1" />
          <button className={cls.btnSmall} onClick={() => { setScreenDoc(SCREEN_TEMPLATE); setScreenFile(""); }}>템플릿</button>
          <button className={cls.btnSmall} onClick={() => screenRef.current?.click()}>파일</button>
          {screenFile && <span className="max-w-[160px] truncate text-xs text-muted-foreground">{screenFile}</span>}
          <input ref={screenRef} type="file" accept=".md,.markdown,.txt,.pdf" className="hidden" onChange={() => void pick(screenRef, setScreenDoc, setScreenFile)} />
        </div>
        <textarea className={cls.textarea} value={screenDoc} onChange={(e) => setScreenDoc(e.target.value)} placeholder={SCREEN_TEMPLATE} />
      </div>

      <div className="flex gap-2">
        <button className={cls.btnPrimary} disabled={busy} onClick={submit}>{busy ? "생성 중…" : "와이어프레임 생성"}</button>
        {onCancel && <button className={cls.btn} disabled={busy} onClick={onCancel}>취소</button>}
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
  const comments = data ?? [];

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => void refresh(), 4000);
    return () => clearInterval(t);
  }, [busy, refresh]);

  useEffect(() => {
    if (!busy) return;
    if (comments.length >= baselineRef.current + 2 && comments[comments.length - 1].authorType !== "user") {
      setBusy(false);
      onRevised();
    }
  }, [comments, busy, onRevised]);

  async function send() {
    const body = text.trim();
    if (!body) return;
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
    <div className="flex shrink-0 flex-col border-l border-border bg-card" style={{ width: 360 }}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
        수정 요청
        {busy && <span className="text-xs font-normal text-amber-600 dark:text-amber-400">· 수정 중…</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">예: "통계 화면에 막대 차트 추가", "목록을 칸반 보드로 바꿔줘"</p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className={
                "rounded-md px-3 py-2 text-sm text-foreground " +
                (c.authorType === "user"
                  ? "bg-primary/10"
                  : c.kind === "revision"
                    ? "bg-emerald-50 dark:bg-emerald-950/40"
                    : "bg-muted")
              }
            >
              <div className="mb-0.5 text-[10px] text-muted-foreground">
                {c.authorType === "user" ? "나" : c.authorType === "assistant" ? (c.kind === "revision" ? "수정됨" : "AI") : "시스템"}
              </div>
              {c.body}
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <input
          className={cls.input + " flex-1"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="수정 요청을 입력하세요"
          disabled={busy}
        />
        <button className={cls.btnPrimary} disabled={busy} onClick={() => void send()}>{busy ? "…" : "전송"}</button>
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
    download("화면설계서.md", wf.screenDoc || "", "text/markdown");
    if (wf.html) download("wireframe.html", wf.html, "text/html");
    toast({ title: "기획서·화면설계서·HTML 다운로드", tone: "success" });
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
        <ChatPanel companyId={companyId} id={wf.id} onRevised={onRefresh} />
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
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (wf?.status !== "generating") return;
    const t = setInterval(() => void refresh(), 4000);
    return () => clearInterval(t);
  }, [wf?.status, refresh]);

  if (loading && !wf) return <div className="px-6 py-16 text-center text-sm text-muted-foreground">불러오는 중…</div>;
  if (creating || !wf) {
    return <InputView companyId={cid} onCreated={() => { setCreating(false); void refresh(); }} onCancel={wf ? () => setCreating(false) : undefined} />;
  }
  return <Workspace companyId={cid} wf={wf} onRefresh={() => void refresh()} onNew={() => setCreating(true)} />;
}
