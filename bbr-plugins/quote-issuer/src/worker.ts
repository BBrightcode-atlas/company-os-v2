import { randomUUID } from "node:crypto";
import https from "node:https";
import tls from "node:tls";
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
import { renderQuoteHtml, buildDefaultNotesText } from "./template/quote-template.js";

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
    quoteType: (r.quote_type as "development" | "maintenance") ?? "development",
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
    marketPrice: r.market_price == null ? null : Number(r.market_price),
    reuseLevel: r.reuse_level == null ? null : String(r.reuse_level),
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
      `INSERT INTO ${T_RATE_SHEET} (id, category, item, scope_basis, standard_price, market_price, reuse_level, note, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [randomUUID(), d.category, d.item, d.scopeBasis, Math.round(d.standardPrice), Math.round(d.marketPrice), d.reuseLevel, d.note, i],
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
interface MarketRef { source: string; title: string; url: string; priceRange: string | null; period?: string | null; headcount?: string | null }

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
    const after = html.slice(m.index, m.index + 700);
    const bm = after.match(/(월 금액|예상 금액)[\s\S]*?([\d,]{4,})\s*원/);
    const priceRange = bm ? `${bm[1]} ${bm[2]}원${bm[1] === "월 금액" ? "/월" : ""}` : null;
    const pm = after.match(/(?:예상\s*기간|기간)[\s\S]{0,40}?(\d+\s*(?:개월|주|일|년))/);
    const period = pm ? pm[1]!.replace(/\s+/g, "") : null;
    out.push({ source: "위시켓", title, url: `https://www.wishket.com/project/${id}/`, priceRange, period, headcount: null });
  }
  return out;
}

