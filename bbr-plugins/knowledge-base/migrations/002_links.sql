-- 위키 링크(엣지). source page 본문의 [[target]] 마다 한 행. 페이지 저장 시 전량 재구축.
-- target_page_id 가 null 이면 미해결 링크(아직 없는 페이지 가리킴).

CREATE TABLE IF NOT EXISTS plugin_wiki_de619b9165.links (
  id              text PRIMARY KEY,
  company_id      text NOT NULL,
  source_page_id  text NOT NULL,
  target_slug     text NOT NULL,
  target_page_id  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS links_company_source_idx
  ON plugin_wiki_de619b9165.links (company_id, source_page_id);
CREATE INDEX IF NOT EXISTS links_company_target_slug_idx
  ON plugin_wiki_de619b9165.links (company_id, target_slug);
CREATE INDEX IF NOT EXISTS links_company_target_page_idx
  ON plugin_wiki_de619b9165.links (company_id, target_page_id);
