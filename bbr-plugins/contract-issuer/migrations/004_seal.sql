-- 을 직인(법인인감) 표시 여부 컬럼. 기본 true(서명란에 직인 찍힘).

ALTER TABLE plugin_contracts_1cc0dc1bb2.contracts
  ADD COLUMN IF NOT EXISTS use_seal boolean NOT NULL DEFAULT true;
