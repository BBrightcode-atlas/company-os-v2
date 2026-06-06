import { randomUUID } from "node:crypto";
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import {
  ACTION,
  DATA,
  T_PAGES,
  T_LINKS,
  T_SOURCES,
  SLUG_INDEX,
  SLUG_LOG,
  isSystemSlug,
  pageKindLabel,
  ingestChannel,
  slugify,
  extractWikiTargets,
  PAGE_KINDS,
  type AskResult,
  type GraphData,
  type IngestLogEntry,
  type PageAuthor,
  type PageDetail,
  type PageKind,
  type WikiPage,
  type WikiSource,
} from "./wiki.js";
import { MAINTAINER_INSTRUCTIONS, DEFAULT_SCHEMA_MD } from "./agent/instructions.js";
import {
  buildIngestPrompt,
  parseIngestPlan,
  buildAskPrompt,
  parseAskResult,
  buildSelectPrompt,
  parseSelectSlugs,
  buildSuggestLinksPrompt,
  parseSuggestLinks,
} from "./lib/generation.js";

// ── LLM: vibeproxy 직접 호출(host managed-agent 프롬프트 유실 + ctx.http SSRF 가드 우회) ──
const LLM_BASE = (process.env.ANTHROPIC_BASE_URL || "http://localhost:8317").replace(/\/+$/, "");
const LLM_KEY = process.env.ANTHROPIC_API_KEY || "no-key-required";
const LLM_MODEL = process.env.WIKI_LLM_MODEL || "claude-opus-4-8";

const SYSTEM_GUARD = [
  "너는 위키 데이터를 JSON 으로만 출력하는 순수 함수다. 대화형 에이전트가 아니다.",
  "파일시스템·도구·웹·AGENTS.md 가 전혀 없다. 무엇을 찾거나 읽으려 하지 마라.",
  "필요한 모든 입력은 user 메시지 안에 전부 들어있다. 그것만으로 즉시 산출하라.",
  "출력은 유효한 JSON 객체 하나뿐. 첫 글자 '{', 마지막 글자 '}'. 서론·설명·코드펜스·도구호출 금지.",
].join("\n");

async function callLlmJson(referenceSpec: string, userPrompt: string, maxTokens = 16000): Promise<string> {
  const userContent =
    `아래는 위키 유지 방법론(참고자료)과 요청이다. 방법론을 적용해 결과 JSON 을 만들어라.\n\n` +
    `===== 위키 유지 방법론 =====\n${referenceSpec}\n\n` +
    `===== 요청 =====\n${userPrompt}\n\n` +
    `(반드시 JSON 객체 하나만 출력. 첫 글자 '{', 마지막 글자 '}'.)`;
  const res = await fetch(`${LLM_BASE}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": LLM_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: maxTokens,
      system: SYSTEM_GUARD,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`LLM 호출 실패 (${res.status}): ${t.slice(0, 300)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
  if (!text.trim()) throw new Error("LLM 응답이 비어 있습니다.");
  return text;
}

type AnyCtx = Parameters<NonNullable<Parameters<typeof definePlugin>[0]["setup"]>>[0];

function asCompanyId(params: Record<string, unknown>, ctxCompanyId?: string | null): string {
  const v = (params.companyId as string) ?? ctxCompanyId ?? null;
  if (!v) throw new Error("companyId 가 필요합니다.");
  return String(v);
}

const isoOf = (v: unknown): string =>
  v instanceof Date ? v.toISOString() : v == null ? "" : String(v);

function rowToPage(r: Record<string, unknown>): WikiPage {
  const tags = Array.isArray(r.tags) ? (r.tags as string[]) : [];
  const kind = (r.kind as PageKind) ?? "note";
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    slug: String(r.slug),
    title: String(r.title ?? ""),
    kind: PAGE_KINDS.includes(kind) ? kind : "note",
    body: String(r.body ?? ""),
    tags,
    author: (r.author as PageAuthor) ?? "user",
    sourceCount: r.source_count == null ? 0 : Number(r.source_count),
    createdAt: isoOf(r.created_at),
    updatedAt: isoOf(r.updated_at),
  };
}

function rowToSource(r: Record<string, unknown>): WikiSource {
  const log = Array.isArray(r.ingest_log) ? (r.ingest_log as IngestLogEntry[]) : [];
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    title: String(r.title ?? ""),
    url: r.url == null ? null : String(r.url),
    rawMd: String(r.raw_md ?? ""),
    status: (r.status as WikiSource["status"]) ?? "pending",
    summary: r.summary == null ? null : String(r.summary),
    errorMessage: r.error_message == null ? null : String(r.error_message),
    ingestLog: log,
    integratedAt: r.integrated_at == null ? null : isoOf(r.integrated_at),
    createdAt: isoOf(r.created_at),
  };
}

