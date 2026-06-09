import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { extractText, getDocumentProxy } from "unpdf";
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
  analysisChannel,
  commentsChannel,
  isAllowedCompany,
  ALLOWED_COMPANY_PREFIX,
  type AnalysisProgressEvent,
  type AnalysisResult,
  type QuoteComment,
  type QuoteCommentEvent,
  type QuoteInput,
  type QuoteRecord,
  type RateSheetRow,
  type ReferenceDoc,
} from "../contract.js";

type QuoteListRow = QuoteRecord & { total: number | null };

const won = (n: number | null | undefined) =>
  n == null ? "-" : `${Number(n).toLocaleString("ko-KR")}원`;

// 사이드바 nav 항목 — host SidebarNavItem 과 동일 클래스/구조로 inline 렌더.
// 네이티브 메뉴(Issues/Routines/Goals)와 시각·active 일관성 확보.
const SIDEBAR_ITEM_BASE =
  "flex items-center gap-2.5 px-3 py-2 pointer-coarse:py-1.5 text-[13px] font-medium transition-colors";

export function QuotesSidebarItem({ context }: PluginSidebarProps) {
  const nav = useHostNavigation();
  const loc = useHostLocation();
  // BBR 전용 — 다른 회사 사이드바엔 표시하지 않는다.
  if (!isAllowedCompany(context?.companyId, context?.companyPrefix)) return null;
  // /quotes 및 /quotes/* (상세·신규) 전부에서 active 유지.
  const active = /(^|\/)quotes(\/|$)/.test(loc.pathname);
  const cls = `${SIDEBAR_ITEM_BASE} ${
    active
      ? "bg-accent text-foreground"
      : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
  }`;
  return (
    <a
      {...nav.linkProps("/quotes")}
      className={cls}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        // plain 좌클릭은 SPA navigate, modifier/미들클릭은 브라우저 기본(href) 유지.
        if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          nav.navigate("/quotes");
        }
      }}
    >
      <span className="relative shrink-0">
        {/* lucide ReceiptText (견적/영수증) */}
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
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M14 8H8" />
          <path d="M16 12H8" />
          <path d="M13 16H8" />
        </svg>
      </span>
      <span className="flex-1 truncate">견적</span>
    </a>
  );
}

const C = {
  page: { padding: "1.25rem", fontFamily: "inherit", color: "inherit" } as const,
  row: { display: "flex", gap: "0.5rem", alignItems: "center" } as const,
  btn: {
    padding: "0.4rem 0.8rem",
    border: "1px solid var(--border, #cfd5dd)",
    borderRadius: 6,
    background: "var(--surface, #fff)",
    cursor: "pointer",
    fontSize: 13,
  } as const,
  btnPrimary: {
    padding: "0.45rem 0.9rem",
    border: "1px solid #182235",
    borderRadius: 6,
    background: "#182235",
    color: "#fff",
    cursor: "pointer",
    fontSize: 13,
  } as const,
  input: {
    width: "100%",
    padding: "0.5rem 0.6rem",
    border: "1px solid var(--border, #cfd5dd)",
    borderRadius: 6,
    fontSize: 13,
    boxSizing: "border-box" as const,
  },
  label: { fontSize: 12, fontWeight: 700, marginBottom: 4, display: "block" } as const,
  card: {
    border: "1px solid var(--border, #cfd5dd)",
    borderRadius: 8,
    padding: "0.8rem",
  } as const,
};

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
    analyzing: "분석중",
    analyzed: "분석완료",
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

