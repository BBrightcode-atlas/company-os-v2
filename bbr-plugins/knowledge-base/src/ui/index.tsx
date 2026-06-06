import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MarkdownBlock,
  MarkdownEditor,
  useHostContext,
  useHostLocation,
  useHostNavigation,
  usePluginAction,
  usePluginData,
  usePluginToast,
  type PluginPageProps,
  type PluginSidebarProps,
} from "@paperclipai/plugin-sdk/ui";
import {
  ACTION,
  DATA,
  PAGE_KINDS,
  USER_PAGE_KINDS,
  pageKindLabel,
  slugify,
  isSystemSlug,
  type AskResult,
  type GraphData,
  type PageDetail,
  type PageKind,
  type WikiPage,
  type WikiSource,
} from "../wiki.js";

// ── Tailwind 토큰(다크 안전) ────────────────────────────────────────────────
const INPUT =
  "w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-ring";
const LABEL = "mb-1 block text-xs font-semibold text-foreground";
const BTN =
  "inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50";
const BTN_PRIMARY =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50";
const CARD = "rounded-lg border border-border bg-card p-3";

// kind 별 색(노드/뱃지 공통)
const KIND_COLOR: Record<PageKind, string> = {
  note: "#94a3b8",
  entity: "#22c55e",
  concept: "#3b82f6",
  overview: "#a855f7",
  synthesis: "#f59e0b",
  moc: "#ec4899",
  source: "#14b8a6",
};

function KindBadge({ kind }: { kind: PageKind }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-foreground/80"
      style={{ background: `${KIND_COLOR[kind]}22` }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[kind] }} />
      {pageKindLabel(kind)}
    </span>
  );
}

// 현재 경로에서 /wiki 이후 서브경로 추출(회사 prefix 무관).
function wikiSub(pathname: string): string {
  const m = pathname.match(/(?:^|\/)wiki(?:\/(.*))?$/);
  return m ? (m[1] ?? "").replace(/\/+$/, "") : "";
}

// ════════════════════════════════════════════════════════════════════════════
// 사이드바 진입(host SidebarNavItem 룩 + 책 아이콘)
// ════════════════════════════════════════════════════════════════════════════
const SIDEBAR_ITEM_BASE =
  "flex items-center gap-2.5 px-3 py-2 pointer-coarse:py-1.5 text-[13px] font-medium transition-colors";

export function WikiSidebarItem(_props: PluginSidebarProps) {
  const nav = useHostNavigation();
  const loc = useHostLocation();
  const active = /(^|\/)wiki(\/|$)/.test(loc.pathname);
  const cls = `${SIDEBAR_ITEM_BASE} ${
    active ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
  }`;
  return (
    <a
      {...nav.linkProps("/wiki")}
      className={cls}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          nav.navigate("/wiki");
        }
      }}
    >
      <span className="relative shrink-0">
        {/* lucide BookText */}
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
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
          <path d="M8 7h6M8 11h8" />
        </svg>
      </span>
      <span className="flex-1 truncate">지식베이스</span>
    </a>
  );
}

// 상단 탭 내비
const TABS: Array<{ key: string; label: string; to: string; match: (s: string) => boolean }> = [
  { key: "home", label: "홈", to: "/wiki", match: (s) => s === "" },
  { key: "pages", label: "페이지", to: "/wiki/pages", match: (s) => s === "pages" || s.startsWith("page/") },
  { key: "graph", label: "그래프", to: "/wiki/graph", match: (s) => s === "graph" },
  { key: "sources", label: "소스", to: "/wiki/sources", match: (s) => s === "sources" },
  { key: "ask", label: "질문", to: "/wiki/ask", match: (s) => s === "ask" },
  { key: "schema", label: "규칙", to: "/wiki/schema", match: (s) => s === "schema" },
];

