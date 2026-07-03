# API 정의서 보완 루프 - Aiga

## Iteration 1 - OpenAPI primary artifact 생성과 YAML 보정

- 명령:
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/prepare-api-analysis.ts --project-name aiga`
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/generate-api-definition.ts --project-name aiga`
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/validate-api-definition.ts --project-name aiga`
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/review-api-definition.ts --project-name aiga`
- 정적 검증 결과: pass, 78 APIs, 64 paths, 23/23 features mapped, error 0, warning 0.
- 리뷰 결과: pass, 78 APIs, 23/23 features mapped, unmapped 0.
- 의미 검토:
  - API 정의서의 primary artifact를 `api-definition.openapi.yaml`로 두고, `api-definition.md`는 색인/리뷰용으로 분리했다.
  - 모든 operation에 `x-api-code`, `x-feature-codes`, `x-schema-codes`, `x-base-reuse-decision`, `x-base-feature-references`, `x-audit-action`을 포함했다.
  - product-builder-base 재사용은 커뮤니티, 커뮤니티 어드민, generic comment, identity-verification, feedback, admin-users/user-profile controller/service/dto 참조를 기록했다.
  - 외부 AI 채팅은 `POST /api/ai-chat/messages` 단일 API로 한정하고, 내부 AI 생성 구현은 범위에서 제외했다.
  - admin mutating operation은 모두 감사 액션을 갖도록 검증했다.
  - OpenAPI YAML의 `$ref` 값은 `#`가 YAML 주석으로 해석되지 않도록 quoted string으로 보정했다.
- 패치:
  - `.agents/skills/bbr-api-definition/`: API 정의서 workflow, generator, validation, review scripts 추가.
  - `/Users/bright/.codex/prompts/builder-api-definition.md`: Codex prompt 추가.
  - `/Users/bright/.codex/prompts/builder-api-definition-loop.md`: 반복 보완 prompt 추가.
  - `api-definition.openapi.yaml`, `api-definition.openapi.json`, `api-definition.md`, `api-coverage.json` 생성.
  - `api-definition.validation.json`, `api-definition.review.json`, `api-definition-review.md` 생성.
- 추가 확인:
  - `ruby -e 'require "yaml"; YAML.load_file(ARGV[0]); puts "yaml-ok"' generated/source-intake/aiga/runs/2026-07-02T14-15-45-808Z/api-definition.openapi.yaml`
- 남은 허용 warning: 없음.

## Iteration 2 - feature 단위 API grouping과 OpenAPI tag 재구성

- 명령:
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/generate-api-definition.ts --project-name aiga`
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/validate-api-definition.ts --project-name aiga`
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/review-api-definition.ts --project-name aiga`
  - `ruby -e 'require "yaml"; y=YAML.load_file(ARGV[0]); puts({tag_count:y["tags"].length, first_tag:y["tags"].first["name"], first_op_tags:y["paths"].values.first.values.first["tags"].first(2)}.inspect)' generated/source-intake/aiga/runs/2026-07-02T14-15-45-808Z/api-definition.openapi.yaml`
- 정적 검증 결과: pass, 78 APIs, 64 paths, 23/23 features mapped, error 0, warning 0.
- 리뷰 결과: pass, 78 APIs, 23/23 features mapped, unmapped 0.
- 의미 검토:
  - `api-definition.md`에 `## 4. 기능별 API 묶음(Feature API Groups)`를 추가해 API를 feature 단위로 먼저 볼 수 있게 했다.
  - OpenAPI YAML top-level `tags`를 23개 feature label(`FEA-### 기능명`)로 재구성했다.
  - 각 operation의 `tags`도 연결된 `x-feature-codes`와 같은 feature label을 사용하도록 변경했다.
  - 기존 domain 분류는 `Community`, `Admin` 같은 OpenAPI tag가 아니라 `x-domain-tag` 확장 필드로 보존했다.
  - validation script가 feature tag 규칙과 `x-domain-tag` 존재를 검증하도록 보강했다.
- 패치:
  - `api-definition.openapi.yaml`: top-level/operation tags를 feature 기준으로 재생성.
  - `api-definition.openapi.json`: feature tag mirror 반영.
  - `api-definition.md`: feature별 API 묶음 섹션과 최종 상태 section 재생성.
  - `.agents/skills/bbr-api-definition/scripts/generate-api-definition.ts`: feature tag/group rendering 반영.
  - `.agents/skills/bbr-api-definition/scripts/validate-api-definition.ts`: feature tag validation 추가.
  - `.agents/skills/bbr-api-definition/SKILL.md`, `/Users/bright/.codex/prompts/builder-api-definition.md`: feature tag 규칙 반영.
- 남은 허용 warning: 없음.

## Iteration 3 - 구현 차단 항목 API 보완

- 명령:
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/generate-api-definition.ts --project-name aiga`
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/validate-api-definition.ts --project-name aiga`
  - `node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/review-api-definition.ts --project-name aiga`
  - `ruby -e 'require "yaml"; y=YAML.load_file(ARGV[0]); puts "yaml-ok paths=#{y["paths"].length} schemas=#{y.dig("components","schemas").length}"' generated/source-intake/aiga/runs/2026-07-02T14-15-45-808Z/api-definition.openapi.yaml`
- 정적 검증 결과: pass, 97 APIs, 82 paths, 23/23 features mapped, error 0, warning 0.
- 리뷰 결과: pass, 97 APIs, 23/23 features mapped, unmapped 0, info 1.
- YAML parser 확인: pass, `yaml-ok paths=82 schemas=101`.
- 의미 검토:
  - 파일 업로드는 `POST /api/files/upload-url`, `POST /api/files/confirm`, `GET /api/files/{fileId}/signed-url`로 분리했다.
  - 내 활동과 저장 의료진은 `GET /api/me/activity`, `GET /api/me/saved-doctors`, `POST/DELETE /api/doctors/{doctorProfileId}/save`로 확정했다.
  - 분석 이벤트는 `POST /api/analytics/events`와 `AnalyticsEventRequest` / `AnalyticsEventIngestResponse`로 서버 수집 계약을 고정했다.
  - 어드민 인증은 `/api/admin/auth/login`, `/2fa/verify`, `/logout`, `/session`, `/2fa/setup`, `/2fa`를 추가하고 admin role marker와 감사 액션을 포함했다.
  - 콘텐츠 안전, 외부 연동 비용/상태, 의사 인증 취소, 콘텐츠 수정 이력은 admin 조회/처리 API로 추가했다.
  - 외부 AI 채팅 관련 운영 API도 외부 REST API 호출 상태/비용만 다루며 내부 `ai-runtime` 구현을 만들지 않는다.
- 패치:
  - `.agents/skills/bbr-api-definition/scripts/generate-api-definition.ts`: API-079..API-097, 파일/분석/admin auth/운영 로그 컴포넌트, admin role marker, 외부 REST 문구 보강.
  - `api-definition.openapi.yaml`, `api-definition.openapi.json`, `api-definition.md`, `api-coverage.json`: 97 API / 82 path / 26 schema mapping 기준으로 재생성.
- 남은 허용 warning: 없음.
