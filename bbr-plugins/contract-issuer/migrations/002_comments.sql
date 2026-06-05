-- 계약 댓글 스레드 (보완/논의 + AI 보완 결과 기록).
-- 네임스페이스 하드코딩: plugin_contracts_1cc0dc1bb2.
-- 제약: TRIGGER/FUNCTION/EXTENSION/DROP/TRUNCATE/DELETE 금지. created_at 만 사용(댓글 불변).

CREATE TABLE IF NOT EXISTS plugin_contracts_1cc0dc1bb2.contract_comments (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES plugin_contracts_1cc0dc1bb2.contracts(id) ON DELETE CASCADE,
  author_type text NOT NULL DEFAULT 'user',   -- user | assistant | system
  author_user_id text,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'comment',        -- comment | revision
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_comments_contract_idx
  ON plugin_contracts_1cc0dc1bb2.contract_comments (contract_id, created_at);
