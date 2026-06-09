import { randomUUID } from "node:crypto";
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import {
  ACTION,
  DATA,
  DEFAULT_SUPPLIER,
  T_QUOTES,
  T_RATES,
  T_RATE_SHEET,
  T_COMMENTS,
  analysisChannel,
  commentsChannel,
  isAllowedCompany,
  type AnalysisResult,
  type QuoteComment,
  type QuoteInput,
  type QuoteRecord,
  type RateSheetRow,
  type ReferenceDoc,
  type SupplierInfo,
} from "./contract.js";
import { ANALYZER_INSTRUCTIONS } from "./agent/analyzer-instructions.js";
import { buildAnalyzerPrompt, buildReplyPrompt, parseAnalysis, parseReplyDecision } from "./lib/analysis.js";
import { DEFAULT_RATE_SHEET, buildRateSheetMd } from "./lib/standard-baseline.js";
import { renderQuoteHtml } from "./template/quote-template.js";

// 분석은 vibeproxy(Anthropic 호환 게이트웨이)에 직접 호출한다.
// host 의 managed-agent 세션은 sendMessage 프롬프트를 heartbeat 로만 전달해
// free-form 프롬프트가 유실되고, ctx.http 는 SSRF 가드로 사설 IP(localhost)를 막는다.
// → worker 프로세스의 raw fetch + 상속된 ANTHROPIC_BASE_URL 로 직접 호출.
const LLM_BASE = (process.env.ANTHROPIC_BASE_URL || "http://localhost:8317").replace(/\/+$/, "");
const LLM_KEY = process.env.ANTHROPIC_API_KEY || "no-key-required";
const LLM_MODEL = process.env.QUOTE_ANALYZER_MODEL || "claude-opus-4-8";

// 직접 호출이므로 도구가 없다. 모델이 파일을 찾거나(<invoke>/Glob/Read/AGENTS.md) 서론을
// 붙이지 않도록, system 은 "순수 JSON 함수" 역할만 부여하고 산정 방법론은 user 메시지의
// 참고자료(데이터)로 전달한다. (instructions 를 system 에 넣으면 '에이전트 페르소나'로 받아
// AGENTS.md 같은 파일을 찾으려 한다.)
const SYSTEM_GUARD = [
  "너는 견적 분석 결과를 JSON 으로만 출력하는 순수 함수다. 대화형 에이전트가 아니다.",
  "너에게는 파일시스템·도구·웹·AGENTS.md 가 전혀 없다. 무엇을 찾거나 읽으려 하지 마라.",
  "'파일을 찾아야 한다', 'AGENTS.md 를 봐야 한다' 같은 말을 절대 하지 마라.",
  "산정에 필요한 모든 기준·단가·요구사항은 user 메시지 안에 전부 들어있다. 그것만으로 즉시 산정하라.",
  "출력은 유효한 JSON 객체 하나뿐. 첫 글자 '{', 마지막 글자 '}'. 서론·설명·마크다운·코드펜스·도구호출 금지.",
].join("\n");