function TopNav({ sub }: { sub: string }) {
  const nav = useHostNavigation();
  return (
    <div className="flex items-center gap-1 border-b border-border pb-2">
      {TABS.map((t) => {
        const active = t.match(sub);
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => nav.navigate(t.to)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              active ? "bg-accent text-foreground" : "text-foreground/70 hover:bg-accent/50"
            }`}
          >
            {t.label}
          </button>
        );
      })}
      <div className="ml-auto">
        <button type="button" className={BTN_PRIMARY} onClick={() => nav.navigate("/wiki/new")}>
          + 새 페이지
        </button>
      </div>
    </div>
  );
}

// ── 홈 ──────────────────────────────────────────────────────────────────────
interface Stats {
  pages: number;
  sources: number;
  sourcesPending: number;
  sourcesIntegrated: number;
  unresolvedLinks: number;
  orphans: number;
  hasIndex?: boolean;
  recent: WikiPage[];
}

function HomeView({ companyId }: { companyId: string }) {
  const nav = useHostNavigation();
  const { data, loading } = usePluginData<Stats>(DATA.stats, { companyId });
  if (loading && !data) return <Empty>불러오는 중…</Empty>;
  const s = data;
  const metric = (label: string, value: number, to?: string) => (
    <button
      type="button"
      disabled={!to}
      onClick={() => to && nav.navigate(to)}
      className={`${CARD} flex flex-col items-start text-left transition-colors ${to ? "hover:bg-accent/50" : ""}`}
    >
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
  return (
    <div className="flex flex-col gap-4">
      {s?.hasIndex && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${CARD} flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/50`}
            onClick={() => nav.navigate("/wiki/page/index")}
          >
            📚 인덱스 <span className="text-xs text-muted-foreground">전체 카탈로그</span>
          </button>
          <button
            type="button"
            className={`${CARD} flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/50`}
            onClick={() => nav.navigate("/wiki/page/log")}
          >
            🕑 활동 로그 <span className="text-xs text-muted-foreground">변경 타임라인</span>
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metric("페이지", s?.pages ?? 0, "/wiki/pages")}
        {metric("소스", s?.sources ?? 0, "/wiki/sources")}
        {metric("미해결 링크", s?.unresolvedLinks ?? 0)}
        {metric("고아 페이지", s?.orphans ?? 0)}
      </div>
      {(s?.sourcesPending ?? 0) > 0 && (
        <div className={`${CARD} flex items-center justify-between`}>
          <span className="text-sm text-foreground">통합 대기 소스 {s?.sourcesPending}건</span>
          <button type="button" className={BTN} onClick={() => nav.navigate("/wiki/sources")}>
            소스로 이동
          </button>
        </div>
      )}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">최근 페이지</h3>
        {s && s.recent.length > 0 ? (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {s.recent.map((p) => (
              <PageRow key={p.id} page={p} />
            ))}
          </div>
        ) : (
          <Empty>
            아직 페이지가 없습니다. <LinkBtn to="/wiki/new">새 페이지</LinkBtn> 또는{" "}
            <LinkBtn to="/wiki/sources">소스 추가</LinkBtn> 후 AI 통합으로 시작하세요.
          </Empty>
        )}
      </div>
    </div>
  );
}

function PageRow({ page }: { page: WikiPage }) {
  const nav = useHostNavigation();
  return (
    <button
      type="button"
      onClick={() => nav.navigate(`/wiki/page/${page.slug}`)}
      className="flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
    >
      <KindBadge kind={page.kind} />
      <span className="flex-1 truncate text-sm font-medium text-foreground">{page.title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{page.slug}</span>
      {page.author === "agent" && (
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">AI</span>
      )}
    </button>
  );
}

// ── 페이지 목록 ─────────────────────────────────────────────────────────────
function PagesView({ companyId }: { companyId: string }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("");
  const { data, loading } = usePluginData<WikiPage[]>(DATA.listPages, {
    companyId,
    q: q || undefined,
    kind: kind || undefined,
  });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${INPUT} max-w-xs`} placeholder="검색…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${INPUT} max-w-[140px]`} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">전체 종류</option>
          {PAGE_KINDS.map((k) => (
            <option key={k} value={k}>
              {pageKindLabel(k)}
            </option>
          ))}
        </select>
      </div>
      {loading && !data ? (
        <Empty>불러오는 중…</Empty>
      ) : data && data.length > 0 ? (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {data.map((p) => (
            <PageRow key={p.id} page={p} />
          ))}
        </div>
      ) : (
        <Empty>페이지가 없습니다.</Empty>
      )}
    </div>
  );
}

// ── 페이지 보기 ─────────────────────────────────────────────────────────────
const authorLabel = (a: string): string => (a === "agent" ? "AI" : a === "system" ? "시스템" : "사람");

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      {children}
    </section>
  );
}
function RailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-foreground">{children}</span>
    </div>
  );
}

