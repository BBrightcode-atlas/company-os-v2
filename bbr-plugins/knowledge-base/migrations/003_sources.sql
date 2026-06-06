-- raw 소스 계층. 사용자가 넣은 원문(마크다운/기사 등). ingest 시 LLM 이 위키로 통합.

CREATE TABLE IF NOT EXISTS plugin_wiki_de619b9165.sources (
  id             text PRIMARY KEY,
  company_id     text NOT NULL,
  title          text NOT NULL,
  url            text,
  raw_md         text NOT NULL DEFAULT '',
  status         text NOT NULL DEFAULT 'pending',
  summary        text,
  error_message  text,
  ingest_log     jsonb NOT NULL DEFAULT '[]'::jsonb,
  integrated_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sources_company_created_idx
  ON plugin_wiki_de619b9165.sources (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sources_company_status_idx
  ON plugin_wiki_de619b9165.sources (company_id, status);