// ---- 신규 견적 입력 폼 ----
function NewQuoteForm({
  companyId,
  onCreated,
  onCancel,
}: {
  companyId: string;
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const createQuote = usePluginAction(ACTION.createQuote);
  const toast = usePluginToast();
  const [form, setForm] = useState<QuoteInput>({
    clientName: "",
    requirements: "",
    workScope: "",
    expectedPrice: null,
    platform: "",
    vatMode: "별도",
    enableWebResearch: true,
    referenceDocs: [],
  });
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const set = (patch: Partial<QuoteInput>) => setForm((f) => ({ ...f, ...patch }));

  // 업로드한 파일을 클라이언트에서 텍스트로 추출한다.
  // md/txt/markdown 은 그대로, PDF 는 unpdf(serverless pdfjs, worker 불필요)로 텍스트만 뽑는다.
  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setParsing(true);
    try {
      const out: ReferenceDoc[] = [];
      for (const file of Array.from(files)) {
        const name = file.name;
        const lower = name.toLowerCase();
        let text = "";
        try {
          if (lower.endsWith(".pdf")) {
            const buf = new Uint8Array(await file.arrayBuffer());
            const pdf = await getDocumentProxy(buf);
            const r = await extractText(pdf, { mergePages: true });
            text = Array.isArray(r.text) ? r.text.join("\n") : String(r.text ?? "");
          } else {
            // md / txt / markdown 등 텍스트 파일
            text = await file.text();
          }
        } catch (pe) {
          toast({
            tone: "error",
            title: `${name}: 텍스트 추출 실패 — ${pe instanceof Error ? pe.message : "알 수 없는 오류"}`,
          });
          continue;
        }
        // Postgres text/jsonb 가 거부하는 NUL/제어문자 제거(개행·탭·CR 보존).
        // eslint-disable-next-line no-control-regex
        text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
        if (text.length === 0) {
          toast({ tone: "error", title: `${name}: 추출된 텍스트가 비어 있습니다.` });
          continue;
        }
        out.push({ filename: name, text });
      }
      if (out.length > 0) {
        setForm((f) => ({ ...f, referenceDocs: [...(f.referenceDocs ?? []), ...out] }));
        toast({ tone: "success", title: `${out.length}개 자료 첨부됨` });
      }
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = ""; // 같은 파일 재선택 허용
    }
  };

  const removeDoc = (idx: number) =>
    setForm((f) => ({ ...f, referenceDocs: (f.referenceDocs ?? []).filter((_, i) => i !== idx) }));

  const submit = async () => {
    if (!form.clientName.trim()) {
      toast({ tone: "error", title: "고객사를 입력하세요." });
      return;
    }
    setBusy(true);
    try {
      const res = (await createQuote({ companyId, input: form })) as { id: string };
      onCreated(res.id);
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "생성 실패" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...C.card, display: "grid", gap: "0.75rem", maxWidth: 720 }}>
      <h3 style={{ margin: 0 }}>새 견적 요청</h3>
      <div>
        <label style={C.label}>고객사 *</label>
        <input style={C.input} value={form.clientName} onChange={(e) => set({ clientName: e.target.value })} />
      </div>
      <div>
        <label style={C.label}>고객 요구사항 (스토리보드/요건)</label>
        <textarea
          style={{ ...C.input, minHeight: 90, resize: "vertical" }}
          value={form.requirements}
          onChange={(e) => set({ requirements: e.target.value })}
        />
      </div>
      <div>
        <label style={C.label}>참고 자료 (요구사항 문서 · md / txt / PDF)</label>
        <div style={{ ...C.row, flexWrap: "wrap" as const }}>
          <label style={{ ...C.btn, display: "inline-flex", alignItems: "center", gap: 6 }}>
            {parsing ? "추출 중…" : "+ 파일 첨부"}
            <input
              ref={fileRef}
              type="file"
              accept=".md,.markdown,.txt,.text,.pdf,text/markdown,text/plain,application/pdf"
              multiple
              disabled={parsing || busy}
              onChange={(e) => void onFiles(e.target.files)}
              style={{ display: "none" }}
            />
          </label>
          <span style={{ fontSize: 12, color: "var(--muted-foreground, #6b7280)" }}>
            업로드 시 텍스트만 추출해 분석에 참고합니다(원본 파일 미보관).
          </span>
        </div>
        {(form.referenceDocs?.length ?? 0) > 0 && (
          <div style={{ display: "grid", gap: 4, marginTop: 6 }}>
            {(form.referenceDocs ?? []).map((d, i) => (
              <div
                key={`${d.filename}-${i}`}
                style={{
                  ...C.row,
                  justifyContent: "space-between",
                  fontSize: 12,
                  border: "1px solid var(--border, #cfd5dd)",
                  borderRadius: 6,
                  padding: "0.3rem 0.5rem",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  📄 {d.filename}{" "}
                  <span style={{ color: "var(--muted-foreground, #6b7280)" }}>
                    ({d.text.length.toLocaleString("ko-KR")}자)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeDoc(i)}
                  style={{ ...C.btn, padding: "0.15rem 0.5rem" }}
                  disabled={busy}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <label style={C.label}>업무 내용</label>
        <textarea
          style={{ ...C.input, minHeight: 70, resize: "vertical" }}
          value={form.workScope}
          onChange={(e) => set({ workScope: e.target.value })}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
        <div>
          <label style={C.label}>예상 가격(원, 참고)</label>
          <input
            style={C.input}
            type="number"
            value={form.expectedPrice ?? ""}
            onChange={(e) => set({ expectedPrice: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div>
          <label style={C.label}>플랫폼</label>
          <input
            style={C.input}
            placeholder="iOS/Android, PWA…"
            value={form.platform ?? ""}
            onChange={(e) => set({ platform: e.target.value })}
          />
        </div>
        <div>
          <label style={C.label}>VAT</label>
          <select
            style={C.input}
            value={form.vatMode}
            onChange={(e) => set({ vatMode: e.target.value as "별도" | "포함" })}
          >
            <option value="별도">별도</option>
            <option value="포함">포함</option>
          </select>
        </div>
      </div>
      <label style={{ ...C.row, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={form.enableWebResearch ?? true}
          onChange={(e) => set({ enableWebResearch: e.target.checked })}
        />
        웹 리서치로 경쟁 시세 보정
      </label>
      <div style={{ ...C.row, justifyContent: "flex-end" }}>
        <button style={C.btn} onClick={onCancel} disabled={busy}>
          취소
        </button>
        <button style={C.btnPrimary} onClick={() => void submit()} disabled={busy}>
          {busy ? "생성 중…" : "생성 후 분석 시작"}
        </button>
      </div>
    </div>
  );
}

// ---- 분석 진행 (스트리밍) ----
function AnalysisProgress({ companyId, quoteId }: { companyId: string; quoteId: string }) {
  const stream = usePluginStream<AnalysisProgressEvent>(analysisChannel(quoteId), {
    companyId,
  });
  const text = useMemo(
    () =>
      stream.events
        .filter((e) => e.phase === "stream")
        .map((e) => e.message)
        .join(""),
    [stream.events],
  );
  const phase = stream.lastEvent?.phase ?? (stream.connecting ? "연결 중" : "대기");
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="spinner" />
        <strong className="text-sm text-foreground">분석 진행 중…</strong>
        <span className="text-xs text-muted-foreground">{phase}</span>
      </div>
      <pre className="m-0 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
        {text || "AI가 견적을 분석/보완하는 중입니다. 완료되면 자동으로 갱신됩니다 (수십 초 소요)."}
      </pre>
    </div>
  );
}

// ---- 리스크 카드 ----
function RiskList({ analysis }: { analysis: AnalysisResult }) {
  const bar: Record<string, string> = {
    high: "border-l-red-500",
    med: "border-l-orange-500",
    low: "border-l-muted-foreground",
  };
  const lv: Record<string, string> = {
    high: "text-red-600 dark:text-red-400",
    med: "text-orange-600 dark:text-orange-400",
    low: "text-muted-foreground",
  };
  if (!analysis.risks?.length) return null;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <strong className="text-sm text-foreground">리스크</strong>
      {analysis.risks.map((r, i) => (
        <div key={i} className={`border-l-[3px] pl-2 ${bar[r.level] ?? "border-l-muted-foreground"}`}>
          <div className="text-[13px] font-bold text-foreground">
            <span className={lv[r.level] ?? "text-muted-foreground"}>[{r.level}]</span> {r.title}
          </div>
          <div className="text-xs text-muted-foreground">{r.detail}</div>
          <div className="text-xs text-green-600 dark:text-green-400">↳ {r.mitigation}</div>
        </div>
      ))}
    </div>
  );
}

// ---- 단가 산정표 (이 견적의 산정 근거: standardItems + 할인 + 합계) ----
function QuoteBreakdownCard({ analysis }: { analysis: AnalysisResult }) {
  const items = analysis.standardItems ?? [];
  if (!items.length) return null;
  const p = analysis.pricing;
  const th = "border-b border-border px-2 py-1.5 text-left text-[11px] font-medium text-muted-foreground";
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="border-b border-border px-3 py-2 text-[13px] font-semibold text-foreground">
        단가 산정표 (산정 근거)
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={th} style={{ width: 36 }}>No</th>
              <th className={th} style={{ width: 130 }}>대분류</th>
              <th className={th}>산정 항목</th>
              <th className={th}>범위 근거</th>
              <th className={th}>스토리보드/요건 근거</th>
              <th className={`${th} text-right`} style={{ width: 110 }}>표준 단가</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.no} className="border-b border-border align-top last:border-0">
                <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{it.no}</td>
                <td className="px-2 py-1.5 font-medium text-foreground">{it.category}</td>
                <td className="px-2 py-1.5 text-foreground">{it.item}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{it.scopeBasis}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{it.evidence}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-foreground">{won(it.standardPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-1 border-t border-border px-3 py-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">표준 산정 공급가</span>
          <span className="tabular-nums text-foreground">{won(p.standardSupply)}</span>
        </div>
        {(analysis.discounts ?? []).map((d, i) => (
          <div key={i} className="flex justify-between gap-3">
            <span className="text-muted-foreground">
              {d.type}
              {d.desc ? <span className="text-muted-foreground/70"> · {d.desc}</span> : null}
            </span>
            <span className="shrink-0 tabular-nums text-red-600 dark:text-red-400">{won(d.adjust)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-1 font-medium">
          <span className="text-foreground">할인 반영 제안가(공급가)</span>
          <span className="tabular-nums text-foreground">{won(p.proposedSupply)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">VAT ({p.vatMode})</span>
          <span className="tabular-nums text-foreground">{won(p.vat)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-foreground">총계</span>
          <span className="tabular-nums text-foreground">{won(p.total)}</span>
        </div>
        {p.contractTerms ? (
          <div className="pt-1 text-[11px] text-muted-foreground">※ {p.contractTerms}</div>
        ) : null}
      </div>
    </div>
  );
}

// ---- 유사 사례 (cases) ----
function CasesCard({ analysis }: { analysis: AnalysisResult }) {
  const cases = analysis.cases ?? [];
  if (!cases.length) return null;
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="border-b border-border px-3 py-2 text-[13px] font-semibold text-foreground">
        유사 프로젝트 사례
      </div>
      <div className="flex flex-col">
        {cases.map((cs, i) => (
          <div key={i} className="flex items-start justify-between gap-3 border-b border-border px-3 py-2 text-xs last:border-0">
            <div className="min-w-0">
              <div className="font-medium text-foreground">{cs.client}</div>
              <div className="text-muted-foreground">{cs.similarity}</div>
            </div>
            <div className="shrink-0 tabular-nums font-medium text-foreground">{won(cs.amount)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- 시세 리서치 (research) ----
function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function buildResearchDoc(research: AnalysisResult["research"], clientName: string): string {
  const rows = (research ?? [])
    .map((r) => {
      const link = r.url ? `<a href="${escHtml(r.url)}">${escHtml(r.url)}</a>` : "-";
      return `<tr><td>${escHtml(r.source)}</td><td>${escHtml(r.projectName ?? "-")}</td><td class="num">${escHtml(r.priceRange ?? "-")}</td><td class="num">${escHtml(r.headcount ?? "-")}</td><td class="num">${escHtml(r.period ?? "-")}</td><td>${escHtml(r.insight ?? "-")}</td><td class="lnk">${link}</td></tr>`;
    })
    .join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>시세·시장 리서치 - ${escHtml(clientName)}</title><style>
@page{size:A4 landscape;margin:12mm}
*{box-sizing:border-box}
body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;color:#111;font-size:11px;margin:0}
h1{font-size:16px;margin:0 0 4px}
.sub{color:#555;font-size:11px;margin:0 0 10px}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{border:1px solid #333;padding:5px 6px;vertical-align:top;text-align:left;word-break:break-word}
th{background:#f2f2f2;font-weight:700;white-space:nowrap}
td.num{white-space:nowrap}
td.lnk a{color:#06c;text-decoration:underline}
col.c-src{width:8%}col.c-name{width:24%}col.c-amt{width:13%}col.c-hc{width:9%}col.c-pd{width:9%}col.c-detail{width:25%}col.c-lnk{width:12%}
</style></head><body>
<h1>시세 · 시장 리서치</h1>
<p class="sub">${escHtml(clientName)} 견적 참고 · 출처: 위시켓 / 프리모아 / 원티드긱스</p>
<table><colgroup><col class="c-src"><col class="c-name"><col class="c-amt"><col class="c-hc"><col class="c-pd"><col class="c-detail"><col class="c-lnk"></colgroup>
<thead><tr><th>출처</th><th>프로젝트명</th><th>견적금액</th><th>투입인원</th><th>기간</th><th>상세내용</th><th>링크</th></tr></thead>
<tbody>${rows}</tbody></table></body></html>`;
}
function ResearchCard({ analysis, clientName }: { analysis: AnalysisResult; clientName: string }) {
  const research = analysis.research ?? [];
  if (!research.length) return null;
  const doc = buildResearchDoc(research, clientName);
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-[13px] font-semibold text-foreground">시세 · 시장 리서치</span>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          onClick={() => {
            const f = document.getElementById("research-print") as HTMLIFrameElement | null;
            f?.contentWindow?.focus();
            f?.contentWindow?.print();
          }}
        >
          표 인쇄 / PDF
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th className="px-2 py-1.5 font-medium">출처</th>
              <th className="px-2 py-1.5 font-medium">프로젝트명</th>
              <th className="px-2 py-1.5 font-medium">견적금액</th>
              <th className="px-2 py-1.5 font-medium">투입인원</th>
              <th className="px-2 py-1.5 font-medium">기간</th>
              <th className="px-2 py-1.5 font-medium">상세내용</th>
              <th className="px-2 py-1.5 font-medium">링크</th>
            </tr>
          </thead>
          <tbody>
            {research.map((r, i) => (
              <tr key={i} className="border-b border-border align-top last:border-0">
                <td className="px-2 py-1.5 text-foreground">{r.source}</td>
                <td className="px-2 py-1.5 text-foreground">{r.projectName ?? "-"}</td>
                <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{r.priceRange ?? "-"}</td>
                <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{r.headcount ?? "-"}</td>
                <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{r.period ?? "-"}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{r.insight}</td>
                <td className="px-2 py-1.5">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="underline decoration-dotted hover:text-primary">
                      열기
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <iframe
        id="research-print"
        title="시세 리서치 인쇄"
        srcDoc={doc}
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0, border: 0, left: -9999, top: -9999 }}
      />
    </div>
  );
}

// ---- 범위 (scope) ----
function ScopeCard({ analysis }: { analysis: AnalysisResult }) {
  const s = analysis.scope;
  if (!s) return null;
  const groups: Array<{ title: string; items: string[]; tone: string }> = [
    { title: "포함", items: s.included ?? [], tone: "text-green-600 dark:text-green-400" },
    { title: "제외", items: s.excluded ?? [], tone: "text-red-600 dark:text-red-400" },
    { title: "전제", items: s.assumptions ?? [], tone: "text-muted-foreground" },
    { title: "외부 비용/의존", items: s.externalCosts ?? [], tone: "text-orange-600 dark:text-orange-400" },
  ].filter((g) => g.items.length > 0);
  if (!groups.length) return null;
  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-2 text-[13px] font-semibold text-foreground">범위 / 전제</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.title}>
            <div className={`mb-1 text-xs font-medium ${g.tone}`}>{g.title}</div>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((it, i) => (
                <li key={i} className="text-xs text-muted-foreground">· {it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- 댓글 유틸 ----
function relTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 초기 목록 + 실시간 스트림 이벤트 병합(id 기준 dedupe, tombstone 제거, 시간순 정렬).
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
  const who = isAssistant ? "AI 분석가" : isSystem ? "시스템" : "운영자";
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
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarCls}`}
      >
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
        <div
          className={`whitespace-pre-wrap rounded-md border px-3 py-2 text-sm text-foreground ${bubbleCls}`}
        >
          {c.body}
        </div>
      </div>
    </div>
  );
}

// ---- 댓글 스레드 + 보완 컴포저 ----
function QuoteComments({
  companyId,
  quoteId,
  canRefine,
  reloadKey,
  onRefined,
}: {
  companyId: string;
  quoteId: string;
  canRefine: boolean;
  reloadKey?: string;
  onRefined: () => void;
}) {
  const { data, refresh } = usePluginData<QuoteComment[]>(DATA.listComments, {
    companyId,
    id: quoteId,
  });
  const stream = usePluginStream<QuoteCommentEvent>(commentsChannel(quoteId), { companyId });
  const addComment = usePluginAction(ACTION.addComment);
  const deleteComment = usePluginAction(ACTION.deleteComment);
  const toast = usePluginToast();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const comments = useMemo(() => mergeComments(data ?? [], stream.events), [data, stream.events]);

  // 상위 견적이 갱신될 때(특히 보완 완료로 updatedAt 변경) 댓글 목록도 새로고침해
  // assistant 보완 댓글이 SSE 없이도 나타나게 한다(이 host 빌드는 streamBus 미연결).
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  // assistant/revision 댓글 도착 시 상위 견적 데이터 새로고침(분석/금액/미리보기 갱신).
  const lastId = stream.lastEvent?.id;
  useEffect(() => {
    const ev = stream.lastEvent;
    if (ev && (ev.authorType === "assistant" || ev.kind === "revision")) {
      onRefined();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      const res = (await addComment({ companyId, id: quoteId, body: text })) as {
        aiStarted?: boolean;
      };
      setBody("");
      // AI 처리가 시작되면 status→analyzing 이 되므로 상위 견적을 갱신해 진행 표시를 띄운다.
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
      await deleteComment({ companyId, id: quoteId, commentId: id });
      refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "삭제 실패" });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        댓글 · 보완
      </div>
      <div className="flex flex-col gap-2.5">
        {comments.length === 0 && (
          <div className="text-sm text-muted-foreground">
            아직 댓글이 없습니다. 견적을 보완할 의견을 남겨보세요.
          </div>
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
              ? "댓글을 남기면 AI가 의도를 파악해 견적을 보완하거나 답변합니다…"
              : "댓글을 남기세요 (분석 완료 후 AI 보완·답변)…"
          }
          rows={3}
          className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-ring"
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
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !body.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "전송 중…" : "보내기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- 견적 상세 ----
function QuoteDetail({
  companyId,
  quoteId,
  autoAnalyze,
}: {
  companyId: string;
  quoteId: string;
  autoAnalyze: boolean;
}) {
  const { data, loading, error, refresh } = usePluginData<QuoteRecord>(DATA.getQuote, {
    companyId,
    id: quoteId,
  });
  const triggerAnalysis = usePluginAction(ACTION.triggerAnalysis);
  const publish = usePluginAction(ACTION.publish);
  const toast = usePluginToast();
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);

  const runAnalysis = async () => {
    setRunning(true);
    try {
      const res = (await triggerAnalysis({ companyId, id: quoteId })) as {
        started: boolean;
        reason?: string;
      };
      if (res.started) toast({ tone: "success", title: "분석을 시작했습니다…" });
      else toast({ tone: "error", title: res.reason ?? "이미 분석이 진행 중입니다." });
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "분석 실패" });
    } finally {
      setRunning(false);
      refresh();
    }
  };

  // 신규 생성 직후 자동 분석 1회
  useEffect(() => {
    if (autoAnalyze && !started) {
      setStarted(true);
      void runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyze, started]);

  // 이 host 빌드는 plugin SSE(streamBus)가 미연결이라 실시간 푸시가 동작하지 않는다.
  // 분석/보완이 진행 중(status=analyzing)일 때 폴링으로 결과·댓글을 자동 반영한다.
  useEffect(() => {
    if (data?.status !== "analyzing") return;
    const t = setInterval(() => void refresh(), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.status]);

  const doPublish = async () => {
    try {
      await publish({ companyId, id: quoteId });
      toast({ tone: "success", title: "발행 완료 — 견적이 확정되었습니다." });
      refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "발행 실패" });
    }
  };

  if (loading && !data) return <div className="text-sm text-muted-foreground">불러오는 중…</div>;
  if (error) return <div className="text-sm text-destructive">오류: {error.message}</div>;
  if (!data) return <div className="text-sm text-muted-foreground">견적 없음</div>;

  const analyzing = running || data.status === "analyzing";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <strong className="truncate text-sm text-foreground">{data.clientName}</strong>
          <StatusBadge status={data.status} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {data.status === "error" && (
            <button
              type="button"
              onClick={() => void runAnalysis()}
              disabled={analyzing}
              className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              재분석
            </button>
          )}
          {(data.status === "analyzed" || data.status === "published") && (
            <button
              type="button"
              onClick={() => void runAnalysis()}
              disabled={analyzing}
              className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              title="현재 등록된 요구사항·첨부 자료·단가 산정표로 견적을 다시 계산합니다."
            >
              재산정
            </button>
          )}
          {data.status === "analyzed" && (
            <button
              type="button"
              onClick={() => void doPublish()}
              className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              title="견적을 확정 상태로 표시합니다. PDF 는 미리보기의 인쇄/PDF 로 저장하세요."
            >
              발행 확정
            </button>
          )}
        </div>
      </div>

      {data.status === "error" && data.errorMessage && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          분석 오류: {data.errorMessage}
        </div>
      )}

      {data.referenceDocs?.length > 0 && (
        <div className="rounded-md border border-border p-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            참고 자료 ({data.referenceDocs.length})
          </div>
          <ul className="flex flex-col gap-0.5">
            {data.referenceDocs.map((d, i) => (
              <li key={`${d.filename}-${i}`} className="text-xs text-foreground">
                📄 {d.filename}{" "}
                <span className="text-muted-foreground">
                  ({d.text.length.toLocaleString("ko-KR")}자)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analyzing && <AnalysisProgress companyId={companyId} quoteId={quoteId} />}

      {data.analysis && (
        <>
          <RiskList analysis={data.analysis} />
          {data.html && (
            <div className="overflow-hidden rounded-md border border-border">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <strong className="text-[13px] text-foreground">견적서 미리보기</strong>
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  onClick={() => {
                    const f = document.getElementById("quote-preview") as HTMLIFrameElement | null;
                    f?.contentWindow?.print();
                  }}
                >
                  인쇄 / PDF
                </button>
              </div>
              <iframe
                id="quote-preview"
                title="견적서"
                srcDoc={data.html}
                className="block w-full border-0 border-t border-border bg-white"
                style={{ height: 720 }}
              />
            </div>
          )}
          <QuoteBreakdownCard analysis={data.analysis} />
          <CasesCard analysis={data.analysis} />
          <ResearchCard analysis={data.analysis} clientName={data.clientName} />
          <ScopeCard analysis={data.analysis} />
        </>
      )}

      <QuoteComments
        companyId={companyId}
        quoteId={quoteId}
        canRefine={Boolean(data.analysis) && data.status !== "analyzing"}
        reloadKey={data.updatedAt}
        onRefined={refresh}
      />
    </div>
  );
}

// ---- 목록 ----
function QuoteList({
  companyId,
  onOpen,
  onNew,
  onRates,
}: {
  companyId: string;
  onOpen: (id: string) => void;
  onNew: () => void;
  onRates: () => void;
}) {
  const { data, loading, error } = usePluginData<QuoteListRow[]>(DATA.listQuotes, { companyId });
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 px-1 pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">견적</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRates}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            단가 산정표
          </button>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            + 새 견적
          </button>
        </div>
      </div>
      {loading && <div className="px-3 py-6 text-sm text-muted-foreground">불러오는 중…</div>}
      {error && <div className="px-3 py-6 text-sm text-destructive">오류: {error.message}</div>}
      {data && data.length === 0 && (
        <div className="px-3 py-12 text-center text-sm text-muted-foreground">아직 견적이 없습니다.</div>
      )}
      {data && data.length > 0 && (
        <div className="flex flex-col">
          <div className="flex items-center gap-3 border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="flex-1">고객사</span>
            <span className="w-20 shrink-0">상태</span>
            <span className="w-32 shrink-0 text-right">총액</span>
            <span className="w-24 shrink-0 text-right">생성일</span>
          </div>
          {data.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => onOpen(q.id)}
              className="group flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-accent/50"
            >
              <span className="flex-1 truncate font-medium text-foreground">{q.clientName}</span>
              <span className="w-20 shrink-0">
                <StatusBadge status={q.status} />
              </span>
              <span className="w-32 shrink-0 text-right tabular-nums text-foreground">{won(q.total)}</span>
              <span className="w-24 shrink-0 text-right text-muted-foreground">
                {new Date(q.createdAt).toLocaleDateString("ko-KR")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- 단가 산정표 (편집 가능 데이터 시트) ----
type EditableRate = RateSheetRow & { _k: string };

function RateSheetPage({ companyId, onBack }: { companyId: string; onBack: () => void }) {
  const { data, loading, error, refresh } = usePluginData<RateSheetRow[]>(DATA.rateSheet, { companyId });
  const upsertRate = usePluginAction(ACTION.upsertRate);
  const deleteRate = usePluginAction(ACTION.deleteRate);
  const resetRateSheet = usePluginAction(ACTION.resetRateSheet);
  const toast = usePluginToast();
  const [rows, setRows] = useState<EditableRate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (data) setRows(data.map((r) => ({ ...r, _k: r.id })));
  }, [data]);

  const patch = (k: string, p: Partial<RateSheetRow>) =>
    setRows((rs) => rs.map((r) => (r._k === k ? { ...r, ...p } : r)));

  const save = async (r: EditableRate) => {
    if (!r.category.trim()) {
      toast({ tone: "error", title: "대분류를 입력하세요." });
      return;
    }
    setBusy(r._k);
    try {
      await upsertRate({
        companyId,
        id: r.id || undefined,
        category: r.category,
        item: r.item,
        scopeBasis: r.scopeBasis,
        standardPrice: r.standardPrice,
        note: r.note ?? "",
        sortOrder: r.sortOrder,
      });
      toast({ tone: "success", title: "저장됨" });
      await refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "저장 실패" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (r: EditableRate) => {
    if (!r.id) {
      setRows((rs) => rs.filter((x) => x._k !== r._k));
      return;
    }
    setBusy(r._k);
    try {
      await deleteRate({ companyId, id: r.id });
      await refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "삭제 실패" });
    } finally {
      setBusy(null);
    }
  };

  const addRow = () =>
    setRows((rs) => [
      ...rs,
      {
        _k: `new-${rs.length}-${Math.max(0, ...rs.map((r) => r.sortOrder)) + 1}`,
        id: "",
        category: "",
        item: "",
        scopeBasis: "",
        standardPrice: 0,
        note: "",
        sortOrder: (rs.length ? Math.max(...rs.map((r) => r.sortOrder)) : -1) + 1,
      },
    ]);

  const reset = async () => {
    if (!confirm("단가 산정표를 기본값으로 초기화할까요? 편집 내용이 사라집니다.")) return;
    try {
      await resetRateSheet({ companyId });
      toast({ tone: "success", title: "기본값으로 초기화됨" });
      await refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "초기화 실패" });
    }
  };

  const total = rows.reduce((s, r) => s + (Number(r.standardPrice) || 0), 0);
  const th = "border-b border-border px-2 py-1.5 text-left text-xs font-medium text-muted-foreground";
  const cellInput: CSSProperties = {
    width: "100%",
    border: "1px solid var(--border, #cfd5dd)",
    borderRadius: 4,
    padding: "0.25rem 0.4rem",
    fontSize: 12,
    background: "var(--background, #fff)",
    color: "inherit",
    boxSizing: "border-box",
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            ← 견적
          </button>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">단가 산정표</h2>
          <span className="text-xs text-muted-foreground">기능별 표준 단가(내부 기준 · 견적 산출 자료)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void reset()}
            className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            기본값 초기화
          </button>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            + 행 추가
          </button>
        </div>
      </div>

      {loading && !data && <div className="text-sm text-muted-foreground">불러오는 중…</div>}
      {error && <div className="text-sm text-destructive">오류: {error.message}</div>}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={th} style={{ width: 56 }}>순서</th>
              <th className={th} style={{ width: 150 }}>대분류 *</th>
              <th className={th}>산정 항목</th>
              <th className={th}>범위 근거</th>
              <th className={`${th} text-right`} style={{ width: 120 }}>표준 단가</th>
              <th className={th} style={{ width: 130 }}>비고</th>
              <th className={th} style={{ width: 92 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._k} className="border-b border-border last:border-0 align-top">
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    style={{ ...cellInput, width: 48 }}
                    value={r.sortOrder}
                    onChange={(e) => patch(r._k, { sortOrder: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input style={cellInput} value={r.category} onChange={(e) => patch(r._k, { category: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input style={cellInput} value={r.item} onChange={(e) => patch(r._k, { item: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input style={cellInput} value={r.scopeBasis} onChange={(e) => patch(r._k, { scopeBasis: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    style={{ ...cellInput, textAlign: "right" }}
                    value={r.standardPrice}
                    onChange={(e) => patch(r._k, { standardPrice: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input style={cellInput} value={r.note ?? ""} onChange={(e) => patch(r._k, { note: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => void save(r)}
                      disabled={busy === r._k}
                      className="inline-flex items-center rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(r)}
                      disabled={busy === r._k}
                      className="inline-flex items-center rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  행이 없습니다. "+ 행 추가" 로 시작하세요.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/50">
              <td colSpan={4} className="px-2 py-2 text-right text-xs font-medium text-muted-foreground">
                표준 단가 합계
              </td>
              <td className="px-2 py-2 text-right text-sm font-semibold tabular-nums text-foreground">{won(total)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="text-xs text-muted-foreground">
        행을 수정한 뒤 각 행의 "저장"을 눌러야 반영됩니다. 이 표는 견적 분석 시 표준 단가 기준선으로 사용됩니다.
      </div>
    </div>
  );
}

// pathname 에서 "/quotes" 뒤 첫 세그먼트 추출. "" | "new" | "<quoteId>".
// host 가 `:pluginRoutePath/*` splat 으로 /BBR/quotes/<id> 를 같은 PluginPage 로 라우팅하므로
// 플러그인이 useHostLocation 으로 self-route 한다(목록/상세 URL 분리).
function quotesSubPath(pathname: string): string {
  const m = pathname.match(/\/quotes(?:\/([^/?#]*))?/);
  return (m?.[1] ?? "").trim();
}

export function QuotesPage(props: PluginPageProps) {
  const host = useHostContext();
  const nav = useHostNavigation();
  const loc = useHostLocation();
  const companyId = props.context?.companyId ?? host.companyId ?? null;

  if (!companyId) {
    return (
      <div className="text-sm text-muted-foreground">
        회사 컨텍스트가 필요합니다. 회사를 선택한 뒤 다시 열어주세요.
      </div>
    );
  }

  // BBR 전용 게이트 (host 가 회사별 설치를 지원하지 않아 플러그인에서 차단).
  const companyPrefix = props.context?.companyPrefix ?? host.companyPrefix ?? null;
  if (!isAllowedCompany(companyId, companyPrefix)) {
    return (
      <div className="text-sm text-muted-foreground">
        이 플러그인(견적서 발행)은 {ALLOWED_COMPANY_PREFIX} 회사 전용입니다.
      </div>
    );
  }

  // URL 기반 뷰 결정: /quotes(목록) · /quotes/new(신규) · /quotes/:id(상세).
  const sub = quotesSubPath(loc.pathname);
  const autoAnalyze = new URLSearchParams(loc.search || "").get("auto") === "1";

  return (
    <div className="text-sm text-foreground">
      {sub === "" && (
        <QuoteList
          companyId={companyId}
          onOpen={(id) => nav.navigate(`/quotes/${id}`)}
          onNew={() => nav.navigate("/quotes/new")}
          onRates={() => nav.navigate("/quotes/rates")}
        />
      )}
      {sub === "new" && (
        <NewQuoteForm
          companyId={companyId}
          onCancel={() => nav.navigate("/quotes")}
          onCreated={(id) => nav.navigate(`/quotes/${id}?auto=1`)}
        />
      )}
      {sub === "rates" && (
        <RateSheetPage companyId={companyId} onBack={() => nav.navigate("/quotes")} />
      )}
      {sub !== "" && sub !== "new" && sub !== "rates" && (
        <QuoteDetail companyId={companyId} quoteId={sub} autoAnalyze={autoAnalyze} />
      )}
    </div>
  );
}