// 일부 Tailwind 유틸(flex-1/w-64 등)이 host CSS 빌드에 없을 수 있어 레이아웃은 인라인 style 로 강제.
function useWide(min = 1024) {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${min}px)`);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [min]);
  return wide;
}

function PageView({ companyId, slug }: { companyId: string; slug: string }) {
  const nav = useHostNavigation();
  const toast = usePluginToast();
  const { data, loading, error, refresh } = usePluginData<PageDetail>(DATA.getPage, { companyId, slug });
  const del = usePluginAction(ACTION.deletePage);
  const suggest = usePluginAction(ACTION.suggestLinks);
  const [confirmDel, setConfirmDel] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ slug: string; title: string; reason: string }> | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const wide = useWide();

  if (loading && !data) return <Empty>불러오는 중…</Empty>;
  if (error || !data) {
    return (
      <Empty>
        ‘{slug}’ 페이지가 없습니다.{" "}
        <LinkBtn to={`/wiki/new?slug=${encodeURIComponent(slug)}`}>이 제목으로 생성</LinkBtn>
      </Empty>
    );
  }
  const { page, backlinks, outbound } = data;

  const doDelete = async () => {
    try {
      await del({ companyId, id: page.id });
      toast({ tone: "success", title: "삭제됨" });
      nav.navigate("/wiki/pages");
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "삭제 실패" });
    }
  };
  const runSuggest = async () => {
    setSuggesting(true);
    try {
      const r = (await suggest({ companyId, id: page.id })) as { suggestions: typeof suggestions };
      setSuggestions(r.suggestions ?? []);
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "제안 실패" });
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => nav.navigate("/wiki/pages")}
        >
          ← 페이지 목록
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {isSystemSlug(page.slug) ? (
            <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">자동 유지</span>
          ) : (
            <>
              <button type="button" className={BTN} onClick={runSuggest} disabled={suggesting}>
                {suggesting ? "제안 중…" : "AI 링크 제안"}
              </button>
              <button type="button" className={BTN} onClick={() => nav.navigate(`/wiki/page/${page.slug}/edit`)}>
                편집
              </button>
              {confirmDel ? (
                <span className="inline-flex items-center gap-1 text-xs text-foreground">
                  삭제?
                  <button type="button" className={BTN} onClick={() => void doDelete()}>
                    확인
                  </button>
                  <button type="button" className={BTN} onClick={() => setConfirmDel(false)}>
                    취소
                  </button>
                </span>
              ) : (
                <button type="button" className={BTN} onClick={() => setConfirmDel(true)}>
                  삭제
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div style={wide ? { display: "flex", gap: "2.5rem", alignItems: "flex-start" } : { display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <article style={wide ? { flex: "1 1 0%", minWidth: 0 } : { minWidth: 0 }}>
          <h1 className="m-0 text-3xl font-bold leading-tight tracking-tight text-foreground">{page.title}</h1>
          <div className="mb-7 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <KindBadge kind={page.kind} />
            {page.tags.map((t) => (
              <button
                key={t}
                type="button"
                className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => nav.navigate(`/wiki/pages`)}
              >
                #{t}
              </button>
            ))}
            <span className="text-muted-foreground/50">·</span>
            <span>{authorLabel(page.author)}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>{page.updatedAt.slice(0, 10)}</span>
          </div>

          {suggestions && (
            <div className={`${CARD} mb-5`}>
              <div className="mb-1 text-xs font-semibold text-foreground">AI 링크 제안</div>
              {suggestions.length === 0 ? (
                <div className="text-xs text-muted-foreground">제안 없음.</div>
              ) : (
                <ul className="m-0 flex flex-col gap-1 pl-0">
                  {suggestions.map((s) => (
                    <li key={s.slug} className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        className="rounded bg-muted px-1 font-mono text-primary hover:underline"
                        onClick={() => nav.navigate(`/wiki/page/${s.slug}`)}
                      >
                        [[{s.slug}]]
                      </button>
                      <span className="text-muted-foreground">{s.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <WikiMarkdown plain content={page.body || "_(빈 페이지 — 편집을 눌러 내용을 추가하세요)_"} />
        </article>

        <aside
          style={wide ? { width: "15rem", flexShrink: 0 } : { width: "100%" }}
          className={`flex flex-col gap-6 ${wide ? "border-l border-border pl-5" : "border-t border-border pt-5"}`}
        >
          <RailSection title="정보">
            <div className="flex flex-col gap-1.5">
              <RailRow label="종류">{pageKindLabel(page.kind)}</RailRow>
              <RailRow label="작성">{authorLabel(page.author)}</RailRow>
              <RailRow label="소스">{page.sourceCount}건</RailRow>
              <RailRow label="수정">{page.updatedAt.slice(0, 10)}</RailRow>
              <RailRow label="slug">
                <code className="text-[11px] text-muted-foreground">{page.slug}</code>
              </RailRow>
            </div>
          </RailSection>

          <RailSection title={`백링크 ${backlinks.length}`}>
            {backlinks.length === 0 ? (
              <div className="text-xs text-muted-foreground">없음</div>
            ) : (
              <div className="flex flex-col gap-1">
                {backlinks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="truncate text-left text-xs text-primary hover:underline"
                    onClick={() => nav.navigate(`/wiki/page/${b.slug}`)}
                  >
                    {b.title}
                  </button>
                ))}
              </div>
            )}
          </RailSection>

          <RailSection title={`나가는 링크 ${outbound.length}`}>
            {outbound.length === 0 ? (
              <div className="text-xs text-muted-foreground">없음</div>
            ) : (
              <div className="flex flex-col gap-1">
                {outbound.map((o) => (
                  <button
                    key={o.slug}
                    type="button"
                    className={`flex items-center gap-1 truncate text-left text-xs hover:underline ${
                      o.resolved ? "text-primary" : "text-amber-600 dark:text-amber-500"
                    }`}
                    onClick={() => nav.navigate(`/wiki/page/${o.slug}`)}
                  >
                    <span className="truncate">{o.title ?? o.slug}</span>
                    {!o.resolved && <span className="shrink-0 text-[10px]">＋</span>}
                  </button>
                ))}
              </div>
            )}
          </RailSection>

          <button
            type="button"
            className="self-start text-[11px] text-muted-foreground hover:underline"
            onClick={() => refresh()}
          >
            새로고침
          </button>
        </aside>
      </div>
    </div>
  );
}

// [[wikilink]] 렌더 + SPA 내비. plain=문서 prose(테두리 없음), 아니면 카드.
function WikiMarkdown({ content, plain }: { content: string; plain?: boolean }) {
  const nav = useHostNavigation();
  const prose =
    "max-w-none text-[15px] leading-7 text-foreground " +
    "[&_h1]:mb-3 [&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-bold " +
    "[&_h2]:mb-2 [&_h2]:mt-7 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight " +
    "[&_h3]:mb-1.5 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold " +
    "[&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 " +
    "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 " +
    "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px] " +
    "[&_pre]:my-4 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 " +
    "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground " +
    "[&_hr]:my-6 [&_hr]:border-border [&_table]:my-4 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 " +
    "first:[&>*]:mt-0";
  const cls = plain ? prose : `${prose} rounded-lg border border-border bg-card p-4`;
  return (
    <div
      className={cls}
      onClickCapture={(e) => {
        const a = (e.target as HTMLElement).closest("a[data-paperclip-wiki-link]") as HTMLAnchorElement | null;
        if (a) {
          const href = a.getAttribute("href") || "";
          if (href.startsWith("/wiki/")) {
            e.preventDefault();
            e.stopPropagation();
            nav.navigate(href);
          }
        }
      }}
    >
      <MarkdownBlock
        content={content}
        enableWikiLinks
        resolveWikiLinkHref={(target) => `/wiki/page/${slugify(target)}`}
      />
    </div>
  );
}

// ── 페이지 생성/수정 (노션식: borderless 제목 + seamless 에디터) ──────────────
function PageEditView({ companyId, slug, initialSlugParam }: { companyId: string; slug: string | null; initialSlugParam?: string }) {
  const nav = useHostNavigation();
  const toast = usePluginToast();
  const isNew = slug == null;
  const { data } = usePluginData<PageDetail>(DATA.getPage, isNew ? { companyId, slug: " " } : { companyId, slug });
  const create = usePluginAction(ACTION.createPage);
  const update = usePluginAction(ACTION.updatePage);

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<PageKind>("note");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const lastSavedRef = useRef<string>("");
  const persistingRef = useRef(false);

  const snap = () => JSON.stringify({ title, kind, tags, body });

  // 초기 로드(편집=기존값, 신규=빈/제안 슬러그). lastSaved 기준선 설정.
  useEffect(() => {
    if (loaded) return;
    if (isNew) {
      const t0 = initialSlugParam ? initialSlugParam.replace(/-/g, " ") : "";
      if (t0) setTitle(t0);
      lastSavedRef.current = JSON.stringify({ title: t0, kind: "note", tags: "", body: "" });
      setLoaded(true);
      return;
    }
    if (data?.page) {
      setTitle(data.page.title);
      setKind(data.page.kind);
      setTags(data.page.tags.join(", "));
      setBody(data.page.body);
      lastSavedRef.current = JSON.stringify({
        title: data.page.title,
        kind: data.page.kind,
        tags: data.page.tags.join(", "),
        body: data.page.body,
      });
      setLoaded(true);
    }
  }, [data, isNew, loaded, initialSlugParam]);

  // 핵심: 저장(최초 1회 create → 이후 update). createdId 가드로 신규 중복생성 방지.
  const persist = async (goView: boolean): Promise<void> => {
    if (!title.trim()) {
      if (goView) nav.navigate(isNew && !createdSlug ? "/wiki/pages" : `/wiki/page/${createdSlug ?? slug}`);
      return;
    }
    if (persistingRef.current) return;
    persistingRef.current = true;
    const mySnap = snap();
    setStatus("saving");
    try {
      const tagArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const existingId = isNew ? createdId : data?.page.id;
      let outSlug: string;
      if (existingId) {
        const r = (await update({ companyId, id: existingId, title, kind, body, tags: tagArr })) as { slug: string };
        outSlug = r.slug;
      } else {
        const r = (await create({ companyId, slug: initialSlugParam, title, kind, body, tags: tagArr })) as {
          slug: string;
          id: string;
        };
        setCreatedId(r.id);
        setCreatedSlug(r.slug);
        outSlug = r.slug;
      }
      lastSavedRef.current = mySnap;
      setStatus("saved");
      setSavedAt(new Date());
      if (goView) nav.navigate(`/wiki/page/${outSlug}`);
    } catch (e) {
      setStatus("error");
      toast({ tone: "error", title: e instanceof Error ? e.message : "저장 실패" });
    } finally {
      persistingRef.current = false;
    }
  };

  // 자동저장: 변경분이 마지막 저장과 다르면 디바운스 후 저장.
  useEffect(() => {
    if (!loaded) return;
    if (!title.trim()) return;
    if (snap() === lastSavedRef.current) return;
    setStatus("dirty");
    const t = window.setTimeout(() => void persist(false), 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, kind, tags, body, loaded]);

  if (!isNew && !loaded) return <Empty>불러오는 중…</Empty>;

  const saving = status === "saving";
  const statusText =
    status === "saving"
      ? "저장 중…"
      : status === "saved"
        ? `저장됨${savedAt ? " · " + savedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : ""}`
        : status === "dirty"
          ? "변경됨…"
          : status === "error"
            ? "저장 실패"
            : isNew
              ? "제목을 입력하면 자동 저장"
              : "";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => persist(true)}
        >
          ← 완료
        </button>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`text-xs ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{statusText}</span>
          <select
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-ring"
            value={kind}
            onChange={(e) => setKind(e.target.value as PageKind)}
          >
            {USER_PAGE_KINDS.map((k) => (
              <option key={k} value={k}>
                {pageKindLabel(k)}
              </option>
            ))}
          </select>
          <button type="button" className={BTN_PRIMARY} onClick={() => void persist(true)} disabled={saving}>
            완료
          </button>
        </div>
      </div>

      <input
        className="w-full border-0 bg-transparent text-3xl font-bold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목 없음"
        autoFocus
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void persist(true);
        }}
      />
      <input
        className="w-full border-0 bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="태그 추가 (쉼표로 구분)"
      />
      <div className="wiki-edit-body mt-1 border-t border-border pt-4">
        <style>{`.wiki-edit-body .paperclip-mdxeditor-content{min-height:64vh;font-size:15px;line-height:1.55;}.wiki-edit-body .paperclip-mdxeditor-content p{margin:0.2rem 0;}.wiki-edit-body .paperclip-mdxeditor{height:100%;}`}</style>
        <MarkdownEditor
          value={body}
          onChange={setBody}
          placeholder="내용을 입력하세요. 다른 페이지는 [[제목]]으로 링크…"
          onSubmit={() => void persist(true)}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">자동 저장됨 · ⌘↵ 완료 · [[제목]]으로 페이지 연결</p>
    </div>
  );
}

