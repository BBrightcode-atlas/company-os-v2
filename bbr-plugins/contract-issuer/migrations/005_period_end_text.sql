-- 계약 종료일을 날짜뿐 아니라 자유문구("완료시까지" 등)도 받도록 date → text 로 변경.
-- (시작일/계약일자는 date 유지.)

ALTER TABLE plugin_contracts_1cc0dc1bb2.contracts
  ALTER COLUMN period_end TYPE text USING period_end::text;