// 프리모아 서버가 잘못된(만료 AddTrust) 체인을 보내 leaf 의 실제 발급자(Sectigo RSA DV CA)
// 중간 인증서가 누락 → 일반 검증이 UNABLE_TO_VERIFY_LEAF_SIGNATURE 로 실패. TLS 검증을 끄지 않고
// (MITM 위험 회피) 누락된 Sectigo 중간 인증서를 직접 ca 로 공급해 USERTrust 루트까지 체인을
// 완성한다(rejectUnauthorized 는 기본 true 유지). 인증서는 ~2030 까지 유효, 만료/교체 시
// 프리모아 fetch 는 자연히 실패→best-effort skip.
const SECTIGO_RSA_DV_CA = `-----BEGIN CERTIFICATE-----
MIIGEzCCA/ugAwIBAgIQfVtRJrR2uhHbdBYLvFMNpzANBgkqhkiG9w0BAQwFADCB
iDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCk5ldyBKZXJzZXkxFDASBgNVBAcTC0pl
cnNleSBDaXR5MR4wHAYDVQQKExVUaGUgVVNFUlRSVVNUIE5ldHdvcmsxLjAsBgNV
BAMTJVVTRVJUcnVzdCBSU0EgQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkwHhcNMTgx
MTAyMDAwMDAwWhcNMzAxMjMxMjM1OTU5WjCBjzELMAkGA1UEBhMCR0IxGzAZBgNV
BAgTEkdyZWF0ZXIgTWFuY2hlc3RlcjEQMA4GA1UEBxMHU2FsZm9yZDEYMBYGA1UE
ChMPU2VjdGlnbyBMaW1pdGVkMTcwNQYDVQQDEy5TZWN0aWdvIFJTQSBEb21haW4g
VmFsaWRhdGlvbiBTZWN1cmUgU2VydmVyIENBMIIBIjANBgkqhkiG9w0BAQEFAAOC
AQ8AMIIBCgKCAQEA1nMz1tc8INAA0hdFuNY+B6I/x0HuMjDJsGz99J/LEpgPLT+N
TQEMgg8Xf2Iu6bhIefsWg06t1zIlk7cHv7lQP6lMw0Aq6Tn/2YHKHxYyQdqAJrkj
eocgHuP/IJo8lURvh3UGkEC0MpMWCRAIIz7S3YcPb11RFGoKacVPAXJpz9OTTG0E
oKMbgn6xmrntxZ7FN3ifmgg0+1YuWMQJDgZkW7w33PGfKGioVrCSo1yfu4iYCBsk
Haswha6vsC6eep3BwEIc4gLw6uBK0u+QDrTBQBbwb4VCSmT3pDCg/r8uoydajotY
uK3DGReEY+1vVv2Dy2A0xHS+5p3b4eTlygxfFQIDAQABo4IBbjCCAWowHwYDVR0j
BBgwFoAUU3m/WqorSs9UgOHYm8Cd8rIDZsswHQYDVR0OBBYEFI2MXsRUrYrhd+mb
+ZsF4bgBjWHhMA4GA1UdDwEB/wQEAwIBhjASBgNVHRMBAf8ECDAGAQH/AgEAMB0G
A1UdJQQWMBQGCCsGAQUFBwMBBggrBgEFBQcDAjAbBgNVHSAEFDASMAYGBFUdIAAw
CAYGZ4EMAQIBMFAGA1UdHwRJMEcwRaBDoEGGP2h0dHA6Ly9jcmwudXNlcnRydXN0
LmNvbS9VU0VSVHJ1c3RSU0FDZXJ0aWZpY2F0aW9uQXV0aG9yaXR5LmNybDB2Bggr
BgEFBQcBAQRqMGgwPwYIKwYBBQUHMAKGM2h0dHA6Ly9jcnQudXNlcnRydXN0LmNv
bS9VU0VSVHJ1c3RSU0FBZGRUcnVzdENBLmNydDAlBggrBgEFBQcwAYYZaHR0cDov
L29jc3AudXNlcnRydXN0LmNvbTANBgkqhkiG9w0BAQwFAAOCAgEAMr9hvQ5Iw0/H
ukdN+Jx4GQHcEx2Ab/zDcLRSmjEzmldS+zGea6TvVKqJjUAXaPgREHzSyrHxVYbH
7rM2kYb2OVG/Rr8PoLq0935JxCo2F57kaDl6r5ROVm+yezu/Coa9zcV3HAO4OLGi
H19+24rcRki2aArPsrW04jTkZ6k4Zgle0rj8nSg6F0AnwnJOKf0hPHzPE/uWLMUx
RP0T7dWbqWlod3zu4f+k+TY4CFM5ooQ0nBnzvg6s1SQ36yOoeNDT5++SR2RiOSLv
xvcRviKFxmZEJCaOEDKNyJOuB56DPi/Z+fVGjmO+wea03KbNIaiGCpXZLoUmGv38
sbZXQm2V0TP2ORQGgkE49Y9Y3IBbpNV9lXj9p5v//cWoaasm56ekBYdbqbe4oyAL
l6lFhd2zi+WJN44pDfwGF/Y4QA5C5BIG+3vzxhFoYt/jmPQT2BVPi7Fp2RBgvGQq
6jG35LWjOhSbJuMLe/0CjraZwTiXWTb2qHSihrZe68Zk6s+go/lunrotEbaGmAhY
LcmsJWTyXnW0OMGuf1pGg+pRyrbxmRE1a6Vqe8YAsOf4vmSyrcjC8azjUeqkk+B5
yOGBQMkKW+ESPMFgKuOXwIlCypTPRpgSabuY0MLTDXJLR27lk8QyKGOHQ+SwMj4K
00u/I5sUKUErmgQfky3xxzlIPK1aEn8=
-----END CERTIFICATE-----`;

