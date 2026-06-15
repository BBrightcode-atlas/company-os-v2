# Product Builder

BBR 전용 Paperclip 플러그인. 반복 외주 개발에서 제품/서비스 제작 워크플로우를 blueprint로 선택하고, 재사용 판정과 구현 task를 Paperclip issue graph로 생성한다.

## Blueprints

현재 포함된 blueprint:

- `online-service-standard` — 온라인 서비스
  - 구현 기준 코드베이스는 `product-builder-base`
  - 기준 repo: `https://github.com/BBrightcode-atlas/product-builder-base`
  - 로컬 기준 path: `/Users/bright/Projects/product-builder-base`
  - 기본 branch: `develop`
  - 공개 서비스는 SEO/AEO/GEO 때문에 Next.js App Router 기본
  - API 계약은 REST + OpenAPI
  - DB/배포 기본값은 Neon + Vercel
  - tRPC 제외
  - 공개 페이지는 비로그인 탐색 가능, 보호 액션은 로그인/회원가입 모달로 게이트
  - 온라인 서비스 제작의 큰 task는 매번 고정 생성
  - feature 선택값은 task 삭제가 아니라 기본 decision override로 반영
  - 도메인 기능 카드는 DATA/API/공개/앱/관리자/AI/QA 반복 issue로 확장
  - 기본 feature: email 인증, Email(Resend) 템플릿 관리/발송, Vercel Blob 파일 업로드, 관리자 사용자 관리
  - 선택 feature: Google/Kakao/Naver OAuth, 단건 결제, 월간/연간 구독 결제, Polar.sh provider, KG이니시스(INICIS) provider, 알림톡, 온라인 영상 강의(Cloudflare Stream), [KCB] 본인확인, 커뮤니티
  - email 인증과 Email(Resend)은 필수이며, provider 연결·템플릿 데이터 모델·CRUD API·미리보기/테스트/실발송 API·관리자 UI·QA task로 세분화
  - 파일 업로드는 Vercel Blob 기반 기본 feature이며, provider/env·metadata schema·업로드 생성/token API·완료 확정 API·목록/상세/수정/삭제 API·사용자 UI·관리자 UI·QA task로 세분화
  - Vercel Blob 최초 구현 시 공식 문서 `https://vercel.com/docs/vercel-blob`, client upload `https://vercel.com/docs/vercel-blob/client-upload`, server upload `https://vercel.com/docs/vercel-blob/server-upload`을 기준으로 하며, `BLOB_READ_WRITE_TOKEN` env와 접근/삭제 정책을 issue에 남긴다.
  - 온라인 영상 강의 선택 시 Cloudflare Stream provider를 사용하고, provider/env·metadata schema·direct/tus upload·processing webhook·목록/상세/수정/삭제 API·signed playback·진행률·player UI·관리자 UI·QA task로 세분화
  - Cloudflare Stream 최초 구현 시 공식 문서 `https://developers.cloudflare.com/stream/`, direct creator uploads `https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/`, resumable uploads `https://developers.cloudflare.com/stream/uploading-videos/resumable-uploads/`, signed playback `https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/`, webhooks `https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/`을 기준으로 하며, Cloudflare account id, Stream API token, webhook secret, playback 보안 정책을 issue에 남긴다.
  - [KCB] 본인확인 선택 시 KCB/Ok-name provider를 사용하고, provider/계약/env·KCB JAR/JVM adapter 실행 경계·최소 개인정보/동의 데이터 모델·세션 생성 API·callback/결과 검증 API·상태/재시도 API·보호 액션 UI·관리자 UI·QA task로 세분화
  - KCB 본인확인 최초 구현 시 공개 소개 URL `https://www.ok-name.co.kr/`, `https://datastore.koreacb.com/site/kcbserviceIntro.do`를 기록하되, 요청/응답/암복호화/서명/hash/callback/result code는 고객의 KCB/Ok-name 계약서와 공식 연동가이드/테스트 계정/상점 설정으로 확인된 값만 사용한다. KCB JAR 파일/버전/checksum/JVM 요구사항을 issue에 남기고, 기본 Vercel Node runtime에서 JAR 직접 실행을 가정하지 않는다. Railway는 별도 Java/JVM adapter service 후보로 사용할 수 있으며, `https://docs.railway.com/guides/spring-boot`, `https://docs.railway.com/deployments/reference`, `https://docs.railway.com/variables`, `https://docs.railway.com/networking/private-networking/` 기준으로 배포/env/private networking/health check를 검증한다. 주민등록번호와 KCB 원문 민감 payload는 저장하지 않고 CI/DI 등 최소 식별값의 보존/삭제 정책을 issue에 남긴다.
  - 알림톡 선택 시 카카오 비즈채널·템플릿 승인·템플릿 CRUD 4개 API·발송/SMS 대체발송·관리자 UI·QA task를 실행
  - 커뮤니티 선택 시 커뮤니티 CRUD, 가입/탈퇴, 멤버/모더레이터, 게시글 CRUD, 댓글 CRUD, 리액션, 투표, 피드 랭킹, karma, 신고, 작성자 차단, 숨김, 필터, 규칙/flair/금칙어, 제재/이의제기, 사용자 UI, 관리자 모더레이션/통계, Apple/Google UGC 가이드라인 검증 task를 실행
  - 결제 선택 시 Polar/INICIS provider 선택값에 따라 결제 세부 task가 실행 대상이 되고, 미선택 provider는 N/A SKIP 기록으로 생성
  - Polar.sh provider는 Flotter 결제 기능을 재사용/확장 후보로 조사한다. Flotter에는 Polar adapter, webhook, 결제 schema, 앱 결제 UI, 관리자 결제 UI가 있으나 Product Builder 표준은 REST/OpenAPI라 이관 gap을 별도 task로 검수한다.
  - KG이니시스(INICIS)는 고객 사업자와 PG 계약/심사/MID/signKey/운영 전환이 외부 blocker가 될 수 있으므로 provider 선행작업 task를 별도로 둔다.
  - INICIS 최초 개발 시 일반결제는 공식 매뉴얼 `https://manual.inicis.com/pay/stdpay_pc.html`, 정기결제는 공식 매뉴얼 `https://manual.inicis.com/pay/bill.html`을 기준으로 하며, 문서/계약/상점 설정으로 확인되지 않은 파라미터와 payload는 추론 구현하지 않는다.
  - `REUSE`, `EXTEND`, `NEW`, `N/A` 판정을 issue 본문에 명시
  - `REUSE` issue는 `product-builder-base:<capability-path>@<tag-or-commit>` 형식의 출처를 가져야 하며, `PB-BASE-001`이 repo/path/ref를 증명하지 못하면 완료된 REUSE로 보지 않는다.
  - `REUSE`/`N/A` issue는 완료된 SKIP 기록으로 생성해 downstream blocker를 막지 않음
  - 최종 완료는 Vercel URL에서 공개 탐색, auth modal, 가입/로그인, 보호 기능 진입, 관리자 접근 제어 smoke 통과가 기준

