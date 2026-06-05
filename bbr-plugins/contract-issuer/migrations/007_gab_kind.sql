-- 갑(고객) 주체 유형. business=사업자(회사명/대표자/사업자등록번호), individual=개인(성명/생년월일).
-- 기존 행은 사업자(business)로 기본. gab_birth 는 개인 갑 생년월일(선택).

ALTER TABLE plugin_contracts_1cc0dc1bb2.contracts
  ADD COLUMN IF NOT EXISTS gab_kind text NOT NULL DEFAULT 'business';

ALTER TABLE plugin_contracts_1cc0dc1bb2.contracts
  ADD COLUMN IF NOT EXISTS gab_birth text;
