-- 댓글 조회 인덱스 최적화. listComments 는 `WHERE company_id=$1 AND contract_id=$2 ORDER BY created_at ASC`.

CREATE INDEX IF NOT EXISTS contract_comments_company_contract_idx
  ON plugin_contracts_1cc0dc1bb2.contract_comments (company_id, contract_id, created_at);