// 프리모아 프로젝트 목록 API. 위 중간 인증서로 체인을 완성해 정상 검증된 TLS 로 호출.
// 단, /m4a/s41a 는 세션 쿠키(GET /m4/s41 에서 발급) + referer/origin 이 없으면 HTML 차단 페이지를
// 반환하므로 2단계로 호출한다(GET 으로 쿠키 획득 → POST 로 JSON 목록).
const FREEMOA_CA = [...tls.rootCertificates, SECTIGO_RSA_DV_CA];
function freemoaReq(opts: https.RequestOptions, body?: string): Promise<{ body: string; setCookie?: string[] }> {
  return new Promise((resolve, reject) => {
    const req = https.request({ host: "www.freemoa.net", ca: FREEMOA_CA, ...opts }, (r) => {
      let d = "";
      r.on("data", (c) => (d += c));
      r.on("end", () => resolve({ body: d, setCookie: r.headers["set-cookie"] }));
    });
    req.on("error", reject);
    req.setTimeout(9000, () => req.destroy(new Error("freemoa timeout")));
    if (body) req.write(body);
    req.end();
  });
}
async function freemoaFetchListJson(keyword: string): Promise<string> {
  const g = await freemoaReq({
    method: "GET",
    path: "/m4/s41?page=1",
    headers: { "user-agent": "Mozilla/5.0 (compatible; QuoteIssuer/1.0)" },
  });
  const cookie = (g.setCookie ?? []).map((c) => c.split(";")[0]).join("; ");
  // sS = 검색어(서버측 키워드 필터). 비우면 최신 목록.
  const body = `sS=${encodeURIComponent(keyword || "")}&page=1&mp=0&lp=0&st=stayAll&st2=&st3=`;
  const p = await freemoaReq(
    {
      method: "POST",
      path: "/m4a/s41a",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        "user-agent": "Mozilla/5.0 (compatible; QuoteIssuer/1.0)",
        referer: "https://www.freemoa.net/m4/s41?page=1",
        origin: "https://www.freemoa.net",
        accept: "application/json, text/javascript, */*; q=0.01",
        cookie,
        "content-length": Buffer.byteLength(body),
      },
    },
    body,
  );
  return p.body;
}

async function fetchFreemoaRefs(keyword: string): Promise<MarketRef[]> {
  const text = await freemoaFetchListJson(keyword);
  const data = JSON.parse(text) as { DATA?: { PROJECT?: { LIST?: unknown[] } } };
  const list = data?.DATA?.PROJECT?.LIST;
  if (!Array.isArray(list)) return [];
  const out: MarketRef[] = [];
  for (const raw of list.slice(0, 12)) {
    const p = raw as Record<string, unknown>;
    const title = String(p.title ?? "").trim();
    if (!title) continue;
    const cmin = Number(p.cost_min);
    const cmax = Number(p.cost_max);
    let price: string | null = null;
    if (Number.isFinite(cmin) && cmin > 0) {
      price = Number.isFinite(cmax) && cmax > cmin
        ? `${cmin.toLocaleString("ko-KR")}~${cmax.toLocaleString("ko-KR")}만원`
        : `${cmin.toLocaleString("ko-KR")}만원`;
    }
    const during = Number(p.during);
    const period = Number.isFinite(during) && during > 0 ? `${during}일` : null;
    const hc = Number(p.rec_num ?? p.people ?? p.recruit_num);
    const headcount = Number.isFinite(hc) && hc > 0 ? `${hc}명` : null;
    out.push({ source: "프리모아", title, url: `https://www.freemoa.net/m4/s42?proj_idx=${String(p.proj_idx)}`, priceRange: price, period, headcount });
  }
  return out;
}

