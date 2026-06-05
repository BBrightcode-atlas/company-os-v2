-- 계약 유형(개발/유지보수). 기존 행은 개발(development)로 기본.

ALTER TABLE plugin_contracts_1cc0dc1bb2.contracts
  ADD COLUMN IF NOT EXISTS contract_type text NOT NULL DEFAULT 'development';
