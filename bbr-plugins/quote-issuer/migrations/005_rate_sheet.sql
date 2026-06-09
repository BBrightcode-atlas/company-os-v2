-- 기능별 단가 산정표(데이터 시트). 견적 산출의 표준 단가 기준선 + 운영자가 편집.
-- 기존 reference_rates(category PK, 코어스)와 별개: 기능별 행(대분류/항목/범위근거/표준단가/비고/순서).
-- 시드는 worker(ensureRateSheetSeeded)가 빈 테이블일 때 1회 삽입(DEFAULT_RATE_SHEET).
-- 네임스페이스 하드코딩: plugin_quotes_c16f8cb52b. 제약: TRIGGER/FUNCTION/EXTENSION/DROP/TRUNCATE/DELETE 금지.

CREATE TABLE IF NOT EXISTS plugin_quotes_c16f8cb52b.rate_sheet (
  id uuid PRIMARY KEY,
  category text NOT NULL DEFAULT '',
  item text NOT NULL DEFAULT '',
  scope_basis text NOT NULL DEFAULT '',
  standard_price bigint NOT NULL DEFAULT 0,
  note text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_sheet_order_idx
  ON plugin_quotes_c16f8cb52b.rate_sheet (sort_order, created_at);