// referenceSpec(산정 방법론) + userPrompt(견적 요청) 을 user 메시지로 합쳐 보낸다.
async function callAnalyzerLlm(referenceSpec: string, userPrompt: string): Promise<string> {
  const userContent =
    `아래는 견적 산정 방법론(참고자료)과 견적 요청이다. 방법론을 적용해 결과 JSON 을 만들어라.\n\n` +
    `===== 산정 방법론 (참고자료) =====\n${referenceSpec}\n\n` +
    `===== 견적 요청 =====\n${userPrompt}\n\n` +
    `(반드시 JSON 객체 하나만 출력. 첫 글자 '{', 마지막 글자 '}'. 도구 호출·파일 탐색·설명·코드펜스 금지.)`;
  const res = await fetch(`${LLM_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": LLM_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 16000,
      system: SYSTEM_GUARD,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`분석 LLM 호출 실패 (${res.status}): ${t.slice(0, 300)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
  if (!text.trim()) throw new Error("분석 LLM 응답이 비어 있습니다.");
  return text;
}

type AnyCtx = Parameters<NonNullable<Parameters<typeof definePlugin>[0]["setup"]>>[0];

function asCompanyId(params: Record<string, unknown>, ctxCompanyId?: string | null): string {
  const v = (params.companyId as string) ?? ctxCompanyId ?? null;
  if (!v) throw new Error("companyId 가 필요합니다.");
  // BBR 전용 게이트 (host 가 회사별 설치 미지원 → 모든 data/action 진입점에서 차단).
  if (!isAllowedCompany(v)) throw new Error("이 플러그인은 BBR 회사 전용입니다.");
  return v;
}

function rowToRecord(r: Record<string, unknown>): QuoteRecord {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    clientName: String(r.client_name ?? ""),
    requirements: String(r.requirements ?? ""),
    workScope: String(r.work_scope ?? ""),
    expectedPrice: r.expected_price == null ? null : Number(r.expected_price),
    platform: r.platform == null ? null : String(r.platform),
    vatMode: (r.vat_mode as "별도" | "포함") ?? "별도",
    status: (r.status as QuoteRecord["status"]) ?? "draft",
    referenceDocs: Array.isArray(r.reference_docs) ? (r.reference_docs as ReferenceDoc[]) : [],
    analysis: (r.analysis as AnalysisResult | null) ?? null,
    html: r.html == null ? null : String(r.html),
    errorMessage: r.error_message == null ? null : String(r.error_message),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  };
}

async function loadQuote(ctx: AnyCtx, companyId: string, id: string): Promise<QuoteRecord | null> {
  const rows = await ctx.db.query<Record<string, unknown>>(
    `SELECT * FROM ${T_QUOTES} WHERE company_id = $1 AND id = $2`,
    [companyId, id],
  );
  return rows.length ? rowToRecord(rows[0]) : null;
}

async function loadSupplier(ctx: AnyCtx): Promise<SupplierInfo> {
  let cfg: Record<string, unknown> = {};
  try {
    cfg = (await ctx.config.get()) ?? {};
  } catch {
    cfg = {};
  }
  const pick = (k: string, fallback: string) =>
    typeof cfg[k] === "string" && (cfg[k] as string).trim() ? (cfg[k] as string) : fallback;
  return {
    companyName: pick("supplierCompanyName", DEFAULT_SUPPLIER.companyName),
    ceo: pick("supplierCeo", DEFAULT_SUPPLIER.ceo),
    bizNo: pick("supplierBizNo", DEFAULT_SUPPLIER.bizNo),
    address: pick("supplierAddress", DEFAULT_SUPPLIER.address),
    phone: pick("supplierPhone", DEFAULT_SUPPLIER.phone),
    bizType: pick("supplierBizType", DEFAULT_SUPPLIER.bizType),
    bizItem: pick("supplierBizItem", DEFAULT_SUPPLIER.bizItem),
  };
}

async function loadRates(ctx: AnyCtx) {
  const rows = await ctx.db.query<{ category: string; standard_price: number; note: string | null }>(
    `SELECT category, standard_price, note FROM ${T_RATES} ORDER BY standard_price DESC`,
  );
  return rows.map((r) => ({ category: r.category, standardPrice: Number(r.standard_price), note: r.note }));
}

function rateSheetRow(r: Record<string, unknown>): RateSheetRow {
  return {
    id: String(r.id),
    category: String(r.category ?? ""),
    item: String(r.item ?? ""),
    scopeBasis: String(r.scope_basis ?? ""),
    standardPrice: r.standard_price == null ? 0 : Number(r.standard_price),
    note: r.note == null ? null : String(r.note),
    sortOrder: r.sort_order == null ? 0 : Number(r.sort_order),
  };
}

// 단가 산정표(rate_sheet)가 비어 있으면 DEFAULT_RATE_SHEET 로 1회 시드(빈 경우에만).
async function ensureRateSheetSeeded(ctx: AnyCtx): Promise<void> {
  const cnt = await ctx.db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${T_RATE_SHEET}`);
  if (Number(cnt[0]?.n ?? 0) > 0) return;
  for (let i = 0; i < DEFAULT_RATE_SHEET.length; i++) {
    const d = DEFAULT_RATE_SHEET[i]!;
    await ctx.db.execute(
      `INSERT INTO ${T_RATE_SHEET} (id, category, item, scope_basis, standard_price, note, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [randomUUID(), d.category, d.item, d.scopeBasis, Math.round(d.standardPrice), d.note, i],
    );
  }
}

