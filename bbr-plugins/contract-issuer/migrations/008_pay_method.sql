-- 지급방법(제3조). split=착수금+잔금, on_completion=완료시 전액, monthly=매월 정기.
-- 기존 행은 split 기본. 단, 월 금액이 있던 행은 monthly 로 백필(기존 렌더 보존).

ALTER TABLE plugin_contracts_1cc0dc1bb2.contracts
  ADD COLUMN IF NOT EXISTS pay_method text NOT NULL DEFAULT 'split';

UPDATE plugin_contracts_1cc0dc1bb2.contracts
  SET pay_method = 'monthly'
  WHERE monthly_amount IS NOT NULL AND monthly_amount > 0;
