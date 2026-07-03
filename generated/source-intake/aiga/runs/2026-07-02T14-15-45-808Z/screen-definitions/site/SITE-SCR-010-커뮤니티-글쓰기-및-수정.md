# 화면정의서(Screen Definition) - SITE-SCR-010 커뮤니티 글쓰기 및 수정

이 문서는 화면 1개를 와이어프레임, 프론트엔드 구현, QA가 참조할 수 있게 정의한다. API 호출 형식과 데이터 저장 구조는 선행 산출물을 참조하고 이 문서에서 새로 정의하지 않는다.

## 1. 기본 정보(Basic Information)

| 항목(Item) | 내용(Description) |
| --- | --- |
| 프로젝트(Project) | Aiga |
| 화면명(Screen Name) | 커뮤니티 글쓰기 및 수정 |
| 화면 코드(Screen Code) | SITE-SCR-010 |
| 대상 surface(Target Surface) | site |
| 화면 설명(Screen Description) | 질환명, 진료과, 제목, 본문, 이미지, 방문 인증 옵션, 자동저장을 처리한다. |
| 경로(Route) | /community/posts/new |
| 인증/권한(Auth/Permission) | member |
| 레이아웃(Layout) | apps/site mobile shell + bottom GNB where applicable |
| Primary test-id | site-scr-010 |

## 2. 참조 계약(Referenced Contracts)

| 구분(Type) | 참조(Reference) |
| --- | --- |
| 스키마(Schema) | SCH-009, SCH-010, SCH-016, SCH-001, SCH-006, SCH-014, SCH-018, SCH-020, SCH-024, SCH-025, SCH-022 |
| API | API-018 POST /api/medical-visit-verifications - 병원 방문 인증 제출<br>API-019 GET /api/medical-visit-verifications/{verificationId} - 병원 방문 인증 상태 조회<br>API-023 POST /api/community/posts - 커뮤니티 게시글 작성<br>API-024 PUT /api/community/posts/{postId} - 커뮤니티 게시글 수정<br>API-048 GET /api/operational-policies/effective - 적용 중 운영 정책 조회<br>API-079 POST /api/files/upload-url - 파일 업로드 URL 생성<br>API-080 POST /api/files/confirm - 파일 업로드 확정<br>API-081 GET /api/files/{fileId}/signed-url - 파일 signed URL 조회<br>API-086 POST /api/analytics/events - 분석 이벤트 수집 |
| 기능 정의서(Feature Definition) | FEA-001 회원 등급 및 권한 정책<br>FEA-004 커뮤니티 피드, 글쓰기, 상세, 임시저장<br>FEA-007 병원 방문 인증과 증빙 뱃지<br>FEA-009 의사 인증 표시와 실명 전환<br>FEA-015 콘텐츠 안전 자동 차단<br>FEA-021 운영 정책 설정<br>FEA-022 개인정보, 접근성, 분석 이벤트 |
| Product Builder Base 참고 | apps/site auth modal, site header, API client, gated CTA, community/comment patterns |

## 3. 화면 구성(Screen Composition)

| 영역(Area) | 컴포넌트(Component) | 표시 조건(Display Rule) |
| --- | --- | --- |
| Shell/Header | Site header or mobile appbar, bottom GNB | surface 공통 레이아웃 |
| Main Content | 커뮤니티 글쓰기 및 수정 primary content | 권한 허용 및 조회 성공 시 |
| State Feedback | loading, empty, error, permission | API/권한/데이터 상태별 표시 |
| Action Area | CTA, menu, form controls, list item actions | 입력 검증과 권한 통과 시 활성화 |

## 4. 화면 필드(Screen Fields)

