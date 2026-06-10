-- 착수금 비율(%). split 지급방법에서 착수금 = 총액 × pct/100, 잔금 = 나머지.
-- 기존 행은 기존 동작(약 1/3)에 가까운 30% 기본값으로 채운다.
ALTER TABLE plugin_contracts_1cc0dc1bb2.contracts
  ADD COLUMN IF NOT EXISTS down_payment_pct integer NOT NULL DEFAULT 30;
