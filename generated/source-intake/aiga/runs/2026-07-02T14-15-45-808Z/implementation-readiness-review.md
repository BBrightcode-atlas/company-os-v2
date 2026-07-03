# 구현 착수 가능성 리뷰 - Aiga

## 결론

기능정의서, 스키마 정의서, API 정의서는 2026-07-03 기준 개발 착수용 최종 산출물로 사용할 수 있다.

- 선택 영역은 `admin`, `site`, `server`로 유지했다.
- AI 채팅은 별도 외부 REST API를 호출하는 계약까지만 포함했고, 내부 `ai-runtime` 구현은 제외했다.
- product-builder-base 재사용 범위는 feature/schema/API에 모두 명시했다.
- 커뮤니티는 product-builder-base community schema/API를 최대한 재사용하고 Aiga 특화 필드만 확장한다.
- 정적 검증과 자체 리뷰는 모두 pass이며 error/warning 0이다.

## 최종 검증 상태

| 산출물 | 최종 상태 | 커버리지 | 검증 |
| --- | --- | --- | --- |
| 기능정의서 | `feature-definition.md` | 23 features, 109 rows | pass, error 0, warning 0 |
| 스키마 정의서 | `schema-definition.md`, `schema-coverage.json` | 26 schemas, 23/23 features mapped | pass, error 0, warning 0 |
| API 정의서 | `api-definition.openapi.yaml`, `api-definition.md`, `api-coverage.json` | 97 APIs, 82 paths, 26/26 schemas mapped | pass, error 0, warning 0 |
| OpenAPI YAML | `api-definition.openapi.yaml` | 101 component schemas | YAML parser pass |

## 보완 완료 항목

| 우선순위 | 항목 | 보완 결과 | 관련 산출물 |
| --- | --- | --- | --- |
| P0 | 파일 업로드/스토리지 계약 | `SCH-020 files`, `API-079` upload-url, `API-080` confirm, `API-081` signed-url 추가. product-builder-base core files/storage 확장으로 명시. | `schema-definition.md`, `api-definition.openapi.yaml` |
| P0 | 의사 프로필 상세 필드 | `doctor_profiles`와 `DoctorProfile`에 대표 전화, 예약 URL, 소개, 전문 분야, 진료 시간, 경력, 학력, 논문, 프로필 이미지, 후기 수, 인증 취소 상태를 추가. | `schema-coverage.json`, `api-definition.openapi.yaml` |
| P0 | 저장한 의료진/내 활동 | `SCH-021 saved_doctors`, `API-082` 내 활동, `API-083` 저장 의료진 목록, `API-084/085` 저장/취소 추가. | `schema-definition.md`, `api-definition.md` |
| P0 | 분석 이벤트 서버 계약 | `SCH-022 analytics_events`, `API-086 POST /api/analytics/events`, `AnalyticsEventRequest`/`AnalyticsEventIngestResponse` 추가. | `schema-coverage.json`, `api-definition.openapi.yaml` |
| P0 | 어드민 2FA/세션 정책 | `SCH-023 admin_mfa_factors`, `API-087`..`API-092` admin login/2FA/session/logout/setup/disable 추가. | `schema-definition.md`, `api-definition.md` |
| P1 | 콘텐츠 안전 로그/비용/호출량 | `SCH-024 content_safety_logs`, `SCH-025 integration_call_logs`, `API-093` content safety logs, `API-094` integration call logs, `API-095` integration status 추가. | `schema-definition.md`, `api-definition.openapi.yaml` |
| P1 | 의사 인증 취소 | `doctor_profiles` 인증 취소 필드와 `API-096 POST /api/admin/doctors/{doctorProfileId}/verification-cancel` 추가. | `schema-coverage.json`, `api-definition.md` |
| P1 | 후기/댓글 원본 보관과 수정 이력 | `SCH-026 content_edit_histories` 추가, 게시글/댓글/후기/리뷰 댓글에 original hash/body, edit count, deletedAt/status 필드 보강, `API-097` 이력 조회 추가. | `schema-definition.md`, `api-definition.openapi.yaml` |
| P1 | 외부 OCR/이미지 안전 provider 운영 | `integration_call_logs`와 admin integration status API에서 OCR, image moderation, external AI REST 호출량/오류/latency/cost를 다룬다. secret 원문은 반환하지 않는다. | `schema-definition.md`, `api-definition.md` |

## 개발 착수 기준

| 영역 | 사용 기준 |
| --- | --- |
| 기능 구현 | `feature-definition.md`의 feature row와 reuse 컬럼을 기준으로 task를 나눈다. |
| DB/migration | `schema-definition.md`의 `SCH-###`와 Mermaid ERD를 기준으로 Drizzle schema/migration을 작성한다. |
| REST API | `api-definition.openapi.yaml`을 primary contract로 사용한다. |
| QA/API test | `api-coverage.json`의 feature/schema/API mapping을 기준으로 coverage를 확인한다. |
| 재사용 | product-builder-base community/comment/auth/identity/feedback/admin/storage/analytics/integration 참조를 먼저 확인한다. |

## 남은 전제

- 고객 원문에 없는 외부 provider의 실제 vendor명, credential, 과금 단위는 구현 시 환경 변수와 운영 설정으로 확정해야 한다.
- UI 화면정의서와 구현 task 추출 단계에서는 이 정의서의 `FEA-###`, `SCH-###`, `API-###` 코드를 그대로 참조해야 한다.
- 외부 AI 채팅 본체는 별도 REST API가 제공한다는 전제가 유지되어야 하며, 이 프로젝트에서는 server/site 연동과 운영 로그까지만 구현한다.
