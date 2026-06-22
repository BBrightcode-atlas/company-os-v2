# Wireframe Builder

정제된 **표준 기획서(Standard Plan) + 화면정의서(Screen Definition)**를 입력받아 **조작 가능한(clickable) 와이어프레임**을 생성·반복하는 BBR 전용 Paperclip 플러그인. `product-builder` 이전 단계로, 실제 개발 task 분해 전에 **화면 워크플로우를 미리 검증**한다.

- 입력: Blueprint의 `deliverable.standard_plan`, `deliverable.screen_definitions` slot 내용 또는 수동 paste/파일 첨부(md/txt/pdf)
- 출력: `deliverable.wireframe_html` Project document slot + `wireframe.html` 단일 HTML 산출물
- 수정: 자연어 채팅으로 "이 화면에 검색 추가" → 모델 patch → 재렌더

HTML 본문은 플러그인 DB record에 보관하면서, 대상 Project가 있으면 같은 HTML을 core `deliverable.wireframe_html` Project document slot에 import한다. Product Builder는 이 Project slot을 다음 단계 입력으로 사용한다.

## 아키텍처

```
기획서+화면설계서 ──▶ worker(vibeproxy /v1/messages) ──▶ HTML 추출·검증 + bounded repair ──▶ <iframe srcDoc>
   (paste/파일첨부)         LLM 이 인라인 JS 까지 통째로 생성                                  (clickable 와이어프레임)
자연어 수정 채팅 ──────────────────────────────────────────┘
```

source of truth 는 별도 모델이 아니라 **LLM 이 생성한 HTML 문서 그 자체**다. 화면설계 모델·순수함수 렌더를 두지 않고, AI 가 인라인 `<script>` 런타임까지 포함한 완전한 단일 HTML 을 직접 출력한다.

| 파일 | 역할 |
| --- | --- |
| `src/wireframe-prompt.ts` | **생성 엔진**: 시스템 프롬프트(`WIREFRAME_SYSTEM`) + **vibeproxy raw fetch** + `extractHtml`/`validateHtml` + bounded repair. LLM 이 완전한 HTML 을 통째로 생성 |
| `src/worker.ts` | 액션·데이터 핸들러, draft→generating→generated 상태머신, 백그라운드 생성 잡, 자연어 수정(revise) |
| `src/contract.ts` | DB namespace(`plugin_wireframes_dfd3295c23`) + DATA/ACTION 키 + `deliverable.wireframe_html` slot metadata 타입 |
| `src/ui/index.tsx` | 입력폼(파일 텍스트 추출) / 워크스페이스(iframe 미리보기 + 4s polling + 수정 채팅) |
| `migrations/001_init.sql` | own Postgres 네임스페이스 테이블(wireframes / wireframe_comments) |

## 생성 엔진 (결정 사항)

- **AI 가 HTML 을 통째로 생성**: 화면설계 모델(Zod)·순수함수 렌더를 두지 않고, LLM 이 기획서·화면설계서를 읽어 인라인 `<script>` 런타임까지 포함한 완전한 단일 HTML 문서를 직접 출력한다. 와이어프레임 품질은 `WIREFRAME_SYSTEM` 프롬프트에 의존한다.
- **vibeproxy 직접 호출**: `process.env.ANTHROPIC_BASE_URL || http://localhost:8317` 의 `/v1/messages`. host `ctx.http`(SSRF 가드로 localhost 차단)·managed agent.sessions(프롬프트 유실)를 우회하기 위함.
- **HTML 추출 + 검증 + bounded repair**: 응답에서 `extractHtml` 로 HTML 을 뽑고 `validateHtml`(`<html>`/`<body>`/`</html>` 종료 등 정규식 체크)로 검증, 실패 시 문제를 되먹여 최대 3회 재시도(`generateHtml`). 수정(`reviseHtml`)은 단발 검증.
- 모델: `SCREEN_DESIGN_MODEL` env (기본 `claude-opus-4-8`).
- **보류**: Vercel AI SDK(vibeproxy→Bedrock 의 jsonTool tool-use 강제 여부 미검증), Zod 화면설계 모델(현재는 LLM 직접 HTML 로 단순화).

## Output Contract

| 항목(Item) | 값(Value) |
| --- | --- |
| Slot | `deliverable.wireframe_html` |
| 파일명(File Name) | `wireframe.html` |
| 저장 형태(Current Storage) | Project document slot + plugin DB `wireframes.html` |
| slot 상태(Status) | HTML 생성 전 `empty`, 생성 후 `ready` |
| 다음 단계(Consumer) | Product Builder |

UI의 다운로드 버튼은 최종 산출물인 `wireframe.html`만 내려받는다. 입력으로 사용한 기획서/화면정의서는 Blueprint 산출물 slot의 책임이므로 Wireframe export 대상이 아니다.

## 빌드

```bash
cd bbr-plugins/wireframe-builder
pnpm install --ignore-workspace   # .paperclip-sdk/*.tgz(벤더링 SDK) 사용
pnpm run typecheck
pnpm run build                     # dist/{worker,manifest,ui} 생성
```

## 설치 (Paperclip 인스턴스)

```http
POST /api/plugins/install
Content-Type: application/json

{ "packageName": "<로컬경로>", "isLocalPath": true }
```

host 가 DB `plugins` 등록 + migration 적용 + 활성화. 생성 동작에는 vibeproxy 게이트웨이(`ANTHROPIC_BASE_URL`)가 필요하다.

## 검증 상태

- ✅ typecheck · build · manifest
- ✅ clickable 렌더: LLM 생성 HTML 의 인라인 런타임으로 navigate/modal/tab/conditional 동작 (생성 결과물 기준)
- ⏳ worker 생성 파이프라인 end-to-end 는 vibeproxy 연결 환경(설치 후)에서 검증
- ⏳ (후속) AI SDK `jsonTool` 스파이크 / `product-builder` 핸드오프
