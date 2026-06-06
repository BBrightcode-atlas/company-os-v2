-- 진짜 검색: Postgres 내장 FTS(EXTENSION 불필요). 'simple' config 는 언어무관 토큰화
-- (한글은 공백/구두점 기준 토큰 — 형태소 분석은 안 되지만 ILIKE 보다 정확+빠름. 어휘 폴백 병행).
-- 생성 컬럼이라 title/body 변경 시 자동 갱신.

ALTER TABLE plugin_wiki_de619b9165.pages
  ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS pages_tsv_idx
  ON plugin_wiki_de619b9165.pages USING GIN (tsv);
