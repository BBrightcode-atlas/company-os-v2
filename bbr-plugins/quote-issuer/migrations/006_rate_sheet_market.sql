-- 단가 산정표에 시세(천장) + 재사용도 컬럼 추가.
-- standard_price = BBR 단가(견적 기준가), market_price = SI 외주 시세(천장, 고객 설득용 참고),
-- reuse_level = 재사용도(구현완료/일부재사용/신규).
-- 네임스페이스 하드코딩: plugin_quotes_c16f8cb52b. 제약: TRIGGER/FUNCTION/EXTENSION/DROP/TRUNCATE/DELETE 금지.

ALTER TABLE plugin_quotes_c16f8cb52b.rate_sheet
  ADD COLUMN IF NOT EXISTS market_price bigint,
  ADD COLUMN IF NOT EXISTS reuse_level text;
