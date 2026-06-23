// plugin-llm-wiki 연동 (브라우저 board 세션 전용)
//
// cos-blueprint worker는 board/agent 인증이 없어 다른 플러그인의 apiRoute를 호출할 수 없다.
// 반면 이 UI는 호스트에 임베드되어 사용자의 board 세션 쿠키를 가지므로, wiki 플러그인의
// apiRoute(file-as-page 등)를 같은 출처(same-origin) 상대경로 fetch로 직접 부를 수 있다.
//
// 핵심 함정:
// - URL은 `/api` 하위에 `/plugins/:id/api` 가 mount 되어 경로에 `/api` 가 2번 들어간다.
// - credentials:"include" 가 board 세션 쿠키를 실어 보내는 load-bearing 옵션. 빠지면 401.
// - create-space는 idempotent가 아니다(중복 slug → 500). 반드시 목록 조회 후 없을 때만 생성.

import { WIKI_PLUGIN_ID, type WikiPageDoc, type WikiSpaceTarget } from "../contract.js";

// wiki 플러그인 apiRoute의 절대(상대) URL. 예) wikiUrl("file-as-page") →
// /api/plugins/paperclipai.plugin-llm-wiki/api/file-as-page
export function wikiUrl(route: string, query?: Record<string, string>): string {
  const base = `/api/plugins/${encodeURIComponent(WIKI_PLUGIN_ID)}/api/${encodeURIComponent(route)}`;
  if (!query) return base;
  const qs = new URLSearchParams(query).toString();
  return qs ? `${base}?${qs}` : base;
}

async function wikiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      message = data.error || data.message || message;
    } catch {
      // 본문 파싱 실패는 무시하고 statusText 사용.
    }
    throw new Error(`wiki ${res.status}: ${message}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

interface WikiSpaceRow {
  slug: string;
  displayName?: string;
  status?: string;
}

export async function listWikiSpaces(companyId: string): Promise<WikiSpaceRow[]> {
  const data = await wikiFetch<{ spaces?: WikiSpaceRow[] }>(wikiUrl("spaces", { companyId }));
  return data.spaces ?? [];
}

// 프로젝트 space find-or-create. create-space는 중복 slug에 500을 내므로 먼저 목록을 조회하고
// 없을 때만 생성한다. 동시 생성 경합으로 생성이 실패하면 재조회로 흡수하고, 그래도 없으면 throw.
export async function ensureWikiSpace(companyId: string, space: WikiSpaceTarget): Promise<string> {
  const existing = await listWikiSpaces(companyId);
  if (existing.some((row) => row.slug === space.slug)) return space.slug;
  try {
    await wikiFetch(wikiUrl("spaces"), {
      method: "POST",
      body: JSON.stringify({ companyId, slug: space.slug, displayName: space.displayName }),
    });
  } catch (err) {
    const after = await listWikiSpaces(companyId);
    if (!after.some((row) => row.slug === space.slug)) throw err;
  }
  return space.slug;
}

// 산출물 markdown을 wiki 페이지로 기록. 동일 path 재호출은 wiki 측에서 update(멱등)된다.
export async function fileWikiPage(companyId: string, spaceSlug: string, page: WikiPageDoc): Promise<void> {
  await wikiFetch(wikiUrl("file-as-page"), {
    method: "POST",
    body: JSON.stringify({
      companyId,
      spaceSlug,
      path: page.path,
      title: page.title,
      contents: page.contents,
    }),
  });
}

export interface WikiRegisterResult {
  spaceSlug: string;
  filed: number;
  failed: number;
  failures: string[];
}

// space 보장 후 각 페이지를 순차 등재한다. 한 건이 실패해도 나머지는 계속 진행(부분 복원력).
export async function registerPagesToWiki(
  companyId: string,
  space: WikiSpaceTarget,
  pages: WikiPageDoc[],
): Promise<WikiRegisterResult> {
  await ensureWikiSpace(companyId, space);
  let filed = 0;
  const failures: string[] = [];
  for (const page of pages) {
    try {
      await fileWikiPage(companyId, space.slug, page);
      filed += 1;
    } catch (err) {
      failures.push(`${page.path}: ${err instanceof Error ? err.message : "등재 실패"}`);
    }
  }
  return { spaceSlug: space.slug, filed, failed: failures.length, failures };
}