- `web-application-service-standard` — 웹 어플리케이션 서비스
  - SEO가 핵심이 아닌 SPA 어플리케이션, REST 서버, 관리자, AI 서버 제작 워크플로우
  - Web은 Vite React SPA
  - API 계약은 REST + OpenAPI
  - AI 서버는 별도 runtime/boundary task로 분리
  - DB/배포 기본값은 Neon + Vercel
  - tRPC 제외
  - `온라인 서비스`와 동일하게 fixed task catalog를 생성하고, 해당 없는 task는 REUSE/N/A SKIP 기록으로 닫음
  - 웹 어플리케이션 도메인 기능은 SPA/API/Admin/AI 서버 영역 issue로 확장

Wonderwall 스타일 온라인 교육 서비스는 기본 intake 예시일 뿐이며, blueprint task 자체는 특정 서비스 도메인에 묶지 않는다.

## Build

```bash
cd bbr-plugins/product-builder
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Install

빌드 후 Paperclip 인스턴스에서 local path plugin으로 설치한다.

```http
POST /api/plugins/install
Content-Type: application/json

{
  "packageName": "/Users/bright/conductor/workspaces/company-os-v2/hyderabad/bbr-plugins/product-builder",
  "isLocalPath": true
}
```

## Operating Model

- Product Builder는 범용 workflow engine이 아니라 BBR 제품 제작 단위의 extension이다.
- 큰 workflow는 먼저 `온라인 서비스`와 `웹 어플리케이션 서비스`로 나눈다.
- 실제 납품용 템플릿 코드는 Flotter에 넣지 않고 준비된 `product-builder-base`에 둔다.
- `product-builder-base` 기준 repo는 `https://github.com/BBrightcode-atlas/product-builder-base`, 로컬 path는 `/Users/bright/Projects/product-builder-base`, 기본 branch는 `develop`이다.
- Flotter는 product-builder-base capability를 보강하기 위한 reference로만 사용한다.
- `REUSE`는 "어딘가에 있음"이 아니라 `product-builder-base:<capability-path>@<tag-or-commit>`로 증명 가능한 capability를 뜻한다.
- `PB-BASE-001`은 base repo URL/path, branch, tag/commit, capability registry, auth/admin/email/notification/payment source map을 확정하는 verification gate다. 이 값이 없으면 downstream `REUSE` issue를 완료 처리하지 않는다.
- 구현 착수 전 `PB-REPO-001`에서 실제 고객 납품 repo, execution workspace, branch 전략, Vercel 연결 대상을 고정한다.
- 동일 기능은 매번 새 구현 issue를 만들지 않고 capability decision으로 남긴다.
- feature 선택은 인증/결제/provider/관리자 하위 task의 기본 판정값을 계산하는 상위 설정이다.
- 결제 feature는 큰 task 하나로 묶지 않는다. provider 결정, Flotter 재사용 감사, 데이터 모델, 상품/플랜 CRUD API 4개, checkout, webhook, entitlement, 주문/환불 API, provider adapter, 사용자 UI, 관리자 UI, QA가 별도 issue로 생성되어야 한다.
- Polar.sh는 Flotter의 기존 capability를 REUSE/EXTEND 후보로 조사한다. INICIS는 선택 시 상점 계약/env, checkout, 승인 callback, 가상계좌 webhook, Cancel API V2 환불, 구독/정기결제 gap 판정을 별도 task로 실행한다.
- INICIS task 설명에는 공식 매뉴얼을 반드시 남긴다. 일반결제: `https://manual.inicis.com/pay/stdpay_pc.html`, 정기결제: `https://manual.inicis.com/pay/bill.html`. 최초 구현 에이전트는 이 문서와 계약/상점 설정으로 확인되지 않은 값을 추론해서 구현하면 안 된다.
- Email(Resend)와 알림톡도 feature 선택값으로 다룬다. Email(Resend)은 필수 실행 대상이고, 알림톡은 선택되지 않으면 관련 세부 task 전체가 N/A SKIP으로 남긴다.
- 알림 feature는 큰 task 하나로 묶지 않는다. 이메일과 알림톡 모두 provider, 데이터 모델, CRUD API, 발송 API, 관리자 UI, QA가 검증 가능한 별도 issue로 생성되어야 한다.
- 파일 업로드는 Vercel Blob 기반 기본 feature로 다룬다. 선택 해제할 수 없고, PB-FILE-* task는 base 구현 backlog로 전달 가능한 issue body를 가져야 한다.
- 파일 업로드 feature는 큰 task 하나로 묶지 않는다. provider/env, metadata schema, 업로드 생성/token, 업로드 완료 확정, 목록/상세/수정/삭제 REST API, 재사용 UI, 관리자 UI, QA가 별도 issue로 생성되어야 한다.
- 온라인 영상 강의는 선택 가능한 재사용 feature로 다룬다. 선택 시 PB-VIDEO-* task는 EXTEND 실행 대상이 되고, 미선택 시 N/A SKIP으로 남긴다.
- 영상 강의 feature는 큰 task 하나로 묶지 않는다. Cloudflare provider/env, metadata schema, direct/tus upload, webhook, 목록/상세/수정/삭제 API, signed playback, 진행률, player UI, 관리자 UI, QA가 별도 issue로 생성되어야 한다.
- [KCB] 본인확인은 선택 가능한 재사용 feature로 다룬다. 선택 시 PB-IDV-KCB-* task는 EXTEND 실행 대상이 되고, 미선택 시 N/A SKIP으로 남긴다.
- KCB 본인확인 feature는 로그인 자체가 아니라 보호 액션/결제/성인/권한 확인에서 쓰는 identity gate다. provider/계약/env, KCB JAR/JVM adapter 실행 경계, 최소 개인정보/동의 데이터 모델, 세션 생성 API, callback/결과 검증 API, 상태/재시도 API, 보호 액션 UI, 관리자 UI, QA가 별도 issue로 생성되어야 한다.
- KCB JAR은 Node/Next/Vercel 함수 안에서 바로 실행된다고 가정하지 않는다. Railway는 별도 Java/JVM adapter service 후보로 가능하지만, 기본 Neon/Vercel workflow 전체를 Railway로 바꾸는 것이 아니라 Vercel/Node API가 호출하는 JVM 경계를 추가하는 방식으로 다룬다.
- KCB 요청/응답/암복호화/서명/hash/callback/result code는 고객의 KCB/Ok-name 계약서와 공식 연동가이드/테스트 계정/상점 설정으로 확인된 값만 사용한다. 비공식 샘플이나 추론으로 구현하면 안 된다.
- 커뮤니티도 feature 선택값으로 다룬다. `product-builder-base`의 커뮤니티 기능은 우선 REUSE 후보이며, 선택 시 커뮤니티 CRUD, 가입/탈퇴, 멤버/모더레이터, 게시글/댓글 CRUD, 리액션, 투표, 피드 랭킹, karma, 신고/차단/숨김/필터, rules/flair/금칙어, 제재/이의제기, 사용자 UI, 관리자 모더레이션/통계, QA task가 EXTEND 실행 대상으로 바뀐다.
- 커뮤니티 REUSE는 문서상 "완료" 표시만으로 닫지 않는다. `product-builder-base:<capability-path>@<tag-or-commit>` 출처, REST/OpenAPI endpoint matrix, 앱/관리자 UI 경로, 서비스 테스트, E2E/QA 증거가 확인되어야 한다.
- 수익모델은 별도 intake 필드로 받지 않는다. 결제/구독 여부는 feature 선택과 결제 task에서만 다룬다.
- 도메인 기능은 intake/기획 브리프 이후 기능 카드로 확정하고, Build Issues 생성 시 기능별 반복 issue로 함께 생성한다.
- `PB-FEAT-003`은 issue 생성 task가 아니라 생성된 기능별 issue 목록을 검수하고 구현 scope를 잠그는 gate다.
- 기능 카드 확장은 고정 task catalog를 대체하지 않는다. 고정 task 전체 생성 후 영역별 추가 issue로 붙는다.
- CRUD 기본 task만으로 부족한 프로젝트 특화 기능은 기능 카드에 입력하고, 기능별 DATA/API/surface/QA issue로 분해한다.
- 개별 task 판정 select는 feature 선택으로 계산된 기본값 위에 얹는 수동 override다.
- `REUSE`/`N/A` issue는 완료된 판정 기록이다.
- `NEW`/`EXTEND` issue만 실행 대상이다.
- 실행 대상 issue는 Orchestrator 한 명에게 몰지 않고 backend/frontend/platform/AI/QA managed agent로 역할별 배정한다.
- 온라인 서비스의 auth UX는 product-builder-base 템플릿 기본값으로 둔다. 공개 사이트는 볼 수 있고, 저장/구매/이용 시작/내 공간 진입 같은 보호 액션에서 로그인 모달을 띄운다.
- Neon/Vercel task는 project id, env mapping, migration log, health check, Preview/Production URL 같은 실제 증거를 남겨야 한다.
- `PB-LAUNCH-SMOKE-001`이 최종 배포 URL에서 공개 탐색, auth modal, 로그인, 보호 기능, 관리자 접근 제어를 확인하기 전에는 납품 완료로 보지 않는다.
- Neon/Vercel 이외 환경은 기본 온라인 서비스형 workflow에 섞지 않고 별도 porting workflow로 분리한다.