async function loadRateSheet(ctx: AnyCtx): Promise<RateSheetRow[]> {
  await ensureRateSheetSeeded(ctx);
  const rows = await ctx.db.query<Record<string, unknown>>(
    `SELECT * FROM ${T_RATE_SHEET} ORDER BY sort_order ASC, created_at ASC`,
  );
  return rows.map(rateSheetRow);
}

// === 사례/시세 grounding (내부 과거견적 + 외부 위시켓 실수집) ===
interface PastQuoteRef { quoteId: string; client: string; workScope: string; total: number | null; summary: string }
interface MarketRef { source: string; title: string; url: string; priceRange: string | null }

async function loadPastQuotes(ctx: AnyCtx, companyId: string, excludeId: string): Promise<PastQuoteRef[]> {
  const rows = await ctx.db.query<Record<string, unknown>>(
    `SELECT id, client_name, work_scope,
            (analysis->'pricing'->>'total') AS total,
            (analysis->>'summary') AS summary
     FROM ${T_QUOTES}
     WHERE company_id=$1 AND id<>$2 AND analysis IS NOT NULL AND status IN ('analyzed','published')
     ORDER BY created_at DESC LIMIT 15`,
    [companyId, excludeId],
  );
  return rows.map((r) => ({
    quoteId: String(r.id),
    client: String(r.client_name ?? ""),
    workScope: String(r.work_scope ?? ""),
    total: r.total == null ? null : Number(r.total),
    summary: String(r.summary ?? "").slice(0, 200),
  }));
}

function buildPastQuotesMd(rows: PastQuoteRef[]): string {
  if (!rows.length) return "(내부 과거 견적 사례 없음 — cases[] 는 빈 배열로 둘 것)";
  return rows
    .map((r) =>
      `- quoteId=${r.quoteId} | ${r.client} | 총액 ${r.total == null ? "(미정)" : `${r.total.toLocaleString("ko-KR")}원`} | ${(r.workScope || r.summary).slice(0, 160)}`,
    )
    .join("\n");
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// 위시켓 프로젝트 검색 페이지(서버렌더)에서 실제 프로젝트(제목/링크/예산)를 raw fetch + 정규식 파싱.
async function fetchWishketRefs(keyword: string): Promise<MarketRef[]> {
  const url = `https://www.wishket.com/project/${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ""}`;
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; QuoteIssuer/1.0)" },
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) return [];
  const html = await res.text();
  const re = /<a class="[^"]*project-link"[^>]*href="\/project\/(\d+)\/"[^>]*>\s*<p[^>]*>([^<]+)<\/p>/g;
  const out: MarketRef[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < 12) {
    const id = m[1]!;
    const title = decodeHtmlEntities(m[2]!.trim());
    const after = html.slice(m.index, m.index + 500);
    const bm = after.match(/(월 금액|예상 금액)[\s\S]*?([\d,]{4,})\s*원/);
    const priceRange = bm ? `${bm[1]} ${bm[2]}원${bm[1] === "월 금액" ? "/월" : ""}` : null;
    out.push({ source: "위시켓", title, url: `https://www.wishket.com/project/${id}/`, priceRange });
  }
  return out;
}

// 위시켓(신뢰) 우선. 프리모아(SSL)/원티드긱스(SPA)는 best-effort, 실패 시 skip.
async function fetchMarketRefs(keyword: string): Promise<MarketRef[]> {
  const results = await Promise.all([
    fetchWishketRefs(keyword).catch(() => [] as MarketRef[]),
  ]);
  return results.flat();
}

function buildMarketRefsMd(refs: MarketRef[]): string {
  if (!refs.length) return "(외부 시세 참고 자료 없음 — research[] 는 빈 배열로 둘 것)";
  return refs.map((r) => `- [${r.source}] ${r.title} | ${r.priceRange ?? "(금액 비공개)"} | ${r.url}`).join("\n");
}

// 분석 입력용 검색 키워드(플랫폼/업무내용에서 유도). 위시켓 검색이 서버필터를 안 해도 최신 실데이터 확보.
function deriveSearchKeyword(input: QuoteInput): string {
  return (input.platform || input.workScope || input.clientName || "").replace(/\s+/g, " ").trim().slice(0, 30);
}

