-- 댓글 조회 인덱스 최적화. listComments 는 `WHERE company_id=$1 AND quote_id=$2 ORDER BY created_at ASC`
-- 로 조회하므로 선두 컬럼에 company_id 를 둔 복합 인덱스가 더 정확히 매칭된다.
-- (002 의 (quote_id, created_at) 인덱스는 그대로 둔다 — 마이그레이션은 DROP 불가.)

CREATE INDEX IF NOT EXISTS quote_comments_company_quote_idx
  ON plugin_quotes_c16f8cb52b.quote_comments (company_id, quote_id, created_at);