// ── 페이지 조회 ─────────────────────────────────────────────────────────────
async function loadPageBySlug(ctx: AnyCtx, companyId: string, slug: string): Promise<WikiPage | null> {
  const rows = await ctx.db.query<Record<string, unknown>>(
    `SELECT * FROM ${T_PAGES} WHERE company_id=$1 AND slug=$2`,
    [companyId, slug],
  );
  return rows[0] ? rowToPage(rows[0]) : null;
}
async function loadPageById(ctx: AnyCtx, companyId: string, id: string): Promise<WikiPage | null> {
  const rows = await ctx.db.query<Record<string, unknown>>(
    `SELECT * FROM ${T_PAGES} WHERE company_id=$1 AND id=$2`,
    [companyId, id],
  );
  return rows[0] ? rowToPage(rows[0]) : null;
}

// 후보 페이지 검색(ingest/ask 컨텍스트). 어휘 ILIKE(title/body/tags). 없으면 최근.
async function candidatePages(ctx: AnyCtx, companyId: string, query: string, limit = 12): Promise<WikiPage[]> {
  const words = Array.from(
    new Set(
      (query || "")
        .toLowerCase()
        .split(/[\s,./|()[\]{}#"'`]+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2),
    ),
  ).slice(0, 10);
  if (words.length === 0) {
    const rows = await ctx.db.query<Record<string, unknown>>(
      `SELECT * FROM ${T_PAGES} WHERE company_id=$1 ORDER BY updated_at DESC LIMIT $2`,
      [companyId, limit],
    );
    return rows.map(rowToPage);
  }
  const params: unknown[] = [companyId];
  const ors = words
    .map((w) => {
      params.push(`%${w}%`);
      const p = `$${params.length}`;
      return `(title ILIKE ${p} OR body ILIKE ${p} OR tags::text ILIKE ${p})`;
    })
    .join(" OR ");
  params.push(limit);
  const rows = await ctx.db.query<Record<string, unknown>>(
    `SELECT * FROM ${T_PAGES} WHERE company_id=$1 AND (${ors}) ORDER BY updated_at DESC LIMIT $${params.length}`,
    params,
  );
  return rows.map(rowToPage);
}

// ── 링크 재구축: 페이지 본문 [[...]] 파싱 → links 갱신, 양방향 해석 ──────────
async function rebuildLinks(ctx: AnyCtx, companyId: string, page: WikiPage): Promise<void> {
  await ctx.db.execute(`DELETE FROM ${T_LINKS} WHERE company_id=$1 AND source_page_id=$2`, [
    companyId,
    page.id,
  ]);
  const targets = extractWikiTargets(page.body);
  for (const target of targets) {
    const t = await ctx.db.query<Record<string, unknown>>(
      `SELECT id FROM ${T_PAGES} WHERE company_id=$1 AND slug=$2`,
      [companyId, target],
    );
    const targetPageId = t[0] ? String(t[0].id) : null;
    await ctx.db.execute(
      `INSERT INTO ${T_LINKS} (id, company_id, source_page_id, target_slug, target_page_id) VALUES ($1,$2,$3,$4,$5)`,
      [randomUUID(), companyId, page.id, target, targetPageId],
    );
  }
  // 이 페이지를 미해결로 가리키던 링크들을 해석.
  await ctx.db.execute(
    `UPDATE ${T_LINKS} SET target_page_id=$3 WHERE company_id=$1 AND target_slug=$2 AND target_page_id IS NULL`,
    [companyId, page.slug, page.id],
  );
}

// ── 페이지 upsert (createPage/updatePage/tool/ingest 공유) ──────────────────
async function upsertPageBySlug(
  ctx: AnyCtx,
  companyId: string,
  input: { slug: string; title: string; kind: PageKind; body: string; tags?: string[]; author: PageAuthor },
  opts: { bumpSource?: boolean } = {},
): Promise<{ page: WikiPage; created: boolean }> {
  const existing = await loadPageBySlug(ctx, companyId, input.slug);
  const tags = JSON.stringify(input.tags ?? existing?.tags ?? []);
  if (existing) {
    await ctx.db.execute(
      `UPDATE ${T_PAGES} SET title=$3, kind=$4, body=$5, tags=$6::jsonb, source_count=source_count+$7, updated_at=now()
       WHERE company_id=$1 AND id=$2`,
      [companyId, existing.id, input.title, input.kind, input.body, tags, opts.bumpSource ? 1 : 0],
    );
    const page = (await loadPageById(ctx, companyId, existing.id))!;
    await rebuildLinks(ctx, companyId, page);
    return { page, created: false };
  }
  const id = randomUUID();
  await ctx.db.execute(
    `INSERT INTO ${T_PAGES} (id, company_id, slug, title, kind, body, tags, author, source_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
    [id, companyId, input.slug, input.title, input.kind, input.body, tags, input.author, opts.bumpSource ? 1 : 0],
  );
  const page = (await loadPageById(ctx, companyId, id))!;
  await rebuildLinks(ctx, companyId, page);
  return { page, created: true };
}

// 새 slug 충돌 시 -2,-3.. 부여(사용자 생성용).
async function uniqueSlug(ctx: AnyCtx, companyId: string, base: string): Promise<string> {
  let slug = base;
  for (let i = 2; i < 1000; i++) {
    const exists = await loadPageBySlug(ctx, companyId, slug);
    if (!exists) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${randomUUID().slice(0, 6)}`;
}

// ── index/log 자동유지(karpathy 복리 코어) ──────────────────────────────────
// 본문 첫 의미있는 줄을 1줄 요약으로(헤딩/마크다운 제거, ~90자).
function firstLineSummary(body: string): string {
  const line = (body || "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !/^[#>\-*`|]/.test(l) && !/^\[\[/.test(l));
  if (!line) return "";
  const clean = line
    .replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_m, s, l) => l || s)
    .replace(/[*_`]/g, "")
    .trim();
  return clean.length > 90 ? clean.slice(0, 90) + "…" : clean;
}

// 시스템 페이지(index/log) upsert — rebuildLinks 안 함(메가허브 방지).
async function upsertSystemPage(
  ctx: AnyCtx,
  companyId: string,
  slug: string,
  title: string,
  kind: PageKind,
  body: string,
): Promise<void> {
  const existing = await loadPageBySlug(ctx, companyId, slug);
  if (existing) {
    await ctx.db.execute(
      `UPDATE ${T_PAGES} SET title=$3, kind=$4, body=$5, updated_at=now() WHERE company_id=$1 AND id=$2`,
      [companyId, existing.id, title, kind, body],
    );
  } else {
    await ctx.db.execute(
      `INSERT INTO ${T_PAGES} (id, company_id, slug, title, kind, body, tags, author, source_count)
       VALUES ($1,$2,$3,$4,$5,$6,'[]'::jsonb,'system',0)`,
      [randomUUID(), companyId, slug, title, kind, body],
    );
  }
}

// 전체 페이지 카탈로그(카테고리별)로 index 페이지 재생성. 답변 시 먼저 읽고 drill-in.
async function rebuildIndex(ctx: AnyCtx, companyId: string): Promise<void> {
  const rows = await ctx.db.query<Record<string, unknown>>(
    `SELECT slug, title, kind, body, source_count FROM ${T_PAGES}
     WHERE company_id=$1 AND slug NOT IN ($2, $3) ORDER BY kind, title`,
    [companyId, SLUG_INDEX, SLUG_LOG],
  );
  const byKind = new Map<string, string[]>();
  for (const r of rows) {
    const kind = String(r.kind);
    const slug = String(r.slug);
    const title = String(r.title);
    const sum = firstLineSummary(String(r.body ?? ""));
    const sc = Number(r.source_count ?? 0);
    const line = `- [[${slug}]] ${title}${sum ? ` — ${sum}` : ""}${sc > 0 ? ` _(${sc} 소스)_` : ""}`;
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind)!.push(line);
  }
  const order: PageKind[] = ["overview", "synthesis", "moc", "entity", "concept", "note"];
  const parts = [`# 📚 인덱스`, "", `전체 ${rows.length} 페이지. 위키 탐색의 시작점.`, ""];
  for (const k of order) {
    const list = byKind.get(k);
    if (!list || list.length === 0) continue;
    parts.push(`## ${pageKindLabel(k)} (${list.length})`, ...list, "");
  }
  if (rows.length === 0) parts.push("_(아직 페이지가 없습니다. 소스를 ingest 하거나 페이지를 작성하세요.)_");
  await upsertSystemPage(ctx, companyId, SLUG_INDEX, "📚 인덱스", "overview", parts.join("\n"));
}

// 활동 로그 append(최신 위, 최대 400줄 유지).
async function appendLog(ctx: AnyCtx, companyId: string, type: string, title: string): Promise<void> {
  const now = new Date();
  const ts = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;
  const entry = `- \`[${ts}]\` **${type}** | ${title}`;
  const existing = await loadPageBySlug(ctx, companyId, SLUG_LOG);
  const prev = existing?.body ?? "# 🕑 활동 로그\n";
  const head = "# 🕑 활동 로그\n";
  const lines = prev.startsWith(head) ? prev.slice(head.length).split("\n").filter(Boolean) : prev.split("\n").filter(Boolean);
  const next = [entry, ...lines].slice(0, 400);
  await upsertSystemPage(ctx, companyId, SLUG_LOG, "🕑 활동 로그", "note", head + "\n" + next.join("\n") + "\n");
}


const skillReady = new Set<string>();
async function ensureSkill(ctx: AnyCtx, companyId: string): Promise<void> {
  if (skillReady.has(companyId)) return;
  skillReady.add(companyId);
  try {
    await (ctx as { skills?: { managed?: { reconcile?: (k: string, c: string) => Promise<unknown> } } }).skills
      ?.managed?.reconcile?.("maintainer", companyId);
  } catch {
    /* skill reconcile 실패는 무시(위키 동작엔 영향 없음) */
  }
}

// ── ingest job (fire-and-forget) ────────────────────────────────────────────
async function runIngest(ctx: AnyCtx, companyId: string, sourceId: string): Promise<void> {
  const channel = ingestChannel(sourceId);
  const emit = (phase: string, message: string) => {
    try {
      ctx.streams.emit(channel, { phase, message, at: new Date().toISOString() });
    } catch {
      /* streams 미연결 무시 */
    }
  };
  try {
    ctx.streams.open(channel, companyId);
  } catch {
    /* ignore */
  }
  try {
    const rows = await ctx.db.query<Record<string, unknown>>(
      `SELECT * FROM ${T_SOURCES} WHERE company_id=$1 AND id=$2`,
      [companyId, sourceId],
    );
    const source = rows[0] ? rowToSource(rows[0]) : null;
    if (!source) throw new Error("소스를 찾을 수 없습니다.");
    emit("retrieve", "관련 페이지 검색");
    const cands = await candidatePages(ctx, companyId, `${source.title} ${source.rawMd.slice(0, 600)}`, 12);
    emit("llm", "LLM 통합 중");
    const raw = await callLlmJson(MAINTAINER_INSTRUCTIONS, buildIngestPrompt(source, cands), 32000);
    const plan = parseIngestPlan(raw);
    const log: IngestLogEntry[] = [];
    for (const p of plan.pages) {
      const { created } = await upsertPageBySlug(
        ctx,
        companyId,
        { slug: p.slug, title: p.title, kind: p.kind, body: p.body, author: "agent" },
        { bumpSource: true },
      );
      log.push({ op: created ? "create" : "update", slug: p.slug, title: p.title, note: p.note });
      emit("apply", `${created ? "생성" : "갱신"}: ${p.title}`);
    }
    await ctx.db.execute(
      `UPDATE ${T_SOURCES} SET status='integrated', summary=$3, ingest_log=$4::jsonb, error_message=NULL, integrated_at=now()
       WHERE company_id=$1 AND id=$2`,
      [companyId, sourceId, plan.summary || null, JSON.stringify(log)],
    );
    await rebuildIndex(ctx, companyId);
    await appendLog(ctx, companyId, "통합", `${source.title} → 페이지 ${log.length}건`);
    emit("done", `완료: 페이지 ${log.length}건`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ctx.logger.error("wiki ingest failed", { sourceId, msg });
    await ctx.db
      .execute(`UPDATE ${T_SOURCES} SET status='error', error_message=$3 WHERE company_id=$1 AND id=$2`, [
        companyId,
        sourceId,
        msg.slice(0, 500),
      ])
      .catch(() => {});
    emit("error", msg.slice(0, 200));
  } finally {
    try {
      ctx.streams.close(channel);
    } catch {
      /* ignore */
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
const plugin = definePlugin({
  async setup(ctx) {
    // ── DATA providers ──────────────────────────────────────────────────────
    ctx.data.register(DATA.listPages, async (params) => {
      const companyId = asCompanyId(params);
      const kind = params.kind ? String(params.kind) : null;
      const q = params.q ? String(params.q).trim() : null;
      const tag = params.tag ? String(params.tag) : null;
      const where: string[] = ["company_id=$1", "slug NOT IN ($2, $3)"];
      const args: unknown[] = [companyId, SLUG_INDEX, SLUG_LOG];
      if (kind) {
        args.push(kind);
        where.push(`kind=$${args.length}`);
      }
      if (tag) {
        args.push(`%"${tag}"%`);
        where.push(`tags::text ILIKE $${args.length}`);
      }
      if (q) {
        args.push(`%${q}%`);
        where.push(`(title ILIKE $${args.length} OR body ILIKE $${args.length})`);
      }
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT id, company_id, slug, title, kind, tags, author, source_count, created_at, updated_at, '' AS body
         FROM ${T_PAGES} WHERE ${where.join(" AND ")} ORDER BY updated_at DESC LIMIT 500`,
        args,
      );
      return rows.map(rowToPage);
    });

    ctx.data.register(DATA.getPage, async (params): Promise<PageDetail> => {
      const companyId = asCompanyId(params);
      const slug = slugify(String(params.slug ?? ""));
      const page = await loadPageBySlug(ctx, companyId, slug);
      if (!page) throw new Error("페이지를 찾을 수 없습니다.");
      const back = await ctx.db.query<Record<string, unknown>>(
        `SELECT p.id, p.slug, p.title FROM ${T_LINKS} l JOIN ${T_PAGES} p ON p.id=l.source_page_id
         WHERE l.company_id=$1 AND l.target_page_id=$2 ORDER BY p.title`,
        [companyId, page.id],
      );
      const out = await ctx.db.query<Record<string, unknown>>(
        `SELECT l.target_slug, l.target_page_id, p.title FROM ${T_LINKS} l
         LEFT JOIN ${T_PAGES} p ON p.id=l.target_page_id
         WHERE l.company_id=$1 AND l.source_page_id=$2 ORDER BY l.target_slug`,
        [companyId, page.id],
      );
      return {
        page,
        backlinks: back.map((r) => ({ id: String(r.id), slug: String(r.slug), title: String(r.title) })),
        outbound: out.map((r) => ({
          slug: String(r.target_slug),
          title: r.title == null ? null : String(r.title),
          resolved: r.target_page_id != null,
        })),
      };
    });

    ctx.data.register(DATA.getGraph, async (params): Promise<GraphData> => {
      const companyId = asCompanyId(params);
      const pages = await ctx.db.query<Record<string, unknown>>(
        `SELECT id, slug, title, kind FROM ${T_PAGES} WHERE company_id=$1 AND slug NOT IN ($2, $3)`,
        [companyId, SLUG_INDEX, SLUG_LOG],
      );
      const edgesRaw = await ctx.db.query<Record<string, unknown>>(
        `SELECT DISTINCT source_page_id, target_page_id FROM ${T_LINKS}
         WHERE company_id=$1 AND target_page_id IS NOT NULL AND target_page_id <> source_page_id`,
        [companyId],
      );
      const degree = new Map<string, number>();
      for (const e of edgesRaw) {
        degree.set(String(e.source_page_id), (degree.get(String(e.source_page_id)) ?? 0) + 1);
        degree.set(String(e.target_page_id), (degree.get(String(e.target_page_id)) ?? 0) + 1);
      }
      return {
        nodes: pages.map((p) => ({
          id: String(p.id),
          slug: String(p.slug),
          title: String(p.title),
          kind: ((p.kind as PageKind) ?? "note") as PageKind,
          degree: degree.get(String(p.id)) ?? 0,
        })),
        edges: edgesRaw.map((e) => ({ source: String(e.source_page_id), target: String(e.target_page_id) })),
      };
    });

    ctx.data.register(DATA.listSources, async (params) => {
      const companyId = asCompanyId(params);
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT id, company_id, title, url, status, summary, error_message, ingest_log, integrated_at, created_at, '' AS raw_md
         FROM ${T_SOURCES} WHERE company_id=$1 ORDER BY created_at DESC LIMIT 300`,
        [companyId],
      );
      return rows.map(rowToSource);
    });

    ctx.data.register(DATA.getSource, async (params) => {
      const companyId = asCompanyId(params);
      const id = String(params.id ?? "");
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${T_SOURCES} WHERE company_id=$1 AND id=$2`,
        [companyId, id],
      );
      if (!rows[0]) throw new Error("소스를 찾을 수 없습니다.");
      return rowToSource(rows[0]);
    });

    ctx.data.register(DATA.listTags, async (params) => {
      const companyId = asCompanyId(params);
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT jsonb_array_elements_text(tags) AS tag, count(*)::int AS n FROM ${T_PAGES}
         WHERE company_id=$1 GROUP BY tag ORDER BY n DESC, tag`,
        [companyId],
      );
      return rows.map((r) => ({ tag: String(r.tag), count: Number(r.n) }));
    });

    ctx.data.register(DATA.stats, async (params) => {
      const companyId = asCompanyId(params);
      const [pc] = await ctx.db.query<Record<string, unknown>>(
        `SELECT count(*)::int AS n FROM ${T_PAGES} WHERE company_id=$1 AND slug NOT IN ($2, $3)`,
        [companyId, SLUG_INDEX, SLUG_LOG],
      );
      const [sc] = await ctx.db.query<Record<string, unknown>>(
        `SELECT count(*)::int AS total, count(*) FILTER (WHERE status='pending')::int AS pending,
                count(*) FILTER (WHERE status='integrated')::int AS integrated
         FROM ${T_SOURCES} WHERE company_id=$1`,
        [companyId],
      );
      const [uc] = await ctx.db.query<Record<string, unknown>>(
        `SELECT count(*)::int AS n FROM ${T_LINKS} WHERE company_id=$1 AND target_page_id IS NULL`,
        [companyId],
      );
      const [oc] = await ctx.db.query<Record<string, unknown>>(
        `SELECT count(*)::int AS n FROM ${T_PAGES} p WHERE p.company_id=$1 AND p.slug NOT IN ($2, $3)
           AND NOT EXISTS (SELECT 1 FROM ${T_LINKS} l WHERE l.company_id=$1 AND l.source_page_id=p.id)
           AND NOT EXISTS (SELECT 1 FROM ${T_LINKS} l WHERE l.company_id=$1 AND l.target_page_id=p.id)`,
        [companyId, SLUG_INDEX, SLUG_LOG],
      );
      const recent = await ctx.db.query<Record<string, unknown>>(
        `SELECT id, company_id, slug, title, kind, tags, author, source_count, created_at, updated_at, '' AS body
         FROM ${T_PAGES} WHERE company_id=$1 AND slug NOT IN ($2, $3) ORDER BY updated_at DESC LIMIT 8`,
        [companyId, SLUG_INDEX, SLUG_LOG],
      );
      const [hasSys] = await ctx.db.query<Record<string, unknown>>(
        `SELECT count(*)::int AS n FROM ${T_PAGES} WHERE company_id=$1 AND slug=$2`,
        [companyId, SLUG_INDEX],
      );
      return {
        pages: Number(pc?.n ?? 0),
        sources: Number(sc?.total ?? 0),
        sourcesPending: Number(sc?.pending ?? 0),
        sourcesIntegrated: Number(sc?.integrated ?? 0),
        unresolvedLinks: Number(uc?.n ?? 0),
        orphans: Number(oc?.n ?? 0),
        hasIndex: Number(hasSys?.n ?? 0) > 0,
        recent: recent.map(rowToPage),
      };
    });

    ctx.data.register(DATA.getSchema, async (params) => {
      const companyId = asCompanyId(params);
      const v = await ctx.state.get({ scopeKind: "company", scopeId: companyId, stateKey: "schema" });
      return { schema: typeof v === "string" && v.trim() ? v : DEFAULT_SCHEMA_MD, isDefault: !(typeof v === "string" && v.trim()) };
    });

    // ── ACTIONS ─────────────────────────────────────────────────────────────
    ctx.actions.register(ACTION.createPage, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      void ensureSkill(ctx, companyId);
      const title = String(params.title ?? "").trim();
      if (!title) throw new Error("제목을 입력하세요.");
      const base = slugify(String(params.slug ?? "") || title);
      const slug = await uniqueSlug(ctx, companyId, base);
      const kind = (PAGE_KINDS.includes(params.kind as PageKind) ? params.kind : "note") as PageKind;
      const tags = Array.isArray(params.tags) ? (params.tags as string[]).map(String) : [];
      const { page } = await upsertPageBySlug(
        ctx,
        companyId,
        { slug, title, kind, body: String(params.body ?? ""), tags, author: "user" },
      );
      await rebuildIndex(ctx, companyId);
      return { slug: page.slug, id: page.id };
    });

    ctx.actions.register(ACTION.updatePage, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const page = await loadPageById(ctx, companyId, id);
      if (!page) throw new Error("페이지를 찾을 수 없습니다.");
      const title = String(params.title ?? page.title).trim() || page.title;
      const kind = (PAGE_KINDS.includes(params.kind as PageKind) ? params.kind : page.kind) as PageKind;
      const body = params.body == null ? page.body : String(params.body);
      const tags = Array.isArray(params.tags) ? (params.tags as string[]).map(String) : page.tags;
      await ctx.db.execute(
        `UPDATE ${T_PAGES} SET title=$3, kind=$4, body=$5, tags=$6::jsonb, updated_at=now() WHERE company_id=$1 AND id=$2`,
        [companyId, id, title, kind, body, JSON.stringify(tags)],
      );
      const fresh = (await loadPageById(ctx, companyId, id))!;
      if (!isSystemSlug(fresh.slug)) {
        await rebuildLinks(ctx, companyId, fresh);
        await rebuildIndex(ctx, companyId);
      }
      return { slug: fresh.slug };
    });

    ctx.actions.register(ACTION.deletePage, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const page = await loadPageById(ctx, companyId, id);
      if (!page) throw new Error("페이지를 찾을 수 없습니다.");
      await ctx.db.execute(`DELETE FROM ${T_LINKS} WHERE company_id=$1 AND source_page_id=$2`, [companyId, id]);
      // 이 페이지를 가리키던 링크는 미해결로 되돌림.
      await ctx.db.execute(
        `UPDATE ${T_LINKS} SET target_page_id=NULL WHERE company_id=$1 AND target_page_id=$2`,
        [companyId, id],
      );
      await ctx.db.execute(`DELETE FROM ${T_PAGES} WHERE company_id=$1 AND id=$2`, [companyId, id]);
      await rebuildIndex(ctx, companyId);
      return { ok: true };
    });

    ctx.actions.register(ACTION.addSource, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const title = String(params.title ?? "").trim();
      const rawMd = String(params.rawMd ?? params.raw_md ?? "").trim();
      if (!title) throw new Error("소스 제목을 입력하세요.");
      if (!rawMd) throw new Error("소스 내용을 입력하세요.");
      const id = randomUUID();
      await ctx.db.execute(
        `INSERT INTO ${T_SOURCES} (id, company_id, title, url, raw_md, status) VALUES ($1,$2,$3,$4,$5,'pending')`,
        [id, companyId, title, params.url ? String(params.url) : null, rawMd],
      );
      return { id };
    });

    ctx.actions.register(ACTION.ingestSource, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      void ensureSkill(ctx, companyId);
      const id = String(params.id ?? "");
      // 원자적 claim — 이미 integrating 이면 거부.
      const r = await ctx.db.execute(
        `UPDATE ${T_SOURCES} SET status='integrating', error_message=NULL WHERE company_id=$1 AND id=$2 AND status<>'integrating'`,
        [companyId, id],
      );
      if (!r.rowCount) throw new Error("이미 통합 중이거나 소스를 찾을 수 없습니다.");
      void runIngest(ctx, companyId, id);
      return { started: true };
    });

    ctx.actions.register(ACTION.deleteSource, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      await ctx.db.execute(`DELETE FROM ${T_SOURCES} WHERE company_id=$1 AND id=$2`, [companyId, id]);
      return { ok: true };
    });

    ctx.actions.register(ACTION.ask, async (params, context): Promise<AskResult & { used: Array<{ slug: string; title: string }> }> => {
      const companyId = asCompanyId(params, context.companyId);
      void ensureSkill(ctx, companyId);
      const question = String(params.question ?? "").trim();
      if (!question) throw new Error("질문을 입력하세요.");

      // index-first: 인덱스 카탈로그로 관련 페이지 선택(pass A) → 본문 drill-in(pass B).
      const indexPage = await loadPageBySlug(ctx, companyId, SLUG_INDEX);
      const selected = new Map<string, WikiPage>();
      if (indexPage && indexPage.body.trim()) {
        try {
          const sel = parseSelectSlugs(await callLlmJson(MAINTAINER_INSTRUCTIONS, buildSelectPrompt(question, indexPage.body), 2000));
          for (const s of sel.slice(0, 12)) {
            if (isSystemSlug(s)) continue;
            const p = await loadPageBySlug(ctx, companyId, s);
            if (p) selected.set(p.slug, p);
          }
        } catch {
          /* 선택 실패 시 어휘검색으로 폴백 */
        }
      }
      // 어휘 검색으로 보강(인덱스 누락/오선택 대비).
      for (const p of await candidatePages(ctx, companyId, question, 8)) {
        if (!isSystemSlug(p.slug)) selected.set(p.slug, p);
      }
      const cands = Array.from(selected.values()).slice(0, 14);
      const raw = await callLlmJson(MAINTAINER_INSTRUCTIONS, buildAskPrompt(question, cands), 8000);
      const result = parseAskResult(raw);
      const bySlug = new Map(cands.map((p) => [p.slug, p.title]));
      const used = result.usedSlugs.map((s) => ({ slug: s, title: bySlug.get(s) ?? s }));
      return { ...result, used };
    });

    // 답변을 위키 페이지로 환원(karpathy: 좋은 답변은 페이지가 되어 누적·복리).
    ctx.actions.register(ACTION.saveAnswer, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const question = String(params.question ?? "").trim();
      const answer = String(params.answer ?? "").trim();
      if (!question || !answer) throw new Error("질문과 답변이 필요합니다.");
      const used = Array.isArray(params.used) ? (params.used as Array<{ slug: string }>) : [];
      const cites = used.map((u) => `- [[${u.slug}]]`).join("\n");
      const body = `${answer}${cites ? `\n\n## 출처\n${cites}` : ""}\n\n_질문: ${question}_`;
      const base = slugify(question);
      const slug = await uniqueSlug(ctx, companyId, base);
      const { page } = await upsertPageBySlug(ctx, companyId, { slug, title: question.slice(0, 80), kind: "synthesis", body, author: "agent" });
      await rebuildIndex(ctx, companyId);
      await appendLog(ctx, companyId, "답변저장", page.title);
      return { slug: page.slug };
    });

    ctx.actions.register(ACTION.suggestLinks, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const id = String(params.id ?? "");
      const page = await loadPageById(ctx, companyId, id);
      if (!page) throw new Error("페이지를 찾을 수 없습니다.");
      const others = (await candidatePages(ctx, companyId, `${page.title} ${page.body.slice(0, 400)}`, 20)).filter(
        (p) => p.id !== page.id,
      );
      if (others.length === 0) return { suggestions: [] };
      const raw = await callLlmJson(MAINTAINER_INSTRUCTIONS, buildSuggestLinksPrompt(page, others), 4000);
      const existing = new Set(extractWikiTargets(page.body));
      const suggestions = parseSuggestLinks(raw).filter((s) => s.slug !== page.slug && !existing.has(s.slug));
      return { suggestions };
    });

    ctx.actions.register(ACTION.setSchema, async (params, context) => {
      const companyId = asCompanyId(params, context.companyId);
      const schema = String(params.schema ?? "");
      await ctx.state.set({ scopeKind: "company", scopeId: companyId, stateKey: "schema" }, schema);
      return { ok: true };
    });

    // ── 플랫폼 코딩 에이전트용 도구 (wiki:*) ──────────────────────────────────
    ctx.tools.register(
      "searchPages",
      { displayName: "Wiki: search", description: "위키 페이지 검색", parametersSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] } },
      async (params, runCtx) => {
        const p = params as { query?: string; limit?: number };
        const pages = await candidatePages(ctx, runCtx.companyId, String(p.query ?? ""), Math.min(Number(p.limit) || 10, 30));
        const content = pages.length
          ? pages.map((x) => `- [[${x.slug}]] ${x.title} (${x.kind})`).join("\n")
          : "(검색 결과 없음)";
        return { content, data: pages.map((x) => ({ slug: x.slug, title: x.title, kind: x.kind })) };
      },
    );

    ctx.tools.register(
      "readPage",
      { displayName: "Wiki: read page", description: "위키 페이지 본문 읽기", parametersSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } },
      async (params, runCtx) => {
        const slug = slugify(String((params as { slug?: string }).slug ?? ""));
        const page = await loadPageBySlug(ctx, runCtx.companyId, slug);
        if (!page) return { error: `페이지 없음: ${slug}` };
        return { content: `# ${page.title}\n\n${page.body}`, data: { slug: page.slug, title: page.title, kind: page.kind } };
      },
    );

    ctx.tools.register(
      "listPages",
      { displayName: "Wiki: list pages", description: "위키 페이지 목록", parametersSchema: { type: "object", properties: { kind: { type: "string" } } } },
      async (params, runCtx) => {
        const kind = (params as { kind?: string }).kind;
        const args: unknown[] = [runCtx.companyId];
        let where = "company_id=$1";
        if (kind) {
          args.push(kind);
          where += ` AND kind=$2`;
        }
        const rows = await ctx.db.query<Record<string, unknown>>(
          `SELECT slug, title, kind FROM ${T_PAGES} WHERE ${where} ORDER BY updated_at DESC LIMIT 500`,
          args,
        );
        const content = rows.length ? rows.map((r) => `- [[${r.slug}]] ${r.title} (${r.kind})`).join("\n") : "(페이지 없음)";
        return { content, data: rows };
      },
    );

    ctx.tools.register(
      "upsertPage",
      { displayName: "Wiki: upsert page", description: "위키 페이지 생성/갱신", parametersSchema: { type: "object", properties: { slug: { type: "string" }, title: { type: "string" }, body: { type: "string" }, kind: { type: "string" } }, required: ["title", "body"] } },
      async (params, runCtx) => {
        const p = params as { slug?: string; title?: string; body?: string; kind?: string };
        const title = String(p.title ?? "").trim();
        if (!title) return { error: "title 필수" };
        const slug = slugify(p.slug || title);
        const kind = (PAGE_KINDS.includes(p.kind as PageKind) ? p.kind : "note") as PageKind;
        const { page, created } = await upsertPageBySlug(ctx, runCtx.companyId, {
          slug,
          title,
          kind,
          body: String(p.body ?? ""),
          author: "agent",
        });
        return { content: `${created ? "생성" : "갱신"}됨: [[${page.slug}]] ${page.title}`, data: { slug: page.slug } };
      },
    );

    ctx.tools.register(
      "addSource",
      { displayName: "Wiki: add source", description: "raw 소스 추가", parametersSchema: { type: "object", properties: { title: { type: "string" }, rawMd: { type: "string" }, url: { type: "string" } }, required: ["title", "rawMd"] } },
      async (params, runCtx) => {
        const p = params as { title?: string; rawMd?: string; url?: string };
        const title = String(p.title ?? "").trim();
        const rawMd = String(p.rawMd ?? "").trim();
        if (!title || !rawMd) return { error: "title, rawMd 필수" };
        const id = randomUUID();
        await ctx.db.execute(
          `INSERT INTO ${T_SOURCES} (id, company_id, title, url, raw_md, status) VALUES ($1,$2,$3,$4,$5,'pending')`,
          [id, runCtx.companyId, title, p.url ? String(p.url) : null, rawMd],
        );
        return { content: `소스 추가됨: ${title} (id ${id}). ingest 하면 위키로 통합됩니다.`, data: { id } };
      },
    );
  },

  async onHealth() {
    return { status: "ok", message: "knowledge-base worker running" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
