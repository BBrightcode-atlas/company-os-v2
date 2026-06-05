-- 견적 플러그인 초기 스키마.
-- 네임스페이스는 fully-qualified 로 박는다: plugin_quotes_c16f8cb52b
--   = plugin_${slug=quotes}_${sha256("paperclip-plugin-quote-issuer").slice(0,10)}
-- (host 검증기가 bare 테이블명을 거부하므로 스키마명 하드코딩 필수)
-- 제약: TRIGGER/FUNCTION/EXTENSION/DROP/TRUNCATE/DELETE 금지. updated_at 은 앱레벨로 set.

CREATE TABLE IF NOT EXISTS plugin_quotes_c16f8cb52b.quotes (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  requirements text NOT NULL DEFAULT '',
  work_scope text NOT NULL DEFAULT '',
  expected_price bigint,
  platform text,
  vat_mode text NOT NULL DEFAULT '별도',
  status text NOT NULL DEFAULT 'draft',
  analysis jsonb,
  html text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_company_status_idx
  ON plugin_quotes_c16f8cb52b.quotes (company_id, status, created_at DESC);

-- 참고 단가표 (단가 운영기준 ABADC ver.07). 유사 프로젝트 기준점.
CREATE TABLE IF NOT EXISTS plugin_quotes_c16f8cb52b.reference_rates (
  category text PRIMARY KEY,
  standard_price bigint NOT NULL,
  note text
);

INSERT INTO plugin_quotes_c16f8cb52b.reference_rates (category, standard_price, note) VALUES
  ('기획/설계', 2500000, 'ABADC ver.07 기준'),
  ('PWA/UX', 3000000, NULL),
  ('인증/계정', 2400000, NULL),
  ('결제/구독', 3000000, NULL),
  ('메인/알림', 1800000, NULL),
  ('강의', 3200000, NULL),
  ('정보모음', 2400000, NULL),
  ('아이/스케줄', 3200000, NULL),
  ('표적행동 저장소', 4800000, NULL),
  ('세션 데이터 입력', 5800000, NULL),
  ('NET 추가범위', 2400000, NULL),
  ('보고서/PDF', 2800000, NULL),
  ('그래프', 3200000, NULL),
  ('관리자/운영', 2800000, NULL),
  ('인프라/보안', 2200000, NULL),
  ('QA/안정화', 2700000, NULL)
ON CONFLICT (category) DO NOTHING;
