-- 견적 유형: development(개발=일회성) / maintenance(유지보수=월). 기본 development.
-- 템플릿 제목/공급가액 라벨('(월)' 표기) 분기에 사용.
-- 네임스페이스 하드코딩: plugin_quotes_c16f8cb52b. 제약: TRIGGER/FUNCTION/EXTENSION/DROP/TRUNCATE/DELETE 금지.

ALTER TABLE plugin_quotes_c16f8cb52b.quotes
  ADD COLUMN IF NOT EXISTS quote_type text NOT NULL DEFAULT 'development';