async function fetchWantedRefs(): Promise<MarketRef[]> {
  const res = await fetch(
    "https://www.wanted.co.kr/gigs/api-v2/projects?page=1&work_type_office=true&work_type_remote=true&sort=createdAt&is_recruiting=true",
    { headers: { "user-agent": "Mozilla/5.0 (compatible; QuoteIssuer/1.0)", accept: "application/json" }, signal: AbortSignal.timeout(9000) },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { rows?: unknown[] };
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const out: MarketRef[] = [];
  for (const raw of rows.slice(0, 12)) {
    const r = raw as Record<string, unknown>;
    const title = String(r.title ?? "").trim();
    if (!title) continue;
    const s = (r.salary as Record<string, unknown>) ?? {};
    const st = Number(s.start);
    const en = Number(s.end);
    const unit = String(r.text_salary_type ?? "").trim();
    let price: string | null = null;
    if (Number.isFinite(st) && st > 0) {
      const range = Number.isFinite(en) && en > st
        ? `${st.toLocaleString("ko-KR")}~${en.toLocaleString("ko-KR")}만원`
        : `${st.toLocaleString("ko-KR")}만원`;
      price = `${unit} ${range}`.trim();
    }
    const term = (r.term as Record<string, unknown>) ?? {};
    const tunit = String(r.text_term_type ?? "").trim() || "개월";
    const ts = Number(term.start);
    const te = Number(term.end);
    let period: string | null = null;
    if (Number.isFinite(ts) && ts > 0) {
      period = Number.isFinite(te) && te > ts ? `${ts}~${te}${tunit}` : `${ts}${tunit}~`;
    }
    out.push({ source: "원티드긱스", title, url: `https://www.wanted.co.kr/gigs/projects/${String(r.id)}`, priceRange: price, period, headcount: null });
  }
  return out;
}

// 위시켓(서버렌더 HTML) + 프리모아/원티드긱스(JSON API). 각 소스 best-effort, 실패 시 skip.
// query 로 서버측 키워드 검색(위시켓 ?keyword=, 프리모아 sS=)을 하고, 수집 결과를 relevanceTokens
// 로 한 번 더 걸러 요청 프로젝트와 무관한 항목(원티드긱스 등 키워드 미지원 소스의 최신 잡)을 제거한다.
async function fetchMarketRefs(query: string, relevanceTokens: string[]): Promise<MarketRef[]> {
  const results = await Promise.all([
    fetchWishketRefs(query).catch(() => [] as MarketRef[]),
    fetchFreemoaRefs(query).catch(() => [] as MarketRef[]),
    fetchWantedRefs().catch(() => [] as MarketRef[]),
  ]);
  const all = results.flat();
  const relevant = all.filter((r) => isRelevantTitle(r.title, relevanceTokens));
  // 관련 항목이 너무 적으면(0~1건) 검색어로 받은 위시켓/프리모아 결과를 약하게 보강(원티드 제외).
  if (relevant.length >= 2) return relevant;
  const fallback = all.filter((r) => r.source !== "원티드긱스");
  const seen = new Set(relevant.map((r) => r.url));
  for (const r of fallback) {
    if (relevant.length >= 4) break;
    if (!seen.has(r.url)) { relevant.push(r); seen.add(r.url); }
  }
  return relevant;
}

// ---- 검색 키워드/관련성 토큰 추출 ----
// 도메인 사전: 요구사항 텍스트에서 도메인을 식별해 검색어(query) + 관련성 매칭어(match)를 정한다.
const DOMAIN_MAP: { query: string; match: string[] }[] = [
  { query: "교육 플랫폼", match: ["교육", "강의", "강좌", "수강", "강사", "학습", "이러닝", "러닝", "lms", "클래스", "스쿨", "과외", "튜터", "edu", "온라인강의"] },
  { query: "영상 스트리밍", match: ["영상", "동영상", "비디오", "스트리밍", "ott", "vod", "미디어", "방송"] },
  { query: "쇼핑몰", match: ["쇼핑", "커머스", "이커머스", "쇼핑몰", "상품", "주문", "장바구니", "마켓", "스토어", "판매", "셀러"] },
  { query: "예약 시스템", match: ["예약", "부킹", "booking", "대관", "예매"] },
  { query: "배달 플랫폼", match: ["배달", "배송", "딜리버리", "픽업", "주문배달"] },
  { query: "커뮤니티 소셜", match: ["커뮤니티", "소셜", "sns", "피드", "팔로우", "모임", "멤버십"] },
  { query: "핀테크 결제", match: ["핀테크", "금융", "송금", "투자", "대출", "자산", "증권", "보험", "가계부"] },
  { query: "헬스케어", match: ["의료", "병원", "헬스케어", "진료", "건강", "환자", "약국", "운동", "피트니스"] },
  { query: "부동산 플랫폼", match: ["부동산", "매물", "임대", "중개", "공인중개"] },
  { query: "채용 플랫폼", match: ["채용", "구인", "구직", "이력서", "인재", "리크루팅"] },
  { query: "여행 플랫폼", match: ["여행", "관광", "숙박", "투어", "항공", "호텔"] },
  { query: "매칭 플랫폼", match: ["매칭", "중개", "연결", "온디맨드"] },
];
const KW_STOP = new Set([
  "온라인", "오프라인", "기반", "기능", "구축", "개발", "제작", "시스템", "플랫폼", "서비스", "관리", "연동", "페이지",
  "사이트", "프로젝트", "사용자", "회원", "화면", "데이터", "구현", "지원", "운영", "정보", "기존", "신규", "통합",
  "각각", "여러", "모든", "관련", "필요", "가능", "위한", "이런", "그리고", "또는", "있는", "하는", "위해",
]);
function deriveSearchContext(input: QuoteInput): { query: string; tokens: string[] } {
  const text = `${input.clientName ?? ""} ${input.requirements ?? ""} ${input.workScope ?? ""} ${input.platform ?? ""}`.toLowerCase();
  const matched: { query: string; match: string[] }[] = [];
  for (const d of DOMAIN_MAP) {
    if (d.match.some((m) => text.includes(m.toLowerCase()))) matched.push(d);
  }
  // 한글 2자 이상 명사성 토큰(빈도순) 추출
  const freq = new Map<string, number>();
  for (const w of (text.match(/[가-힣]{2,}/g) ?? [])) {
    if (KW_STOP.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const salient = [...freq.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]).slice(0, 8);
  const domainTokens = matched.flatMap((d) => d.match);
  const tokens = [...new Set([...domainTokens, ...salient])].filter((t) => t.length >= 2);
  const query = matched.length > 0 ? matched[0]!.query : (salient[0] ?? input.platform ?? "웹");
  return { query, tokens };
}
function isRelevantTitle(title: string, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const t = title.toLowerCase();
  return tokens.some((k) => k.length >= 2 && t.includes(k.toLowerCase()));
}

function buildMarketRefsMd(refs: MarketRef[]): string {
  if (!refs.length) return "(외부 시세 참고 자료 없음 — research[] 는 빈 배열로 둘 것)";
  return refs
    .map(
      (r) =>
        `- [${r.source}] ${r.title} | 견적금액 ${r.priceRange ?? "(비공개)"} | 투입인원 ${r.headcount ?? "(미상)"} | 기간 ${r.period ?? "(미상)"} | ${r.url}`,
    )
    .join("\n");
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
      const searchCtx = deriveSearchContext(input);
      const marketRefs = await fetchMarketRefs(searchCtx.query, searchCtx.tokens).catch(() => [] as MarketRef[]);
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
      const refByUrl = new Map(marketRefs.map((r) => [r.url, r] as const));
      const pastIds = new Set(pastQuotes.map((q) => q.quoteId));
      // research: LLM 이 고른 (실재 url) 유사건을 우선 유지하되, 표준 컬럼(프로젝트명/견적금액/투입인원/기간)은
      // 실제 수집한 MarketRef 값으로 덮어써 정확성을 보장한다. 표시 안 된 소스는 최근 프로젝트로 보강해
      // 위시켓/프리모아/원티드긱스 실링크가 고루 보이게 한다(시세 리서치 = 다양성 유익).
      const enriched = (analysis.research ?? [])
        .filter((r) => r.url != null && refByUrl.has(r.url))
        .map((r) => {
          const ref = refByUrl.get(r.url!)!;
          return {
            source: ref.source,
            projectName: ref.title,
            url: ref.url,
            insight: r.insight,
            priceRange: ref.priceRange,
            headcount: ref.headcount ?? null,
            period: ref.period ?? null,
          };
        });
      const used = new Set(enriched.map((r) => r.url));
      const perSrc: Record<string, number> = {};
      for (const r of enriched) perSrc[r.source] = (perSrc[r.source] ?? 0) + 1;
      const appended: typeof enriched = [];
      for (const ref of marketRefs) {
        if (used.has(ref.url) || (perSrc[ref.source] ?? 0) >= 2) continue;
        if (enriched.length + appended.length >= 9) break;
        perSrc[ref.source] = (perSrc[ref.source] ?? 0) + 1;
        used.add(ref.url);
        appended.push({
          source: ref.source,
          projectName: ref.title,
          url: ref.url,
          insight: `${ref.source} 최근 등록 프로젝트 — 시세 참고`,
          priceRange: ref.priceRange,
          headcount: ref.headcount ?? null,
          period: ref.period ?? null,
        });
      }
      analysis.research = [...enriched, ...appended];
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
      // 편집기/렌더가 항상 '일정/유의사항' 텍스트를 갖도록, 비어 있으면 정중한 기본 문구를 메모리에서 채운다(미저장).
      if (q.analysis && !(q.analysis.notes ?? "").trim()) {
        q.analysis.notes = buildDefaultNotesText(q.analysis);
      }
      // 읽을 때 재렌더: 분석 결과가 있고 발행 확정 전이면 현재 템플릿/공급자 기준으로 html 을 다시 만든다.
      // (템플릿·라벨 변경이 재산정 없이 즉시 반영됨. published 는 발송 스냅샷이라 동결.)
      if (q.analysis && q.status !== "published") {
        try {
          const supplier = await loadSupplier(ctx);
          q.html = renderQuoteHtml(q, q.analysis, supplier);
        } catch {
          /* 렌더 실패 시 저장된 html 유지 */
        }
      }
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
      const quoteType = input.quoteType === "maintenance" ? "maintenance" : "development";
      await ctx.db.execute(
        `INSERT INTO ${T_QUOTES}
           (id, company_id, client_name, requirements, work_scope, expected_price, platform, vat_mode, quote_type, status, reference_docs)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10::jsonb)`,
        [
          id,
          companyId,
          stripControlChars(input.clientName).trim(),
          stripControlChars(input.requirements ?? ""),
          stripControlChars(input.workScope ?? ""),
          input.expectedPrice ?? null,
          input.platform ? stripControlChars(input.platform) : null,
          input.vatMode ?? "별도",
          quoteType,
          JSON.stringify(referenceDocs),
        ],
      );
      return { id };
    });

    // 견적 내용 직접 수정(LLM 없이). 항목/할인/요약/범위/유형 편집 → 가격 결정론적 재계산 → html 재렌더.
    ctx.actions.register(ACTION.editQuote, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const quote = await loadQuote(ctx, companyId, id);
      if (!quote) throw new Error("견적을 찾을 수 없습니다.");
      if (!quote.analysis) throw new Error("분석 결과가 없는 견적은 편집할 수 없습니다. 먼저 분석하세요.");
      const a = quote.analysis;
      const clean = (v: unknown): string => stripControlChars(String(v ?? "")).trim();
      const quoteType =
        params.quoteType === "maintenance" ? "maintenance" : params.quoteType === "development" ? "development" : quote.quoteType;

      if (params.summary !== undefined) a.summary = clean(params.summary) || a.summary;
      if (params.groupTitle !== undefined) a.groupTitle = clean(params.groupTitle) || null;
      if (params.period !== undefined) a.period = clean(params.period) || null;
      if (params.notes !== undefined) {
        // 일정/유의사항: 여러 줄 텍스트. 빈 값이면 null(렌더 시 기본 문구로 폴백).
        const n = stripControlChars(String(params.notes ?? "")).replace(/\r\n/g, "\n").trim();
        a.notes = n.length > 0 ? n : null;
      }

      if (Array.isArray(params.standardItems)) {
        a.standardItems = (params.standardItems as Record<string, unknown>[])
          .map((it, i) => ({
            no: Number(it.no) || i + 1,
            category: clean(it.category),
            item: clean(it.item),
            scopeBasis: clean(it.scopeBasis),
            evidence: clean(it.evidence),
            standardPrice: Math.max(0, Math.round(Number(it.standardPrice) || 0)),
          }))
          .filter((it) => it.item || it.category);
      }
      if (Array.isArray(params.discounts)) {
        a.discounts = (params.discounts as Record<string, unknown>[])
          .map((d) => ({ type: clean(d.type), desc: clean(d.desc), adjust: Math.round(Number(d.adjust) || 0) }))
          .filter((d) => d.type || d.adjust !== 0);
      }
      if (params.scope && typeof params.scope === "object") {
        const sp = params.scope as Record<string, unknown>;
        const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => clean(x)).filter(Boolean) : []);
        a.scope = {
          included: arr(sp.included),
          excluded: arr(sp.excluded),
          assumptions: arr(sp.assumptions),
          externalCosts: arr(sp.externalCosts),
        };
      }

      // 가격 결정론적 재계산(표준가=Σ항목, 제안가=표준+할인, vat/total 공급가 10%).
      const standardSupply = a.standardItems.reduce((s, it) => s + (Number.isFinite(it.standardPrice) ? it.standardPrice : 0), 0);
      const discountSum = a.discounts.reduce((s, d) => s + (Number.isFinite(d.adjust) ? d.adjust : 0), 0);
      const proposedSupply = Math.max(0, standardSupply + discountSum);
      const vat = Math.round(proposedSupply * 0.1);
      a.pricing = { ...a.pricing, standardSupply, proposedSupply, vat, total: proposedSupply + vat };

      const supplier = await loadSupplier(ctx);
      const merged: QuoteRecord = { ...quote, quoteType, analysis: a };
      const html = renderQuoteHtml(merged, a, supplier);
      await ctx.db.execute(
        `UPDATE ${T_QUOTES} SET analysis=$3::jsonb, html=$4, quote_type=$5,
           status=CASE WHEN status='published' THEN 'analyzed' ELSE status END, updated_at=now()
         WHERE company_id=$1 AND id=$2`,
        [companyId, id, JSON.stringify(a), html, quoteType],
      );
      return { ok: true };
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
      await ctx.db.execute(`DELETE FROM ${T_COMMENTS} WHERE quote_id=$1`, [id]);
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
      const marketPrice = params.marketPrice == null || params.marketPrice === "" ? null : Math.max(0, Math.round(Number(params.marketPrice) || 0));
      const reuseRaw = params.reuseLevel == null ? "" : stripControlChars(String(params.reuseLevel)).trim();
      const reuseLevel = reuseRaw.length > 0 ? reuseRaw : null;
      const sortOrder = Math.round(Number(params.sortOrder) || 0);
      await ensureRateSheetSeeded(ctx);
      await ctx.db.execute(
        `INSERT INTO ${T_RATE_SHEET} (id, category, item, scope_basis, standard_price, market_price, reuse_level, note, sort_order, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
         ON CONFLICT (id) DO UPDATE SET
           category=$2, item=$3, scope_basis=$4, standard_price=$5, market_price=$6, reuse_level=$7, note=$8, sort_order=$9, updated_at=now()`,
        [id, category, item, scopeBasis, standardPrice, marketPrice, reuseLevel, note, sortOrder],
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
