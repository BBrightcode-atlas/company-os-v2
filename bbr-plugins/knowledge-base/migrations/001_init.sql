-- 위키 페이지. LLM/사용자가 소유하는 마크다운 문서. slug 는 회사 내 unique.

CREATE TABLE IF NOT EXISTS plugin_wiki_de619b9165.pages (
  id            text PRIMARY KEY,
  company_id    text NOT NULL,
  slug          text NOT NULL,
  title         text NOT NULL,
  kind          text NOT NULL DEFAULT 'note',
  body          text NOT NULL DEFAULT '',
  tags          jsonb NOT NULL DEFAULT '[]'::jsonb,
  author        text NOT NULL DEFAULT 'user',
  source_count  integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pages_company_slug_uq
  ON plugin_wiki_de619b9165.pages (company_id, slug);
CREATE INDEX IF NOT EXISTS pages_company_kind_idx
  ON plugin_wiki_de619b9165.pages (company_id, kind);
CREATE INDEX IF NOT EXISTS pages_company_updated_idx
  ON plugin_wiki_de619b9165.pages (company_id, updated_at DESC);
