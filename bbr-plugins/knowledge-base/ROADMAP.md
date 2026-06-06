# 지식베이스 100x 로드맵 (karpathy "LLM Wiki" 완전 구현)

## 현재 v1 (뼈대)
pages(kind/tags/body) · links/백링크 · sources+ingest(단발 LLM) · ask(어휘검색) · 그래프 · schema(skill) · wiki:* 도구 · 노션식 UX + 자동저장.

## karpathy 모델 갭 = 100x 의 핵심
1. **index.md 부재** — 위키 전체 카탈로그(카테고리별, 페이지+1줄요약+소스수). 답변 시 **먼저 읽고 drill-in** = 임베딩 RAG 없이 동작하는 검색 메커니즘.
2. **log.md 부재** — 시계열 활동 로그(ingest/query/maintain). `## [YYYY-MM-DD] ingest | 제목`.
3. **답변 환원 안 됨** — "좋은 답변은 위키 페이지로". 탐색이 누적·복리되어야 함.
4. **ingest 얕음** — 단발 1콜. karpathy: 소스 요약페이지 + index갱신 + 엔티티/개념 다수페이지 갱신 + log. 소스↔페이지 provenance. HITL 리뷰.
5. **maintain(lint) 없음** — 모순/고아/미해결링크/중복엔티티/stale 요약 탐지·수정. LLM 이 한 번에 15파일 손봄.
6. **rich 답변 형식** — 비교표/차트/슬라이드, 각각 페이지 저장.
7. **provenance** — 페이지가 어떤 소스에서 왔는지, 소스가 어떤 페이지를 만들었는지.
8. **frontmatter/메타** — summary/aliases/dates/source_count → Dataview식 필터·표 뷰.
9. **스케일 검색** — pgvector 불가나 **Postgres 내장 FTS(to_tsvector/GIN, EXTENSION 불필요)** 로 진짜 검색 가능. index + 어휘 + FTS 하이브리드.
10. **aliases/redirects** — 엔티티 별칭으로 [[링크]] 해석.

## 단계 (차근차근)

### Phase 1 — 복리 코어 ★ (지금)
- **index 페이지**(slug `index`, kind overview, author system) 자동유지: 모든 변경/ingest 후 `rebuildIndex` → 카테고리별 `- [[slug]] 제목 — 요약 (N소스)`.
- **log 페이지**(slug `log`) append: ingest/answer-file/maintain 시각 기록.
- 페이지 `summary` 컬럼(migration) — LLM/사용자가 1줄 요약. index 풍부화.
- **ask 2-pass index-first**: ① index 카탈로그+질문 → 관련 slug 선택 ② 해당 페이지 본문 → 답변+인용.
- **답변 위키 저장**: ask 결과 → "위키에 저장"(kind synthesis) → 페이지 생성 + index + log.
- ingest 후 index/log 갱신.
- UI: 홈에 인덱스/로그 진입점, ask 저장 버튼, system 페이지 뱃지/그래프 제외.

### Phase 2 — 깊은 ingest + provenance
- ingest = 소스 요약페이지(kind source) + 엔티티/개념 갱신 + index/log. 소스↔페이지 양방향.
- **HITL 리뷰**: 제안 변경(생성/갱신 목록·diff) 미리보기 → 승인/거부/강조지시 후 적용.
- 페이지별 출처 소스 목록. 배치 ingest.

### Phase 3 — maintain(lint)
- 점검 실행: 모순·고아·미해결링크·중복/유사 엔티티·stale 요약 → 병합/분할/수정 제안 + 대시보드. 자동+리뷰.
- **aliases**(엔티티 별칭) → 링크 해석 강화.

### Phase 4 — rich 답변 + 뷰
- 비교표/표 형식 답변, 각 저장. frontmatter 필터·표 뷰(Dataview식). 그래프 개선(허브/고아 강조, kind 필터, focus).

### Phase 5 — 스케일/폴리시
- **Postgres FTS**(tsvector+GIN) 진짜 검색. 템플릿(kind별), URL 임포트, revision 히스토리.

## 원칙
- 사람=소스+질문, LLM=부기 전부. 모든 워크플로는 **index+log 갱신**으로 누적.
- 임베딩 RAG 회피(index-first + 어휘 + pg FTS). HITL 옵션.