| 필드(Field) | 타입(Type) | 필수(Required) | 검증(Validation) | 비고(Notes) |
| --- | --- | --- | --- | --- |
| 검색/필터/탭 상태 | input/filter/display | Conditional | 기능별 길이/형식 정책은 feature/API 계약 참조 | 조회 조건 또는 탭 상태 |
| 목록/상세 데이터 | display | Conditional | API 성공 상태 기준 | card, table, detail, comment 구성 |
| 권한 안내 메시지 | display | Conditional | 회원 등급 및 운영자 권한 정책 참조 | LoginRequiredToast, permission banner, admin guard |
| 제출/저장 입력 | form/action | Conditional | 필수값, 중복 제출 방지, 서버 검증 오류 표시 | 폼이 있는 화면에 적용 |

## 5. 화면 상태(Screen States)

| 상태(State) | 정의(Definition) | 표시 조건(Display Rule) |
| --- | --- | --- |
| Default | 정상 데이터와 기본 액션을 표시한다. | 초기 조회 성공 또는 입력 가능한 상태 |
| Empty | 조회 결과가 없거나 아직 입력된 값이 없는 상태를 표시한다. | 목록/검색/탭 데이터가 0건 |
| Loading | 초기 조회, 저장, 업로드, 인증, 검색 중 중복 액션을 막는다. | API 또는 외부 연동 대기 중 |
| Error | 검증 실패, 네트워크 오류, 서버 오류를 복구 가능한 메시지로 표시한다. | 4xx/5xx, 외부 연동 실패, 파일 처리 실패 |
| Permission | 권한에 맞지 않는 액션을 차단하고 안내한다. | 세션/회원등급/운영자 권한 불일치 |

## 6. 사용자 액션(User Actions)

| 액션(Action) | test-id | 트리거(Trigger) | 동작 설명(Description) | API | 이동 화면(Target Screen) |
| --- | --- | --- | --- | --- | --- |
| 화면 진입 및 초기 조회 | site-scr-010-act-01 | route 진입 또는 모달 열기 | 권한과 초기 데이터를 확인하고 상태를 표시한다. | API-018 | 현재 화면/상태 유지 |
| 주요 액션 실행 | site-scr-010-act-02 | 주요 CTA, 목록 항목, 저장, 제출, 검색, 탭 선택 | 선행 API 계약 또는 클라이언트 상태 전환으로 결과를 반영한다. | API-019, API-023, API-024 | SITE-SCR-011 |
| 상태 복구 또는 이동 | site-scr-010-act-03 | 재시도, 뒤로가기, 닫기, 상세 이동 | 오류/권한/empty 상태에서 복구하거나 대상 화면으로 이동한다. | N/A | SITE-SCR-011 |

## 7. UX Flow Diagrams

화면 단위 UX Flow는 Flowchart와 Sequence Diagram을 필수로 남긴다. 화면 순서, 상태 전환, actor, API handoff, 오류/권한/empty 흐름이 바뀌면 두 diagram도 같은 변경에서 최신화한다.

### 7.1 Flowchart

~~~mermaid
flowchart TD
  Entry[/community/posts/new 진입] --> Auth{권한/세션 확인}
  Auth -->|허용| Load[초기 데이터 로드]
  Auth -->|차단| Permission[Permission 상태]
  Load -->|성공| Default[Default 상태]
  Load -->|0건| Empty[Empty 상태]
  Load -->|실패| Error[Error 상태]
  Default --> Action[주요 액션 실행]
  Action --> Result[결과 반영 또는 이동]
~~~

### 7.2 Sequence Diagram

~~~mermaid
sequenceDiagram
  actor User as 사용자
  participant Screen as SITE-SCR-010 커뮤니티 글쓰기 및 수정
  participant API as API-018
  User->>Screen: route 진입 또는 모달 열기
  Screen->>API: 선행 API 계약 호출
  API-->>Screen: 성공 또는 실패 상태
  Screen-->>User: 화면 상태와 액션 결과 표시
~~~

### 7.3 Diagram Checklist

