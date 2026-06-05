-- 견적 댓글 스레드 (보완/논의 + AI 재산정 결과 기록).
-- 네임스페이스 하드코딩: plugin_quotes_c16f8cb52b (001_init.sql 과 동일).
-- 제약: TRIGGER/FUNCTION/EXTENSION/DROP/TRUNCATE/DELETE 금지. created_at 만 사용(댓글 불변).

CREATE TABLE IF NOT EXISTS plugin_quotes_c16f8cb52b.quote_comments (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES plugin_quotes_c16f8cb52b.quotes(id) ON DELETE CASCADE,
  author_type text NOT NULL DEFAULT 'user',   -- user | assistant | system
  author_user_id text,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'comment',        -- comment | revision
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quote_comments_quote_idx
  ON plugin_quotes_c16f8cb52b.quote_comments (quote_id, created_at);
