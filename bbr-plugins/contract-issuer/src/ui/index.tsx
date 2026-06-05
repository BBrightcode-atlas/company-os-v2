import { useEffect, useMemo, useState } from "react";
import {
  useHostContext,
  useHostLocation,
  useHostNavigation,
  usePluginAction,
  usePluginData,
  usePluginStream,
  usePluginToast,
  type PluginPageProps,
  type PluginSidebarProps,
} from "@paperclipai/plugin-sdk/ui";
import {
  ACTION,
  DATA,
  generationChannel,
  commentsChannel,
  isAllowedCompany,
  ALLOWED_COMPANY_PREFIX,
  type ContractInput,
  type ContractRecord,
  type GenerationProgressEvent,
  type QuoteComment,
  type QuoteCommentEvent,
} from "../contract.js";

const won = (n: number | null | undefined) =>
  n == null ? "-" : `${Number(n).toLocaleString("ko-KR")}원`;

// Tailwind 토큰(다크모드 안전) — 인라인 스타일 대신 사용.
const INPUT = "w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-ring";
const LABEL = "mb-1 block text-xs font-semibold text-foreground";
const BTN = "inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50";
const BTN_PRIMARY = "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50";

// ──────────────────────────────────────────────────────────────────────────
// 사이드바 nav 항목 — host SidebarNavItem 과 동일 클래스 + 계약 아이콘.
// ──────────────────────────────────────────────────────────────────────────
const SIDEBAR_ITEM_BASE =
  "flex items-center gap-2.5 px-3 py-2 pointer-coarse:py-1.5 text-[13px] font-medium transition-colors";