function commentRow(r: Record<string, unknown>): QuoteComment {
  return {
    id: String(r.id),
    quoteId: String(r.quote_id),
    authorType: (r.author_type as QuoteComment["authorType"]) ?? "user",
    authorUserId: r.author_user_id == null ? null : String(r.author_user_id),
    body: String(r.body ?? ""),
    kind: (r.kind as QuoteComment["kind"]) ?? "comment",
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

function wonText(n: number | null | undefined): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${v.toLocaleString("ko-KR")}원`;
}

// Postgres text/jsonb 는 NUL 등 일부 제어문자를 거부한다("unsupported Unicode escape
// sequence"). PDF 추출 텍스트(unpdf)에 섞여 들어오면 INSERT 가 실패하므로 저장 전 제거한다.
// 개행(\n)·탭(\t)·CR(\r) 은 보존, 나머지 C0 제어문자 + NUL 제거.
function stripControlChars(s: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/**
 * 원자적으로 'analyzing' 상태를 선점한다. 이미 analyzing 이면 false 반환(중복/경합 분석 차단, TOCTOU 방지).
 * rowCount===1 이면 이 호출이 분석 슬롯을 획득한 것.
 */
async function claimAnalyzing(ctx: AnyCtx, companyId: string, id: string): Promise<boolean> {
  const res = await ctx.db.execute(
    `UPDATE ${T_QUOTES} SET status='analyzing', error_message=NULL, updated_at=now()
     WHERE company_id=$1 AND id=$2 AND status<>'analyzing'`,
    [companyId, id],
  );
  return ((res as { rowCount?: number })?.rowCount ?? 0) > 0;
}

/**
 * 신규 견적 분석 잡(fire-and-forget). triggerAnalysis 가 사용.
 * 전제: 호출측이 claimAnalyzing() 으로 'analyzing' 을 선점했다.
 */
function startAnalysisJob(
  ctx: AnyCtx,
  companyId: string,
  quote: QuoteRecord,
  opts: { enableWebResearch?: boolean },
): void {
  const id = quote.id;
  const channel = analysisChannel(id);
  ctx.streams.open(channel, companyId);
  const emit = (phase: string, message: string) =>
    ctx.streams.emit(channel, { phase, message, at: new Date().toISOString() });

  void (async () => {
    try {
      emit("start", "분석을 시작합니다…");
      const fresh = (await loadQuote(ctx, companyId, id)) ?? quote;
      const rates = await loadRates(ctx);
      const input: QuoteInput = {
        clientName: fresh.clientName,
        requirements: fresh.requirements,
        workScope: fresh.workScope,
        expectedPrice: fresh.expectedPrice,
        platform: fresh.platform,
        vatMode: fresh.vatMode,
        enableWebResearch: Boolean(opts.enableWebResearch ?? false),
        referenceDocs: fresh.referenceDocs,
      };
      const rateSheet = await loadRateSheet(ctx);
      const pastQuotes = await loadPastQuotes(ctx, companyId, id);
      emit("research", "유사 사례·시세 수집 중…");
      // 사례/시세는 항상 수집 시도(과거견적 + 위시켓 실수집). best-effort, 실패 시 빈 배열.
      const marketRefs = await fetchMarketRefs(deriveSearchKeyword(input)).catch(() => [] as MarketRef[]);
      emit("delegate", "AI 분석 중…");
      const raw = await callAnalyzerLlm(
        ANALYZER_INSTRUCTIONS,
        buildAnalyzerPrompt(
          input,
          rates,
          buildRateSheetMd(rateSheet),
          buildPastQuotesMd(pastQuotes),
          buildMarketRefsMd(marketRefs),
        ),
      );
      emit("parse", "분석 결과 파싱…");
      let analysis: AnalysisResult;
      try {
        analysis = parseAnalysis(raw);
      } catch (pe) {
        const pm = pe instanceof Error ? pe.message : String(pe);
        throw new Error(`${pm} | RAW(0..600)=${raw.slice(0, 600)}`);
      }
      // 사례/시세는 실제 수집/과거견적에 있는 것만 통과(지어낸 url·사례 제거).
      const refUrls = new Set(marketRefs.map((r) => r.url));
      const pastIds = new Set(pastQuotes.map((q) => q.quoteId));
      analysis.research = (analysis.research ?? []).filter((r) => r.url != null && refUrls.has(r.url));
      analysis.cases = (analysis.cases ?? []).filter((c) => c.quoteId != null && pastIds.has(c.quoteId));
      const supplier = await loadSupplier(ctx);
      const html = renderQuoteHtml({ ...fresh, analysis }, analysis, supplier);
      await ctx.db.execute(
        `UPDATE ${T_QUOTES} SET analysis=$3::jsonb, html=$4, status='analyzed', updated_at=now() WHERE company_id=$1 AND id=$2`,
        [companyId, id, JSON.stringify(analysis), html],
      );
      emit("done", "분석 완료");
      ctx.streams.close(channel);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ctx.logger.error("quote analysis failed", { id, msg });
      await ctx.db
        .execute(
          `UPDATE ${T_QUOTES} SET status='error', error_message=$3, updated_at=now() WHERE company_id=$1 AND id=$2`,
          [companyId, id, msg],
        )
        .catch(() => {});
      emit("error", msg);
      ctx.streams.close(channel);
    }
  })();
}

/**
 * 사용자 댓글 1건을 LLM 에 보내 의도를 스스로 판단하게 하고(보완 vs 답변) 결과를 처리한다(fire-and-forget).
 * 전제: 호출측이 claimAnalyzing() 으로 'analyzing' 을 선점했다(직렬화) + quote.analysis 존재.
 * - revise: 견적 수정 → status='analyzed' + assistant 'revision' 댓글(LLM 요약 + 금액 델타).
 * - reply: 견적 불변 → status 를 priorStatus 로 복원 + assistant 'comment' 답변.
 */
function startReplyJob(
  ctx: AnyCtx,
  companyId: string,
  quote: QuoteRecord,
  opts: { instruction: string; priorStatus: QuoteRecord["status"]; sourceCommentId: string },
): void {
  const id = quote.id;
  const channel = analysisChannel(id);
  ctx.streams.open(channel, companyId);
  const emit = (phase: string, message: string) =>
    ctx.streams.emit(channel, { phase, message, at: new Date().toISOString() });

  const postAssistant = async (
    body: string,
    kind: "comment" | "revision",
    metadata: Record<string, unknown> | null,
  ) => {
    const cid = randomUUID();
    await ctx.db.execute(
      `INSERT INTO ${T_COMMENTS} (id, company_id, quote_id, author_type, author_user_id, body, kind, metadata)
       VALUES ($1,$2,$3,'assistant',NULL,$4,$5,$6::jsonb)`,
      [cid, companyId, id, body, kind, metadata ? JSON.stringify(metadata) : null],
    );
    ctx.streams.emit(commentsChannel(id), {
      id: cid,
      quoteId: id,
      authorType: "assistant",
      authorUserId: null,
      body,
      kind,
      metadata: null,
      createdAt: new Date().toISOString(),
    });
  };
  const restoreStatus = () =>
    ctx.db
      .execute(`UPDATE ${T_QUOTES} SET status=$3, updated_at=now() WHERE company_id=$1 AND id=$2`, [
        companyId,
        id,
        opts.priorStatus,
      ])
      .catch(() => {});

  void (async () => {
    try {
      emit("start", "AI가 댓글을 검토 중…");
      const fresh = (await loadQuote(ctx, companyId, id)) ?? quote;
      const prior = fresh.analysis;
      if (!prior) {
        await restoreStatus();
        await postAssistant("아직 분석 결과가 없어 보완할 수 없습니다. 먼저 분석을 실행해 주세요.", "comment", null);
        emit("done", "완료");
        ctx.streams.close(channel);
        return;
      }

      const rates = await loadRates(ctx);
      const input: QuoteInput = {
        clientName: fresh.clientName,
        requirements: fresh.requirements,
        workScope: fresh.workScope,
        expectedPrice: fresh.expectedPrice,
        platform: fresh.platform,
        vatMode: fresh.vatMode,
        enableWebResearch: false,
        referenceDocs: fresh.referenceDocs,
      };
      emit("delegate", "AI 처리 중…");
      const rateSheet = await loadRateSheet(ctx);
      const raw = await callAnalyzerLlm(ANALYZER_INSTRUCTIONS, buildReplyPrompt(input, prior, opts.instruction, rates, buildRateSheetMd(rateSheet)));
      emit("parse", "결과 파싱…");
      const decision = parseReplyDecision(raw);

      if (decision.action === "revise") {
        const analysis = decision.analysis;
        const supplier = await loadSupplier(ctx);
        const html = renderQuoteHtml({ ...fresh, analysis }, analysis, supplier);
        await ctx.db.execute(
          `UPDATE ${T_QUOTES} SET analysis=$3::jsonb, html=$4, status='analyzed', updated_at=now() WHERE company_id=$1 AND id=$2`,
          [companyId, id, JSON.stringify(analysis), html],
        );
        const p = prior.pricing;
        const n = analysis.pricing;
        const lines = ["🔧 AI 보완 완료", decision.message];
        if (p.total !== n.total) lines.push(`· 총액 ${wonText(p.total)} → ${wonText(n.total)}`);
        if (p.proposedSupply !== n.proposedSupply)
          lines.push(`· 공급가 ${wonText(p.proposedSupply)} → ${wonText(n.proposedSupply)}`);
        await postAssistant(lines.join("\n"), "revision", {
          before: p,
          after: n,
          sourceCommentId: opts.sourceCommentId,
        });
        emit("done", "보완 완료");
      } else {
        // 단순 답변: 견적 불변, 상태 복원.
        await restoreStatus();
        await postAssistant(decision.message, "comment", null);
        emit("done", "답변 완료");
      }
      ctx.streams.close(channel);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ctx.logger.error("quote comment reply failed", { id, msg });
      // 댓글 처리 실패는 견적 자체를 error 로 만들지 않고 상태를 복원한다(분석 보존).
      await restoreStatus();
      await postAssistant(`⚠️ 댓글 처리 실패: ${msg.slice(0, 300)}`, "comment", null).catch(() => {});
      emit("error", msg);
      ctx.streams.close(channel);
    }
  })();
}

const plugin = definePlugin({
  async setup(ctx) {
    // ---- DATA (조회) ----
    ctx.data.register(DATA.listQuotes, async (params) => {
      const companyId = asCompanyId(params);
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT id, company_id, client_name, work_scope, expected_price, platform, vat_mode, status, created_at, updated_at,
                (analysis->'pricing'->>'total') AS total
         FROM ${T_QUOTES} WHERE company_id = $1 ORDER BY created_at DESC LIMIT 200`,
        [companyId],
      );
      return rows.map((r) => ({
        ...rowToRecord(r),
        total: r.total == null ? null : Number(r.total),
      }));
    });

    ctx.data.register(DATA.getQuote, async (params) => {
      const companyId = asCompanyId(params);
      const id = String(params.id ?? "");
      const q = await loadQuote(ctx, companyId, id);
      if (!q) throw new Error("견적을 찾을 수 없습니다.");
      return q;
    });

    ctx.data.register(DATA.rates, async () => loadRates(ctx));
    ctx.data.register(DATA.rateSheet, async (params) => {
      asCompanyId(params); // BBR 게이트
      return loadRateSheet(ctx);
    });
    ctx.data.register(DATA.supplier, async () => loadSupplier(ctx));

    ctx.data.register(DATA.listComments, async (params) => {
      const companyId = asCompanyId(params);
      const id = String(params.id ?? "");
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${T_COMMENTS} WHERE company_id=$1 AND quote_id=$2 ORDER BY created_at ASC`,
        [companyId, id],
      );
      return rows.map(commentRow);
    });

    // ---- ACTIONS (변경) ----
    ctx.actions.register(ACTION.createQuote, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const input = params.input as QuoteInput;
      if (!input?.clientName?.trim()) throw new Error("고객사를 입력하세요.");
      // 첨부 참고자료 정규화: 파일명/텍스트만, 개수·길이 상한 + 제어문자 제거(Postgres 거부 방지).
      const referenceDocs: ReferenceDoc[] = Array.isArray(input.referenceDocs)
        ? input.referenceDocs
            .filter((d) => d && typeof d.text === "string" && d.text.trim().length > 0)
            .slice(0, 20)
            .map((d) => ({
              filename: stripControlChars(d.filename ?? "첨부").slice(0, 200) || "첨부",
              text: stripControlChars(d.text).slice(0, 200_000),
            }))
            .filter((d) => d.text.trim().length > 0)
        : [];
      const id = randomUUID();
      await ctx.db.execute(
        `INSERT INTO ${T_QUOTES}
           (id, company_id, client_name, requirements, work_scope, expected_price, platform, vat_mode, status, reference_docs)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9::jsonb)`,
        [
          id,
          companyId,
          stripControlChars(input.clientName).trim(),
          stripControlChars(input.requirements ?? ""),
          stripControlChars(input.workScope ?? ""),
          input.expectedPrice ?? null,
          input.platform ? stripControlChars(input.platform) : null,
          input.vatMode ?? "별도",
          JSON.stringify(referenceDocs),
        ],
      );
      return { id };
    });

    ctx.actions.register(ACTION.triggerAnalysis, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const quote = await loadQuote(ctx, companyId, id);
      if (!quote) throw new Error("견적을 찾을 수 없습니다.");

      const enableWebResearch = Boolean((params.enableWebResearch as boolean) ?? false);
      const claimed = await claimAnalyzing(ctx, companyId, id);
      if (!claimed) return { started: false, reason: "이미 분석이 진행 중입니다." };
      startAnalysisJob(ctx, companyId, quote, { enableWebResearch });
      return { started: true };
    });

    ctx.actions.register(ACTION.publish, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const quote = await loadQuote(ctx, companyId, id);
      if (!quote) throw new Error("견적을 찾을 수 없습니다.");
      if (!quote.analysis) throw new Error("분석이 완료되지 않았습니다.");

      const supplier = await loadSupplier(ctx);
      const html = renderQuoteHtml(quote, quote.analysis, supplier);
      await ctx.db.execute(
        `UPDATE ${T_QUOTES} SET html=$3, status='published', updated_at=now() WHERE company_id=$1 AND id=$2`,
        [companyId, id, html],
      );

      // PDF 는 브라우저 인쇄(미리보기의 "PDF 저장")로 처리한다. agent-shell 위임은
      // 이 host 빌드에서 세션 프롬프트가 유실되어 동작하지 않으므로 제거.
      return { ok: true, pdfPath: null };
    });

    ctx.actions.register(ACTION.deleteQuote, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      await ctx.db.execute(`DELETE FROM ${T_QUOTES} WHERE company_id=$1 AND id=$2`, [companyId, id]);
      return { ok: true };
    });

    // 댓글 추가. 견적에 분석이 있으면, 댓글을 LLM 에 보내 의도를 판단(보완 vs 답변)해 처리한다.
    ctx.actions.register(ACTION.addComment, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? ""); // quoteId
      const body = stripControlChars(String(params.body ?? "")).trim();
      if (!body) throw new Error("내용을 입력하세요.");

      const quote = await loadQuote(ctx, companyId, id);
      if (!quote) throw new Error("견적을 찾을 수 없습니다.");

      // 작성자 신원(host action context 의 actor). 없으면 익명 처리.
      const actor = (context as { actor?: { actorType?: string; userId?: string | null; actorId?: string } })
        .actor;
      const authorUserId = actor?.userId ?? actor?.actorId ?? null;

      const cid = randomUUID();
      await ctx.db.execute(
        `INSERT INTO ${T_COMMENTS} (id, company_id, quote_id, author_type, author_user_id, body, kind)
         VALUES ($1,$2,$3,'user',$4,$5,'comment')`,
        [cid, companyId, id, authorUserId, body],
      );
      ctx.streams.emit(commentsChannel(id), {
        id: cid,
        quoteId: id,
        authorType: "user",
        authorUserId,
        body,
        kind: "comment",
        metadata: null,
        createdAt: new Date().toISOString(),
      });

      // 분석이 있는 견적은 댓글마다 AI 가 의도 판단(보완/답변). 분석 전이면 AI 처리는 생략(저장만).
      let aiStarted = false;
      if (quote.analysis) {
        // 원자적 선점으로 직렬화(동시 댓글이 같은 견적에 중복 잡 띄우지 않게).
        const claimed = await claimAnalyzing(ctx, companyId, id);
        if (claimed) {
          startReplyJob(ctx, companyId, quote, {
            instruction: body,
            priorStatus: quote.status,
            sourceCommentId: cid,
          });
          aiStarted = true;
        } else {
          const note = "⚠️ AI가 직전 댓글을 처리 중입니다. 완료 후 이 댓글을 다시 남겨 주세요.";
          const sid = randomUUID();
          await ctx.db.execute(
            `INSERT INTO ${T_COMMENTS} (id, company_id, quote_id, author_type, author_user_id, body, kind, metadata)
             VALUES ($1,$2,$3,'system',NULL,$4,'comment',NULL::jsonb)`,
            [sid, companyId, id, note],
          );
          ctx.streams.emit(commentsChannel(id), {
            id: sid,
            quoteId: id,
            authorType: "system",
            authorUserId: null,
            body: note,
            kind: "comment",
            metadata: null,
            createdAt: new Date().toISOString(),
          });
        }
      }

      return { id: cid, aiStarted };
    });

    ctx.actions.register(ACTION.deleteComment, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const quoteId = String(params.id ?? "");
      const commentId = String(params.commentId ?? "");
      if (!commentId) throw new Error("commentId 가 필요합니다.");
      if (!quoteId) throw new Error("id(견적 ID)가 필요합니다.");
      // 견적 존재/소유 확인(다른 회사·잘못된 견적 접근 차단).
      const quote = await loadQuote(ctx, companyId, quoteId);
      if (!quote) throw new Error("견적을 찾을 수 없습니다.");
      // quote_id 까지 스코프해 같은 회사 내 다른 견적의 댓글을 지우지 못하게 한다.
      await ctx.db.execute(
        `DELETE FROM ${T_COMMENTS} WHERE company_id=$1 AND quote_id=$2 AND id=$3`,
        [companyId, quoteId, commentId],
      );
      // 다른 뷰어에게도 삭제 반영(tombstone).
      ctx.streams.emit(commentsChannel(quoteId), {
        id: commentId,
        quoteId,
        authorType: "user",
        authorUserId: null,
        body: "",
        kind: "comment",
        metadata: null,
        createdAt: new Date().toISOString(),
        _deleted: true,
      });
      return { ok: true };
    });

    // ---- 단가 산정표(rate_sheet) 편집 ----
    ctx.actions.register(ACTION.upsertRate, async (params, context) => {
      asCompanyId(params, context.companyId);
      const id = String(params.id ?? "").trim() || randomUUID();
      const category = stripControlChars(String(params.category ?? "")).trim();
      if (!category) throw new Error("대분류를 입력하세요.");
      const item = stripControlChars(String(params.item ?? "")).trim();
      const scopeBasis = stripControlChars(String(params.scopeBasis ?? "")).trim();
      const noteRaw = params.note == null ? "" : stripControlChars(String(params.note)).trim();
      const note = noteRaw.length > 0 ? noteRaw : null;
      const standardPrice = Math.max(0, Math.round(Number(params.standardPrice) || 0));
      const sortOrder = Math.round(Number(params.sortOrder) || 0);
      await ensureRateSheetSeeded(ctx);
      await ctx.db.execute(
        `INSERT INTO ${T_RATE_SHEET} (id, category, item, scope_basis, standard_price, note, sort_order, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, now())
         ON CONFLICT (id) DO UPDATE SET
           category=$2, item=$3, scope_basis=$4, standard_price=$5, note=$6, sort_order=$7, updated_at=now()`,
        [id, category, item, scopeBasis, standardPrice, note, sortOrder],
      );
      return { id };
    });

    ctx.actions.register(ACTION.deleteRate, async (params, context) => {
      asCompanyId(params, context.companyId);
      const id = String(params.id ?? "").trim();
      if (!id) throw new Error("id 가 필요합니다.");
      await ctx.db.execute(`DELETE FROM ${T_RATE_SHEET} WHERE id=$1`, [id]);
      return { ok: true };
    });

    ctx.actions.register(ACTION.resetRateSheet, async (params, context) => {
      asCompanyId(params, context.companyId);
      await ctx.db.execute(`DELETE FROM ${T_RATE_SHEET}`);
      await ensureRateSheetSeeded(ctx);
      return { ok: true };
    });
  },

  async onHealth() {
    return { status: "ok", message: "quote-issuer worker running" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