- Flowchart가 현재 화면 진입, 상태 전환, 주요 액션, 오류/권한/empty 흐름을 반영한다.
- Sequence Diagram이 현재 사용자, 화면, API 또는 외부 시스템 상호작용을 반영한다.
- 문서의 사용자 액션, 화면 상태, QA Cases와 두 diagram 사이에 오래된 단계나 이름이 남아 있지 않다.

## 8. 화면 QA 인수 기준(Screen QA Acceptance Criteria)

이 섹션은 이 화면이 구현 완료로 인정될 수 있는지 QA가 검수하는 기준이다.

### 8.1 QA 범위(QA Scope)

| 검수 영역(QA Area) | 확인 목적(Purpose) | 필수 여부(Required) |
| --- | --- | --- |
| 화면 진입(Screen Entry) | route, 접근 권한, 초기 렌더링 확인 | Yes |
| 화면 상태(Screen States) | default/empty/loading/error/permission 상태 구분 확인 | Yes |
| 사용자 액션(User Actions) | 버튼, 링크, 탭, 모달, 제출 동작 확인 | Yes |
| 입력 검증(Input Validation) | 필수값, 형식, 길이, 중복 검증 확인 | Conditional |
| API 연동(API Integration) | 성공/실패/로딩 상태 반영 확인 | Conditional |
| 이동/전환(Navigation/Transition) | 대상 화면, 모달, 탭, 뒤로가기 흐름 확인 | Conditional |
| Diagram 최신성(Diagram Freshness) | Flowchart와 Sequence Diagram 일치 확인 | Yes |

### 8.2 검수 케이스(QA Cases)

| 검수 항목(QA Case) | 사전 조건(Precondition) | 사용자 행동(User Action) | 기대 결과(Expected Result) | 확인 데이터/상태(Data or State) | test-id | 자동화 후보(Automation Candidate) |
| --- | --- | --- | --- | --- | --- | --- |
| 초기 진입 시 default/empty/loading/error/permission 상태가 구분된다. | 권한/데이터 fixture 준비 | 화면 진입 | 초기 진입 시 default/empty/loading/error/permission 상태가 구분된다. | state/action/API mock | site-scr-010-ac-01 | Playwright candidate |
| 주요 액션 실행 시 중복 제출이 방지되고 성공/실패 결과가 화면에 반영된다. | 권한/데이터 fixture 준비 | 주요 액션 실행 | 주요 액션 실행 시 중복 제출이 방지되고 성공/실패 결과가 화면에 반영된다. | state/action/API mock | site-scr-010-ac-02 | Playwright candidate |
| 권한이 부족한 사용자는 로그인 유도 또는 운영자 권한 차단 상태를 본다. | 권한/데이터 fixture 준비 | 권한 필요 액션 실행 | 권한이 부족한 사용자는 로그인 유도 또는 운영자 권한 차단 상태를 본다. | state/action/API mock | site-scr-010-ac-03 | Playwright candidate |

### 8.3 완료 판정(Pass Criteria)

- 주요 사용자 액션이 모두 검수 케이스에 연결되어 있다.
- 권한이 필요한 화면은 허용/차단 케이스가 모두 있다.
- API를 사용하는 화면은 성공/실패/로딩 상태가 모두 확인 가능하다.
- 입력 폼이 있는 화면은 필수값과 오류 메시지 기준이 있다.
- 와이어프레임과 구현 UI가 기대 결과를 벗어나지 않는다.
- Flowchart와 Sequence Diagram이 존재하고 현재 UX Flow와 일치한다.

## 9. 미확정(Undecided)

| 항목(Item) | 필요한 결정(Decision Needed) | 담당(Owner) |
| --- | --- | --- |
| 외부 provider 세부값 | vendor명, credential, 과금 단위는 구현 시 운영 설정에서 확정 | Product/Engineering |

## 10. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| Figma visual baseline | 이 문서는 feature-centered 화면정의서이며 Figma 기준선은 figma-screen-definition.md에서 별도 관리한다. |