export function ContractsSidebarItem({ context }: PluginSidebarProps) {
  const nav = useHostNavigation();
  const loc = useHostLocation();
  if (!isAllowedCompany(context?.companyId, context?.companyPrefix)) return null;
  const active = /(^|\/)contracts(\/|$)/.test(loc.pathname);
  const cls = `${SIDEBAR_ITEM_BASE} ${
    active ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
  }`;
  return (
    <a
      {...nav.linkProps("/contracts")}
      className={cls}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          nav.navigate("/contracts");
        }
      }}
    >
      <span className="relative shrink-0">
        {/* lucide FileSignature (계약/서명) */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M20 19.5v.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7.5L20 8.5" />
          <path d="M14 2v6h6" />
          <path d="M10 18a1 1 0 0 0-1-1 1 1 0 0 0-1 1 4 4 0 0 1-4 4" />
          <path d="M14.5 14.5 18 11l3 3-3.5 3.5a1.4 1.4 0 0 1-2-2Z" />
        </svg>
      </span>
      <span className="flex-1 truncate">계약</span>
    </a>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    analyzing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    analyzed: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const label: Record<string, string> = {
    draft: "초안",
    analyzing: "생성중",
    analyzed: "생성완료",
    published: "발행됨",
    error: "오류",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        tone[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {label[status] ?? status}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 계약 입력 폼 (신규 생성 + 수정 공용)
// ──────────────────────────────────────────────────────────────────────────
const EMPTY_INPUT: ContractInput = {
  contractType: "development",
  gabKind: "business",
  gabCompany: "",
  gabCeo: "",
  gabBizNo: "",
  gabAddress: "",
  gabBirth: "",
  projectName: "",
  projectDesc: "",
  periodStart: "",
  periodEnd: "",
  monthlyAmount: null,
  totalAmount: null,
  payMethod: "split",
  vatMode: "별도",
  jurisdiction: "",
  contractDate: "",
};

function recordToFormInput(r: ContractRecord): ContractInput {
  return {
    contractType: r.contractType,
    gabKind: r.gabKind,
    gabCompany: r.gabCompany,
    gabCeo: r.gabCeo ?? "",
    gabBizNo: r.gabBizNo ?? "",
    gabAddress: r.gabAddress ?? "",
    gabBirth: r.gabBirth ?? "",
    projectName: r.projectName,
    projectDesc: r.projectDesc ?? "",
    periodStart: r.periodStart ?? "",
    periodEnd: r.periodEnd ?? "",
    monthlyAmount: r.monthlyAmount,
    totalAmount: r.totalAmount,
    payMethod: r.payMethod,
    vatMode: r.vatMode,
    jurisdiction: r.jurisdiction ?? "",
    contractDate: r.contractDate ?? "",
  };
}

function ContractForm({
  initial,
  title,
  submitLabel,
  busyLabel,
  onSubmit,
  onCancel,
}: {
  initial: ContractInput;
  title: string;
  submitLabel: string;
  busyLabel: string;
  onSubmit: (input: ContractInput) => Promise<void>;
  onCancel: () => void;
}) {
  const toast = usePluginToast();
  const [form, setForm] = useState<ContractInput>(initial);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<ContractInput>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    if (!form.gabCompany.trim()) {
      toast({ tone: "error", title: "갑(고객사)을 입력하세요." });
      return;
    }
    if (!form.projectName.trim()) {
      toast({ tone: "error", title: "프로젝트/서비스명을 입력하세요." });
      return;
    }
    setBusy(true);
    try {
      await onSubmit(form);
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "저장 실패" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-3 rounded-md border border-border p-4">
      <h3 className="m-0 text-sm font-semibold text-foreground">{title}</h3>

      <div>
        <label className={LABEL}>계약 유형 *</label>
        <select
          className={INPUT}
          value={form.contractType ?? "development"}
          onChange={(e) => set({ contractType: e.target.value as "development" | "maintenance" })}
        >
          <option value="development">개발</option>
          <option value="maintenance">유지보수</option>
        </select>
      </div>

      <div>
        <label className={LABEL}>갑 유형 *</label>
        <select
          className={INPUT}
          value={form.gabKind ?? "business"}
          onChange={(e) => set({ gabKind: e.target.value as "business" | "individual" })}
        >
          <option value="business">사업자 (법인/개인사업자)</option>
          <option value="individual">개인 (사업자 없음)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>{form.gabKind === "individual" ? "갑 성명 *" : "갑 회사명 *"}</label>
          <input className={INPUT} value={form.gabCompany} onChange={(e) => set({ gabCompany: e.target.value })} />
        </div>
        {form.gabKind === "individual" ? (
          <div>
            <label className={LABEL}>갑 생년월일 (선택)</label>
            <input
              className={INPUT}
              placeholder="YYMMDD 또는 YYYY-MM-DD"
              value={form.gabBirth ?? ""}
              onChange={(e) => set({ gabBirth: e.target.value })}
            />
          </div>
        ) : (
          <div>
            <label className={LABEL}>갑 대표자</label>
            <input className={INPUT} value={form.gabCeo ?? ""} onChange={(e) => set({ gabCeo: e.target.value })} />
          </div>
        )}
        {form.gabKind !== "individual" && (
          <div>
            <label className={LABEL}>갑 사업자등록번호</label>
            <input className={INPUT} value={form.gabBizNo ?? ""} onChange={(e) => set({ gabBizNo: e.target.value })} />
          </div>
        )}
        <div>
          <label className={LABEL}>갑 주소</label>
          <input className={INPUT} value={form.gabAddress ?? ""} onChange={(e) => set({ gabAddress: e.target.value })} />
        </div>
      </div>

      <div>
        <label className={LABEL}>프로젝트/서비스명 *</label>
        <input className={INPUT} value={form.projectName} onChange={(e) => set({ projectName: e.target.value })} />
      </div>
      <div>
        <label className={LABEL}>프로젝트 설명 (과업범위 초안용 — AI가 도급업무 항목 작성)</label>
        <textarea
          className={`${INPUT} min-h-[90px] resize-y`}
          value={form.projectDesc ?? ""}
          onChange={(e) => set({ projectDesc: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>계약 시작일</label>
          <input type="date" className={INPUT} value={form.periodStart ?? ""} onChange={(e) => set({ periodStart: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>계약 종료일</label>
          <input
            type="text"
            className={INPUT}
            placeholder='YYYY-MM-DD 또는 "완료시까지"'
            value={form.periodEnd ?? ""}
            onChange={(e) => set({ periodEnd: e.target.value })}
          />
        </div>
        <div>
          <label className={LABEL}>계약일자</label>
          <input type="date" className={INPUT} value={form.contractDate ?? ""} onChange={(e) => set({ contractDate: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>지급방법</label>
          <select
            className={INPUT}
            value={form.payMethod ?? "split"}
            onChange={(e) => set({ payMethod: e.target.value as "split" | "on_completion" | "monthly" })}
          >
            <option value="split">착수금 + 잔금</option>
            <option value="on_completion">완료 시 전액</option>
            <option value="monthly">매월 정기</option>
          </select>
        </div>
        {form.payMethod === "monthly" && (
          <div>
            <label className={LABEL}>월 계약금액(원)</label>
            <input
              type="number"
              className={INPUT}
              value={form.monthlyAmount ?? ""}
              onChange={(e) => set({ monthlyAmount: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        )}
        <div>
          <label className={LABEL}>총 계약금액(원)</label>
          <input
            type="number"
            className={INPUT}
            value={form.totalAmount ?? ""}
            onChange={(e) => set({ totalAmount: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div>
          <label className={LABEL}>VAT</label>
          <select className={INPUT} value={form.vatMode} onChange={(e) => set({ vatMode: e.target.value as "별도" | "포함" })}>
            <option value="별도">별도</option>
            <option value="포함">포함</option>
          </select>
        </div>
      </div>
      <div>
        <label className={LABEL}>관할법원 (선택 — 없으면 갑 본점 소재지)</label>
        <input className={INPUT} value={form.jurisdiction ?? ""} onChange={(e) => set({ jurisdiction: e.target.value })} />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" className={BTN} onClick={onCancel} disabled={busy}>
          취소
        </button>
        <button type="button" className={BTN_PRIMARY} onClick={() => void submit()} disabled={busy}>
          {busy ? busyLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 생성 진행 (스트리밍 미동작 → 안내 + 폴링)
// ──────────────────────────────────────────────────────────────────────────
function GenerationProgress({ companyId, contractId }: { companyId: string; contractId: string }) {
  const stream = usePluginStream<GenerationProgressEvent>(generationChannel(contractId), { companyId });
  const phase = stream.lastEvent?.phase ?? (stream.connecting ? "연결 중" : "대기");
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="spinner" />
        <strong className="text-sm text-foreground">AI 작성 중…</strong>
        <span className="text-xs text-muted-foreground">{phase}</span>
      </div>
      <pre className="m-0 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
        AI가 계약서를 작성/보완하는 중입니다. 완료되면 자동으로 갱신됩니다 (수십 초 소요).
      </pre>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 댓글
// ──────────────────────────────────────────────────────────────────────────
function relTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function mergeComments(base: QuoteComment[], events: QuoteCommentEvent[]): QuoteComment[] {
  const map = new Map<string, QuoteComment>();
  for (const c of base) map.set(c.id, c);
  for (const e of events) {
    if (e._deleted) {
      map.delete(e.id);
      continue;
    }
    const { _deleted, ...c } = e;
    void _deleted;
    map.set(c.id, c);
  }
  return Array.from(map.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function CommentBubble({ c, onDelete }: { c: QuoteComment; onDelete: () => void }) {
  const isAssistant = c.authorType === "assistant";
  const isSystem = c.authorType === "system";
  const isRevision = c.kind === "revision";
  const who = isAssistant ? "AI 작성가" : isSystem ? "시스템" : "운영자";
  const avatarCls = isAssistant
    ? "bg-primary/15 text-primary"
    : isSystem
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-muted text-muted-foreground";
  const bubbleCls = isRevision
    ? "border-primary/30 bg-primary/5"
    : isSystem
      ? "border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20"
      : "border-border bg-background";
  return (
    <div className="group flex gap-2.5">
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarCls}`}>
        {isAssistant ? "AI" : isSystem ? "!" : "U"}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">{who}</span>
          <span className="text-[11px] text-muted-foreground">{relTime(c.createdAt)}</span>
          {!isAssistant && !isSystem && (
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              삭제
            </button>
          )}
        </div>
        <div className={`whitespace-pre-wrap rounded-md border px-3 py-2 text-sm text-foreground ${bubbleCls}`}>
          {c.body}
        </div>
      </div>
    </div>
  );
}

function ContractComments({
  companyId,
  contractId,
  canRefine,
  reloadKey,
  onRefined,
}: {
  companyId: string;
  contractId: string;
  canRefine: boolean;
  reloadKey?: string;
  onRefined: () => void;
}) {
  const { data, refresh } = usePluginData<QuoteComment[]>(DATA.listComments, { companyId, id: contractId });
  const stream = usePluginStream<QuoteCommentEvent>(commentsChannel(contractId), { companyId });
  const addComment = usePluginAction(ACTION.addComment);
  const deleteComment = usePluginAction(ACTION.deleteComment);
  const toast = usePluginToast();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const comments = useMemo(() => mergeComments(data ?? [], stream.events), [data, stream.events]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const lastId = stream.lastEvent?.id;
  useEffect(() => {
    const ev = stream.lastEvent;
    if (ev && (ev.authorType === "assistant" || ev.kind === "revision")) onRefined();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      const res = (await addComment({ companyId, id: contractId, body: text })) as { aiStarted?: boolean };
      setBody("");
      if (res?.aiStarted) onRefined();
      refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "댓글 실패" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteComment({ companyId, id: contractId, commentId: id });
      refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "삭제 실패" });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">댓글 · 보완</div>
      <div className="flex flex-col gap-2.5">
        {comments.length === 0 && (
          <div className="text-sm text-muted-foreground">아직 댓글이 없습니다. 계약서를 보완할 의견을 남겨보세요.</div>
        )}
        {comments.map((c) => (
          <CommentBubble key={c.id} c={c} onDelete={() => void remove(c.id)} />
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-border p-2.5">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            canRefine
              ? "댓글을 남기면 AI가 의도를 파악해 계약서를 보완하거나 답변합니다…"
              : "댓글을 남기세요 (생성 완료 후 AI 보완·답변)…"
          }
          rows={3}
          className={`${INPUT} resize-y`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {canRefine ? "⌘/Ctrl+Enter 로 전송 · AI가 보완 여부를 판단합니다" : "⌘/Ctrl+Enter 로 전송"}
          </span>
          <button type="button" onClick={() => void submit()} disabled={busy || !body.trim()} className={BTN_PRIMARY}>
            {busy ? "전송 중…" : "보내기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 계약 상세
// ──────────────────────────────────────────────────────────────────────────
function ContractDetail({
  companyId,
  contractId,
  autoGenerate,
}: {
  companyId: string;
  contractId: string;
  autoGenerate: boolean;
}) {
  const { data, loading, error, refresh } = usePluginData<ContractRecord>(DATA.getContract, {
    companyId,
    id: contractId,
  });
  const generate = usePluginAction(ACTION.generate);
  const publish = usePluginAction(ACTION.publish);
  const setSeal = usePluginAction(ACTION.setSeal);
  const updateContract = usePluginAction(ACTION.updateContract);
  const toast = usePluginToast();
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [editing, setEditing] = useState(false);

  const runGenerate = async () => {
    setRunning(true);
    try {
      const res = (await generate({ companyId, id: contractId })) as { started: boolean; reason?: string };
      if (res.started) toast({ tone: "success", title: "AI 작성을 시작했습니다…" });
      else toast({ tone: "error", title: res.reason ?? "이미 생성이 진행 중입니다." });
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "생성 실패" });
    } finally {
      setRunning(false);
      refresh();
    }
  };

  useEffect(() => {
    if (autoGenerate && !started) {
      setStarted(true);
      void runGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, started]);

  // streamBus 미연결 → 생성중 폴링.
  useEffect(() => {
    if (data?.status !== "analyzing") return;
    const t = setInterval(() => void refresh(), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status]);

  const doPublish = async () => {
    try {
      await publish({ companyId, id: contractId });
      toast({ tone: "success", title: "발행 완료 — 계약서가 확정되었습니다." });
      refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "발행 실패" });
    }
  };

  const toggleSeal = async (v: boolean) => {
    try {
      await setSeal({ companyId, id: contractId, useSeal: v });
      refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "직인 변경 실패" });
    }
  };

  if (loading && !data) return <div className="text-sm text-muted-foreground">불러오는 중…</div>;
  if (error) return <div className="text-sm text-destructive">오류: {error.message}</div>;
  if (!data) return <div className="text-sm text-muted-foreground">계약 없음</div>;

  // 수정 모드: 폼을 미리채워 보여주고, 저장 시 입력 갱신 + (data 있으면) 직접필드 반영·재렌더.
  if (editing) {
    return (
      <ContractForm
        initial={recordToFormInput(data)}
        title="계약 수정"
        submitLabel="저장 후 재발행"
        busyLabel="저장 중…"
        onSubmit={async (input) => {
          await updateContract({ companyId, id: contractId, input });
          setEditing(false);
          refresh();
          toast({ tone: "success", title: "수정 반영됨" });
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const generating = running || data.status === "analyzing";
  const title = data.projectName || data.gabCompany || "계약";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <strong className="truncate text-sm text-foreground">{title}</strong>
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {data.contractType === "maintenance" ? "유지보수" : "개발"}
          </span>
          <span className="truncate text-xs text-muted-foreground">{data.gabCompany}</span>
          <StatusBadge status={data.status} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} disabled={generating} className={BTN}>
            수정
          </button>
          {(data.status === "draft" || data.status === "error") && (
            <button type="button" onClick={() => void runGenerate()} disabled={generating} className={BTN}>
              {data.status === "error" ? "재생성" : "AI 작성"}
            </button>
          )}
          {data.status === "analyzed" && (
            <button
              type="button"
              onClick={() => void doPublish()}
              className={BTN_PRIMARY}
              title="계약서를 확정 상태로 표시합니다. PDF 는 미리보기의 인쇄/PDF 로 저장하세요."
            >
              발행 확정
            </button>
          )}
        </div>
      </div>

      {data.status === "error" && data.errorMessage && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          생성 오류: {data.errorMessage}
        </div>
      )}

      {generating && <GenerationProgress companyId={companyId} contractId={contractId} />}

      {data.html && (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <strong className="text-[13px] text-foreground">계약서 미리보기</strong>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-foreground" title="을 서명란 '(인)' 위에 법인직인 표시">
                <input type="checkbox" checked={data.useSeal} onChange={(e) => void toggleSeal(e.target.checked)} />
                직인 사용
              </label>
              <button
                type="button"
                className={BTN}
                onClick={() => {
                  const f = document.getElementById("contract-preview") as HTMLIFrameElement | null;
                  // PDF/인쇄 파일명 = 문서 title. iframe·parent 양쪽에 맞춰 robust 하게.
                  const company = (data.gabCompany || "갑").replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
                  const cd = (data.contractDate || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
                  const now = new Date();
                  const yymmdd = cd
                    ? cd[1].slice(2) + cd[2].padStart(2, "0") + cd[3].padStart(2, "0")
                    : String(now.getFullYear()).slice(2) +
                      String(now.getMonth() + 1).padStart(2, "0") +
                      String(now.getDate()).padStart(2, "0");
                  const fname = `도급계약서_${company}_${yymmdd}`.normalize("NFC");
                  const prev = document.title;
                  document.title = fname;
                  f?.contentWindow?.print();
                  window.setTimeout(() => {
                    document.title = prev;
                  }, 1500);
                }}
              >
                인쇄 / PDF
              </button>
            </div>
          </div>
          <iframe
            id="contract-preview"
            title="계약서"
            srcDoc={data.html}
            className="block w-full border-0 border-t border-border bg-white"
            style={{ height: 900 }}
          />
        </div>
      )}

      <ContractComments
        companyId={companyId}
        contractId={contractId}
        canRefine={Boolean(data.data) && data.status !== "analyzing"}
        reloadKey={data.updatedAt}
        onRefined={refresh}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 목록
// ──────────────────────────────────────────────────────────────────────────
function ContractList({
  companyId,
  onOpen,
  onNew,
}: {
  companyId: string;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const { data, loading, error, refresh } = usePluginData<ContractRecord[]>(DATA.listContracts, {
    companyId,
  });
  const deleteContract = usePluginAction(ACTION.deleteContract);
  const toast = usePluginToast();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const confirmRemove = async (c: ContractRecord) => {
    setRemoving(true);
    try {
      await deleteContract({ companyId, id: c.id });
      toast({ tone: "success", title: "삭제됨" });
      setConfirmId(null);
      refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "삭제 실패" });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 px-1 pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">계약</h2>
        <button type="button" onClick={onNew} className={BTN_PRIMARY}>
          + 새 계약
        </button>
      </div>
      {loading && <div className="px-3 py-6 text-sm text-muted-foreground">불러오는 중…</div>}
      {error && <div className="px-3 py-6 text-sm text-destructive">오류: {error.message}</div>}
      {data && data.length === 0 && (
        <div className="px-3 py-12 text-center text-sm text-muted-foreground">아직 계약이 없습니다.</div>
      )}
      {data && data.length > 0 && (
        <div className="flex flex-col">
          <div className="flex items-center gap-3 border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="flex-1">프로젝트</span>
            <span className="w-16 shrink-0">유형</span>
            <span className="w-40 shrink-0">갑(고객)</span>
            <span className="w-20 shrink-0">상태</span>
            <span className="w-32 shrink-0 text-right">총액</span>
            <span className="w-24 shrink-0 text-right">생성일</span>
            <span className="w-6 shrink-0" />
          </div>
          {data.map((c) => (
            <div
              key={c.id}
              className="group flex w-full items-center border-b border-border transition-colors last:border-b-0 hover:bg-accent/50"
            >
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left text-sm"
              >
                <span className="flex-1 truncate font-medium text-foreground">{c.projectName}</span>
                <span className="w-16 shrink-0 truncate text-[11px] text-muted-foreground">
                  {c.contractType === "maintenance" ? "유지보수" : "개발"}
                </span>
                <span className="w-40 shrink-0 truncate text-muted-foreground">{c.gabCompany}</span>
                <span className="w-20 shrink-0">
                  <StatusBadge status={c.status} />
                </span>
                <span className="w-32 shrink-0 text-right tabular-nums text-foreground">{won(c.totalAmount)}</span>
                <span className="w-24 shrink-0 text-right text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </button>
              {confirmId === c.id ? (
                <div className="flex shrink-0 items-center gap-1.5 pr-2 text-xs">
                  <span className="text-muted-foreground">삭제?</span>
                  <button
                    type="button"
                    onClick={() => void confirmRemove(c)}
                    disabled={removing}
                    className="rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                  >
                    확인
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    disabled={removing}
                    className="rounded-md border border-border px-2 py-1 text-xs text-foreground transition-colors hover:bg-accent"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(c.id)}
                  title="삭제"
                  aria-label="삭제"
                  className="mr-1 flex w-6 shrink-0 items-center justify-center self-stretch text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// pathname 에서 "/contracts" 뒤 첫 세그먼트 추출. "" | "new" | "<id>".
function contractsSubPath(pathname: string): string {
  const m = pathname.match(/\/contracts(?:\/([^/?#]*))?/);
  return (m?.[1] ?? "").trim();
}

export function ContractsPage(props: PluginPageProps) {
  const host = useHostContext();
  const nav = useHostNavigation();
  const loc = useHostLocation();
  const createContract = usePluginAction(ACTION.createContract);
  const companyId = props.context?.companyId ?? host.companyId ?? null;

  if (!companyId) {
    return (
      <div className="text-sm text-muted-foreground">
        회사 컨텍스트가 필요합니다. 회사를 선택한 뒤 다시 열어주세요.
      </div>
    );
  }

  const companyPrefix = props.context?.companyPrefix ?? host.companyPrefix ?? null;
  if (!isAllowedCompany(companyId, companyPrefix)) {
    return (
      <div className="text-sm text-muted-foreground">
        이 플러그인(계약서 발행)은 {ALLOWED_COMPANY_PREFIX} 회사 전용입니다.
      </div>
    );
  }

  const sub = contractsSubPath(loc.pathname);
  const autoGenerate = new URLSearchParams(loc.search || "").get("auto") === "1";

  return (
    <div className="text-sm text-foreground">
      {sub === "" && (
        <ContractList
          companyId={companyId}
          onOpen={(id) => nav.navigate(`/contracts/${id}`)}
          onNew={() => nav.navigate("/contracts/new")}
        />
      )}
      {sub === "new" && (
        <ContractForm
          initial={EMPTY_INPUT}
          title="새 계약 (도급계약서)"
          submitLabel="생성 후 AI 작성"
          busyLabel="생성 중…"
          onSubmit={async (input) => {
            const res = (await createContract({ companyId, input })) as { id: string };
            nav.navigate(`/contracts/${res.id}?auto=1`);
          }}
          onCancel={() => nav.navigate("/contracts")}
        />
      )}
      {sub !== "" && sub !== "new" && (
        <ContractDetail companyId={companyId} contractId={sub} autoGenerate={autoGenerate} />
      )}
    </div>
  );
}
