-- 검토 모드(HITL): ingest 가 적용 전 제안 계획을 여기 보관. status='review' 일 때만 채워짐.

ALTER TABLE plugin_wiki_de619b9165.sources
  ADD COLUMN IF NOT EXISTS proposed jsonb;
