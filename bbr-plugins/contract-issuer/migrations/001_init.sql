-- 계약 플러그인 초기 스키마.
-- 네임스페이스 하드코딩: plugin_contracts_1cc0dc1bb2
--   = plugin_${slug=contracts}_${sha256("paperclip-plugin-contract-issuer").slice(0,10)}
-- 제약: TRIGGER/FUNCTION/EXTENSION/DROP/TRUNCATE/DELETE 금지. updated_at 은 앱레벨로 set.

CREATE TABLE IF NOT EXISTS plugin_contracts_1cc0dc1bb2.contracts (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  gab_company text NOT NULL,
  gab_ceo text,
  gab_biz_no text,
  gab_address text,
  project_desc text NOT NULL DEFAULT '',
  partner_info text,
  period_start date,
  period_end date,
  monthly_amount bigint,
  total_amount bigint,
  vat_mode text NOT NULL DEFAULT '별도',
  jurisdiction text,
  contract_date date,
  status text NOT NULL DEFAULT 'draft',
  data jsonb,
  html text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_company_status_idx
  ON plugin_contracts_1cc0dc1bb2.contracts (company_id, status, created_at DESC);
