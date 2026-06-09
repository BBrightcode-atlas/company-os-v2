-- 견적 요청에 첨부한 참고 자료(요구사항 문서) 텍스트 저장.
-- 업로드(md/txt/PDF)는 클라이언트에서 텍스트로 추출해 jsonb 배열로 보관: [{filename, text}].
-- 원본 파일은 보관하지 않는다(파싱 텍스트만). 분석/보완 프롬프트에 첨부된다.
-- 네임스페이스 하드코딩: plugin_quotes_c16f8cb52b (001_init.sql 과 동일).
-- 제약: TRIGGER/FUNCTION/EXTENSION/DROP/TRUNCATE/DELETE 금지.

ALTER TABLE plugin_quotes_c16f8cb52b.quotes
  ADD COLUMN IF NOT EXISTS reference_docs jsonb NOT NULL DEFAULT '[]'::jsonb;