// ── 그래프뷰 (자체 force 시뮬, canvas) ──────────────────────────────────────
interface SimNode {
  id: string;
  slug: string;
  title: string;
  kind: PageKind;
  degree: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function GraphView({ companyId }: { companyId: string }) {
  const nav = useHostNavigation();
  const { data, loading } = usePluginData<GraphData>(DATA.getGraph, { companyId });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<{ nodes: SimNode[]; edges: Array<[number, number]>; drag: number | null; hover: number | null }>({
    nodes: [],
    edges: [],
    drag: null,
    hover: null,
  });

  // 그래프 데이터 → 시뮬 노드 초기화
  useEffect(() => {
    if (!data) return;
    const w = wrapRef.current?.clientWidth ?? 640;
    const h = 460;
    const idx = new Map<string, number>();
    const nodes: SimNode[] = data.nodes.map((n, i) => {
      idx.set(n.id, i);
      const ang = (i / Math.max(1, data.nodes.length)) * Math.PI * 2;
      return {
        ...n,
        x: w / 2 + Math.cos(ang) * 120 + (i % 7) * 3,
        y: h / 2 + Math.sin(ang) * 120 + (i % 5) * 3,
        vx: 0,
        vy: 0,
      };
    });
    const edges: Array<[number, number]> = [];
    for (const e of data.edges) {
      const a = idx.get(e.source);
      const b = idx.get(e.target);
      if (a != null && b != null) edges.push([a, b]);
    }
    stateRef.current.nodes = nodes;
    stateRef.current.edges = edges;
  }, [data]);

  // 시뮬 + 렌더 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let alpha = 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = wrapRef.current?.clientWidth ?? 640;
      const h = 460;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const step = () => {
      const st = stateRef.current;
      const ns = st.nodes;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      // 물리: 반발(O(n²)) + 스프링 + 중심
      if (alpha > 0.02) {
        for (let i = 0; i < ns.length; i++) {
          const a = ns[i];
          for (let j = i + 1; j < ns.length; j++) {
            const b = ns[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let d2 = dx * dx + dy * dy;
            if (d2 < 0.01) {
              dx = Math.random() - 0.5;
              dy = Math.random() - 0.5;
              d2 = 0.01;
            }
            const f = (2200 / d2) * alpha;
            const d = Math.sqrt(d2);
            const fx = (dx / d) * f;
            const fy = (dy / d) * f;
            a.vx += fx;
            a.vy += fy;
            b.vx -= fx;
            b.vy -= fy;
          }
          a.vx += (w / 2 - a.x) * 0.002 * alpha;
          a.vy += (h / 2 - a.y) * 0.002 * alpha;
        }
        for (const [ai, bi] of st.edges) {
          const a = ns[ai];
          const b = ns[bi];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = (d - 90) * 0.02 * alpha;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
        for (let i = 0; i < ns.length; i++) {
          const n = ns[i];
          if (st.drag === i) {
            n.vx = 0;
            n.vy = 0;
            continue;
          }
          n.vx *= 0.85;
          n.vy *= 0.85;
          n.x = Math.max(14, Math.min(w - 14, n.x + n.vx));
          n.y = Math.max(14, Math.min(h - 14, n.y + n.vy));
        }
        alpha *= 0.99;
      }
      // 렌더
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(120,120,140,0.35)";
      for (const [ai, bi] of st.edges) {
        const a = ns[ai];
        const b = ns[bi];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i];
        const r = 4 + Math.min(8, n.degree * 1.4);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = KIND_COLOR[n.kind];
        ctx.fill();
        if (st.hover === i) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#fff";
          ctx.stroke();
        }
        if (n.degree >= 2 || st.hover === i) {
          ctx.fillStyle = "rgba(140,140,160,0.95)";
          ctx.font = "11px sans-serif";
          ctx.fillText(n.title.slice(0, 18), n.x + r + 2, n.y + 3);
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [data]);

  const pick = (clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ns = stateRef.current.nodes;
    let best = -1;
    let bestD = 16 * 16;
    for (let i = 0; i < ns.length; i++) {
      const dx = ns[i].x - x;
      const dy = ns[i].y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best >= 0 ? best : null;
  };

  if (loading && !data) return <Empty>불러오는 중…</Empty>;
  if (data && data.nodes.length === 0) return <Empty>아직 그래프에 표시할 페이지가 없습니다.</Empty>;

  return (
    <div className="flex flex-col gap-2">
      <div ref={wrapRef} className="overflow-hidden rounded-lg border border-border bg-card">
        <canvas
          ref={canvasRef}
          className="block cursor-pointer select-none"
          onPointerDown={(e) => {
            const i = pick(e.clientX, e.clientY);
            stateRef.current.drag = i;
            if (i != null) (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const st = stateRef.current;
            if (st.drag != null) {
              const canvas = canvasRef.current!;
              const rect = canvas.getBoundingClientRect();
              st.nodes[st.drag].x = e.clientX - rect.left;
              st.nodes[st.drag].y = e.clientY - rect.top;
            } else {
              st.hover = pick(e.clientX, e.clientY);
            }
          }}
          onPointerUp={(e) => {
            const st = stateRef.current;
            const wasDrag = st.drag;
            st.drag = null;
            const i = pick(e.clientX, e.clientY);
            if (i != null && i === wasDrag) {
              // 클릭(거의 안 움직임)으로 간주 → 페이지 이동
              nav.navigate(`/wiki/page/${st.nodes[i].slug}`);
            }
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        {PAGE_KINDS.map((k) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />
            {pageKindLabel(k)}
          </span>
        ))}
        <span className="ml-auto">노드 클릭 → 페이지 · 드래그 → 이동</span>
      </div>
    </div>
  );
}

// ── 소스 ────────────────────────────────────────────────────────────────────
function SourcesView({ companyId }: { companyId: string }) {
  const toast = usePluginToast();
  const { data, loading, refresh } = usePluginData<WikiSource[]>(DATA.listSources, { companyId });
  const add = usePluginAction(ACTION.addSource);
  const ingest = usePluginAction(ACTION.ingestSource);
  const apply = usePluginAction(ACTION.applyIngest);
  const reject = usePluginAction(ACTION.rejectIngest);
  const del = usePluginAction(ACTION.deleteSource);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [raw, setRaw] = useState("");
  const [adding, setAdding] = useState(false);
  const [reviewMode, setReviewMode] = useState(true);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // integrating 있으면 폴링
  const integrating = (data ?? []).some((s) => s.status === "integrating");
  useEffect(() => {
    if (!integrating) return;
    const t = setInterval(() => refresh(), 3000);
    return () => clearInterval(t);
  }, [integrating, refresh]);

  const submit = async () => {
    if (!title.trim() || !raw.trim()) {
      toast({ tone: "error", title: "제목과 내용을 입력하세요." });
      return;
    }
    setAdding(true);
    try {
      await add({ companyId, title, url: url || undefined, rawMd: raw });
      setTitle("");
      setUrl("");
      setRaw("");
      toast({ tone: "success", title: "소스 추가됨" });
      refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "추가 실패" });
    } finally {
      setAdding(false);
    }
  };
  const runIngest = async (id: string) => {
    try {
      await ingest({ companyId, id, review: reviewMode });
      toast({ tone: "success", title: reviewMode ? "분석 시작(검토 대기)" : "통합 시작" });
      refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "통합 실패" });
    }
  };
  const doApply = async (id: string) => {
    setBusyId(id);
    try {
      await apply({ companyId, id });
      toast({ tone: "success", title: "적용됨" });
      refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "적용 실패" });
    } finally {
      setBusyId(null);
    }
  };
  const doReject = async (id: string) => {
    try {
      await reject({ companyId, id });
      refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "거부 실패" });
    }
  };
  const doDelete = async (id: string) => {
    try {
      await del({ companyId, id });
      setConfirmDel(null);
      refresh();
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "삭제 실패" });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className={`${CARD} flex flex-col gap-2`}>
        <div className="text-sm font-semibold text-foreground">소스 추가</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className={INPUT} placeholder="제목 *" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className={INPUT} placeholder="출처 URL (선택)" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <textarea
          className={`${INPUT} min-h-[120px] resize-y`}
          placeholder="원문(마크다운/기사 텍스트) 붙여넣기 *"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={reviewMode} onChange={(e) => setReviewMode(e.target.checked)} />
            검토 후 적용 (제안 미리보기)
          </label>
          <button type="button" className={BTN_PRIMARY} onClick={() => void submit()} disabled={adding}>
            {adding ? "추가 중…" : "소스 추가"}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <Empty>불러오는 중…</Empty>
      ) : data && data.length > 0 ? (
        <div className="flex flex-col gap-2">
          {data.map((s) => (
            <div key={s.id} className={`${CARD} flex flex-col gap-1.5`}>
              <div className="flex items-center gap-2">
                <SourceStatus status={s.status} />
                <span className="flex-1 truncate text-sm font-medium text-foreground">{s.title}</span>
                {s.status !== "integrating" && s.status !== "review" && (
                  <button type="button" className={BTN} onClick={() => void runIngest(s.id)}>
                    {s.status === "integrated" ? "재통합" : reviewMode ? "분석" : "통합"}
                  </button>
                )}
                {confirmDel === s.id ? (
                  <span className="inline-flex items-center gap-1 text-xs">
                    삭제?
                    <button type="button" className={BTN} onClick={() => void doDelete(s.id)}>
                      확인
                    </button>
                    <button type="button" className={BTN} onClick={() => setConfirmDel(null)}>
                      취소
                    </button>
                  </span>
                ) : (
                  <button type="button" className={BTN} onClick={() => setConfirmDel(s.id)}>
                    삭제
                  </button>
                )}
              </div>
              {s.summary && <div className="text-xs text-muted-foreground">{s.summary}</div>}
              {s.status === "error" && s.errorMessage && (
                <div className="text-xs text-destructive">오류: {s.errorMessage}</div>
              )}
              {s.status === "review" && s.proposed && (
                <div className="mt-1 flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      제안: 페이지 {s.proposed.pages.length}건 {s.proposed.summary ? `· ${s.proposed.summary}` : ""}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <button type="button" className={BTN_PRIMARY} onClick={() => void doApply(s.id)} disabled={busyId === s.id}>
                        {busyId === s.id ? "적용 중…" : "적용"}
                      </button>
                      <button type="button" className={BTN} onClick={() => void doReject(s.id)} disabled={busyId === s.id}>
                        거부
                      </button>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {s.proposed.pages.map((p, i) => (
                      <details key={i} className="text-xs">
                        <summary className="cursor-pointer">
                          <span className={p.op === "create" ? "text-green-600 dark:text-green-500" : "text-blue-600 dark:text-blue-400"}>
                            {p.op === "create" ? "＋신규" : "~갱신"}
                          </span>{" "}
                          <span className="font-medium text-foreground">{p.title}</span>{" "}
                          <span className="text-muted-foreground">({pageKindLabel(p.kind)})</span>
                          {p.note && <span className="text-amber-600 dark:text-amber-500"> ⚠️ {p.note}</span>}
                        </summary>
                        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 text-[11px] text-muted-foreground">
                          {p.body}
                        </pre>
                      </details>
                    ))}
                  </div>
                </div>
              )}
              {s.ingestLog.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.ingestLog.map((l, i) => (
                    <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {l.op === "create" ? "+" : "~"} {l.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty>소스가 없습니다. 원문을 추가하고 “통합”하면 AI 가 위키로 만듭니다.</Empty>
      )}
    </div>
  );
}

function SourceStatus({ status }: { status: WikiSource["status"] }) {
  const map: Record<string, [string, string]> = {
    pending: ["대기", "bg-muted text-muted-foreground"],
    review: ["검토 대기", "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"],
    integrating: ["통합중", "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"],
    integrated: ["완료", "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"],
    error: ["오류", "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"],
  };
  const [label, cls] = map[status] ?? map.pending;
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>;
}

// ── 질문 ────────────────────────────────────────────────────────────────────
function AskView({ companyId }: { companyId: string }) {
  const nav = useHostNavigation();
  const toast = usePluginToast();
  const ask = usePluginAction(ACTION.ask);
  const save = usePluginAction(ACTION.saveAnswer);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [askedQ, setAskedQ] = useState("");
  const [res, setRes] = useState<(AskResult & { used: Array<{ slug: string; title: string }> }) | null>(null);

  const run = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setRes(null);
    try {
      const r = (await ask({ companyId, question: q })) as AskResult & { used: Array<{ slug: string; title: string }> };
      setAskedQ(q);
      setRes(r);
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "질문 실패" });
    } finally {
      setBusy(false);
    }
  };
  const saveToWiki = async () => {
    if (!res) return;
    setSaving(true);
    try {
      const r = (await save({ companyId, question: askedQ, answer: res.answer, used: res.used })) as { slug: string };
      toast({ tone: "success", title: "위키에 저장됨" });
      nav.navigate(`/wiki/page/${r.slug}`);
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "저장 실패" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <textarea
          className={`${INPUT} min-h-[70px] resize-y`}
          placeholder="위키에 대해 질문하세요…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void run();
          }}
        />
        <div className="flex justify-end">
          <button type="button" className={BTN_PRIMARY} onClick={() => void run()} disabled={busy}>
            {busy ? "생각 중…" : "질문 (⌘↵)"}
          </button>
        </div>
      </div>
      {res && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-end">
            <button type="button" className={BTN} onClick={() => void saveToWiki()} disabled={saving}>
              {saving ? "저장 중…" : "＋ 위키에 저장"}
            </button>
          </div>
          <WikiMarkdown content={res.answer} />
          {res.used.length > 0 && (
            <div className={CARD}>
              <div className="mb-1 text-xs font-semibold text-foreground">근거 페이지</div>
              <div className="flex flex-wrap gap-1.5">
                {res.used.map((u) => (
                  <button
                    key={u.slug}
                    type="button"
                    className="rounded bg-muted px-1.5 py-0.5 text-xs text-primary hover:underline"
                    onClick={() => nav.navigate(`/wiki/page/${u.slug}`)}
                  >
                    {u.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          {res.suggestedEdits.length > 0 && (
            <div className={CARD}>
              <div className="mb-1 text-xs font-semibold text-foreground">보강 제안</div>
              <ul className="m-0 flex flex-col gap-1 pl-0">
                {res.suggestedEdits.map((s) => (
                  <li key={s.slug} className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => nav.navigate(`/wiki/new?slug=${encodeURIComponent(s.slug)}`)}
                    >
                      + {s.title}
                    </button>
                    <span className="text-muted-foreground">{s.rationale}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 규칙(schema) ────────────────────────────────────────────────────────────
function SchemaView({ companyId }: { companyId: string }) {
  const toast = usePluginToast();
  const { data, loading } = usePluginData<{ schema: string; isDefault: boolean }>(DATA.getSchema, { companyId });
  const setSchema = usePluginAction(ACTION.setSchema);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data && text == null) setText(data.schema);
  }, [data, text]);
  if (loading && !data) return <Empty>불러오는 중…</Empty>;
  const save = async () => {
    setBusy(true);
    try {
      await setSchema({ companyId, schema: text ?? "" });
      toast({ tone: "success", title: "규칙 저장됨" });
    } catch (e) {
      toast({ tone: "error", title: e instanceof Error ? e.message : "저장 실패" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex max-w-3xl flex-col gap-2">
      <p className="m-0 text-xs text-muted-foreground">
        이 위키를 AI(플러그인 LLM·플랫폼 에이전트)가 어떻게 관리할지 정하는 규칙(schema)입니다.
      </p>
      <textarea
        className={`${INPUT} min-h-[420px] resize-y font-mono text-xs`}
        value={text ?? ""}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex justify-end">
        <button type="button" className={BTN_PRIMARY} onClick={() => void save()} disabled={busy}>
          {busy ? "저장 중…" : "규칙 저장"}
        </button>
      </div>
    </div>
  );
}

// ── 공통 ────────────────────────────────────────────────────────────────────
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">{children}</div>;
}
function LinkBtn({ to, children }: { to: string; children: React.ReactNode }) {
  const nav = useHostNavigation();
  return (
    <button type="button" className="text-primary hover:underline" onClick={() => nav.navigate(to)}>
      {children}
    </button>
  );
}

function useQueryParam(name: string): string | undefined {
  const loc = useHostLocation();
  return useMemo(() => {
    const qIdx = loc.pathname.indexOf("?");
    const search = (loc as { search?: string }).search ?? (qIdx >= 0 ? loc.pathname.slice(qIdx) : "");
    try {
      return new URLSearchParams(search).get(name) ?? undefined;
    } catch {
      return undefined;
    }
  }, [loc, name]);
}

// ════════════════════════════════════════════════════════════════════════════
// 라우터(페이지 슬롯)
// ════════════════════════════════════════════════════════════════════════════
export function WikiPage(_props: PluginPageProps) {
  const host = useHostContext();
  const loc = useHostLocation();
  const companyId = (host as { companyId?: string }).companyId ?? "";
  const sub = wikiSub(loc.pathname.split("?")[0]);
  const newSlug = useQueryParam("slug");

  let content: React.ReactNode;
  if (!companyId) {
    content = <Empty>회사 컨텍스트가 없습니다.</Empty>;
  } else if (sub === "" ) {
    content = <HomeView companyId={companyId} />;
  } else if (sub === "pages") {
    content = <PagesView companyId={companyId} />;
  } else if (sub === "graph") {
    content = <GraphView companyId={companyId} />;
  } else if (sub === "sources") {
    content = <SourcesView companyId={companyId} />;
  } else if (sub === "ask") {
    content = <AskView companyId={companyId} />;
  } else if (sub === "schema") {
    content = <SchemaView companyId={companyId} />;
  } else if (sub === "new") {
    content = <PageEditView companyId={companyId} slug={null} initialSlugParam={newSlug} />;
  } else if (sub.startsWith("page/")) {
    const rest = sub.slice("page/".length);
    if (rest.endsWith("/edit")) {
      content = <PageEditView companyId={companyId} slug={decodeURIComponent(rest.slice(0, -"/edit".length))} />;
    } else {
      content = <PageView companyId={companyId} slug={decodeURIComponent(rest)} />;
    }
  } else {
    content = <Empty>없는 경로입니다.</Empty>;
  }

  return (
    <div className="flex flex-col gap-4">
      <TopNav sub={sub} />
      {content}
    </div>
  );
}
