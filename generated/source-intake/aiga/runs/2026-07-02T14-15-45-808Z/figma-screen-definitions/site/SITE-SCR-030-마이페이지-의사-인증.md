# Figma 화면정의서(Figma Screen Definition) - SITE-SCR-030 마이페이지-의사 인증

이 문서는 Figma 원본 화면 1개 또는 같은 화면의 상태/모달 변형 묶음을 구현 가능한 화면 기준선으로 해석한다. 이후 feature 중심 디자인/개발 화면정의서와 구분되는 Figma-first 산출물이다.

## 1. 기본 정보(Basic Information)

| 항목(Item) | 내용(Description) |
| --- | --- |
| 프로젝트(Project) | Aiga |
| 화면명(Screen Name) | 마이페이지-의사 인증 |
| 화면 코드(Screen Code) | SITE-SCR-030 |
| 대상 surface(Target Surface) | site |
| 화면 설명(Screen Description) | 의사 본인 인증 플로우 화면군. Figma node 4390:13947. |
| 경로(Route) | /doctor-verification |
| 인증/권한(Auth/Permission) | guest_or_member |
| 레이아웃(Layout) | Figma mobile site frame with AIGA design system tokens |
| Primary test-id | site-scr-030 |

## 2. Figma 구현 기준(Figma Implementation Baseline)

Figma는 이 문서의 visual/layout source of truth다. 이 문서는 Figma MCP로 전체 캔버스와 대표 노드를 직접 확인한 결과를 기준으로 작성한다. Figma에 없는 값은 추정하지 않는다.

| 항목(Item) | 내용(Description) |
| --- | --- |
| Figma 파일 URL | https://www.figma.com/design/4F1yav1LVfMJFluyIQq7pr/AIGA-Official-External?node-id=4390-13947&t=OWrLX26n9Z69PyHu-4 |
| Figma file key | 4F1yav1LVfMJFluyIQq7pr |
| Figma node id | 4390-13947 / 4390:13947 |
| Frame/Page name | 마이페이지-의사 인증 |
| Viewport/Frame size | 공급 노드는 mobile 375px frame 계열이다. 대표 확인: 의사 본인 인증#1 4390:13333 original 375x812; observed step-based identity verification screen. |
| Breakpoint/Responsive 기준 | 모바일 375px 기준, 페이지 메타데이터에서 일부 PC/480px 확장 프레임도 확인됨. |
| 접근/Export 상태 | Figma MCP metadata와 screenshot으로 직접 확인. 세부 구현 전에는 동일 node에서 asset export를 다시 확인한다. |

### 2.1 Layout / Spacing

| 기준(Item) | Figma 값(Value) | 구현 메모(Implementation Note) |
| --- | --- | --- |
| Grid/Container | mobile 375px frame, section/card/list/form 구조 | step-based identity verification and license submission |
| Spacing/Padding | Figma frame과 component 계층에서 확인 | 구현 시 Figma export 기준으로 spacing token화한다. |
| Constraints | header, bottom GNB, fixed input/action bar, carousel overflow가 화면군별로 확인됨 | 스크롤 높이와 fixed 영역 충돌을 QA한다. |

### 2.2 Typography / Color / Asset Tokens

| 구분(Type) | Figma 값(Value) | 구현 토큰/메모(Token or Note) |
| --- | --- | --- |
| Typography | Pretendard, font weights Regular 400 / Medium 500 / Bold 700; visible scale includes 14, 15, 16, 17, 18, 20, 24, 32, 40, 50, 66. | Pretendard 기반 type token 사용 |
| Color | Primary blue scale primary-350 #659AFF, primary-400 #4E87F4, primary-500 #3774E8; secondary-400 #00CA80; gray-25 #FCFCFC, gray-50 #F6F6F6, gray-700 #333D4B; accent-500 #DC2525; info-50 #FFF9EA. | primary/secondary/gray/accent/info semantic token으로 매핑 |
| Icon/Image Asset | logo-aiga, GNB, header, card image, avatar, certification badge, search icon 등 | Figma asset export와 component instance 이름을 기준으로 연결 |

### 2.3 Component Mapping

| Figma component/layer | 구현 컴포넌트 | 상태/Variant | 메모 |
| --- | --- | --- | --- |
| step-based identity verification and license submission | site feature component | Default/variant by node title | Figma MCP screenshot에서 확인한 구조 |
| Header/GNB/CTA | site shell/navigation/action controls | 권한/상태별 variant | bottom GNB 또는 fixed input/action bar 여부 확인 |

## 3. 참조 계약(Referenced Contracts)

| 구분(Type) | 참조(Reference) |
| --- | --- |
| 스키마(Schema) | SCH-005, SCH-001, SCH-003, SCH-013 |
| API | API-013 POST /api/identity-verifications/kcb/sessions - KCB 본인확인 세션 생성<br>API-014 GET /api/identity-verifications/kcb/sessions/{sessionId} - KCB 본인확인 세션 조회<br>API-015 POST /api/identity-verifications/kcb/sessions/{sessionId}/link - KCB 본인확인 세션 사용자 연결<br>API-016 POST /api/doctor-verifications/license - 의사 면허 검증 제출<br>API-017 GET /api/doctor-verifications/me - 내 의사 인증 상태 조회 |
| 기능 정의서(Feature Definition) | FEA-008 의사 인증 플로우와 면허번호 검증<br>FEA-009 의사 인증 표시와 실명 전환<br>FEA-010 의사 프로필, 명의 찾기, 정보 수정 요청<br>FEA-022 개인정보, 접근성, 분석 이벤트 |

## 4. 화면 구성(Screen Composition)

| 영역(Area) | 컴포넌트(Component) | 표시 조건(Display Rule) |
| --- | --- | --- |
| Figma Frame | 마이페이지-의사 인증 | supplied node 4390:13947 |
| Primary Content | step-based identity verification and license submission | Figma screenshot에서 확인된 핵심 화면 구조 |
| State/Overlay | empty/error/permission/modal variant | 동일 화면군 Figma node 또는 feature 화면정의 상태와 연결 |
| Navigation/Action | header, GNB, CTA, list item, submit action | 권한과 API 상태에 따라 활성/비활성 |

## 5. 화면 필드(Screen Fields)

| 필드(Field) | 타입(Type) | 필수(Required) | 검증(Validation) | 비고(Notes) |
| --- | --- | --- | --- | --- |
| Figma visible labels | display/input | Conditional | Figma text layer와 기능 계약 기준 | 정확 문구는 해당 node 기준 |
| Interactive controls | button/link/input/select | Conditional | 권한/입력 검증/API 상태 기준 | data-testid는 화면 코드 기반 |
| API-bound content | display list/detail | Conditional | API-013, API-014, API-015, API-016, API-017 | 선행 API 계약 참조 |

## 6. 화면 상태(Screen States)

| 상태(State) | 정의(Definition) | Figma node | 표시 조건(Display Rule) |
| --- | --- | --- | --- |
| Default | 해당 Figma 프레임의 기본 표시 상태를 기준으로 구현한다. | 4390:13947 | 기본 진입 또는 조회 성공 |
| Empty | 결과 없음 또는 초기값 없음 상태는 동일 화면군의 empty node를 우선 적용한다. | 동일 화면군 node 또는 feature 정의 | 결과 0건/초기값 없음 |
| Loading | API 호출 중 skeleton/spinner 또는 fixed action disabled 상태를 적용한다. | 공통 state | API 호출 중 |
| Error | 에러/한도 소진/검색결과 없음 node가 있으면 해당 node를 적용한다. | 동일 화면군 node 또는 공통 error | 실패/결과 없음/한도 소진 |
| Permission | 비회원 제한, 로그인 유도, 운영자 권한 차단은 권한 정책과 연결한다. | 동일 화면군 node 또는 공통 permission | 권한 부족/세션 만료 |

## 7. 사용자 액션(User Actions)

| 액션(Action) | test-id | 트리거(Trigger) | 동작 설명(Description) | API | 이동 화면(Target Screen) |
| --- | --- | --- | --- | --- | --- |
| 화면 진입 및 초기 조회 | site-scr-030-act-01 | route 진입 또는 모달 열기 | 권한과 초기 데이터를 확인하고 상태를 표시한다. | API-013 | 현재 화면/상태 유지 |
| 주요 액션 실행 | site-scr-030-act-02 | 주요 CTA, 목록 항목, 저장, 제출, 검색, 탭 선택 | 선행 API 계약 또는 클라이언트 상태 전환으로 결과를 반영한다. | API-014, API-015, API-016 | 현재 화면/상태 유지 |
| 상태 복구 또는 이동 | site-scr-030-act-03 | 재시도, 뒤로가기, 닫기, 상세 이동 | 오류/권한/empty 상태에서 복구하거나 대상 화면으로 이동한다. | N/A | 현재 화면/상태 유지 |

## 8. UX Flow Diagrams

### 8.1 Flowchart

~~~mermaid
flowchart TD
  Entry[마이페이지-의사 인증 Figma node 진입] --> Visual[Figma MCP screenshot/metadata 확인]
  Visual --> State{상태/변형 분기}
  State -->|Default| Action[주요 액션 실행]
  State -->|Empty/Error| Recovery[안내와 복구 액션]
  Action --> Target[대상 화면 또는 현재 상태 갱신]
~~~

### 8.2 Sequence Diagram

~~~mermaid
sequenceDiagram
  actor User as 사용자
  participant Screen as SITE-SCR-030 마이페이지-의사 인증
  participant Figma as Figma node 4390:13947
  participant API as API-013
  User->>Screen: route 진입 또는 모달 열기
  Screen->>Figma: visual/layout 기준 참조
  Screen->>API: 필요한 경우 선행 API 계약 호출
  API-->>Screen: 상태 반환
  Screen-->>User: Figma 기준 UI 상태 표시
~~~

## 9. 화면 QA 인수 기준(Screen QA Acceptance Criteria)

| 검수 항목(QA Case) | 사전 조건(Precondition) | 사용자 행동(User Action) | 기대 결과(Expected Result) | 확인 데이터/상태(Data or State) | test-id | 자동화 후보(Automation Candidate) |
| --- | --- | --- | --- | --- | --- | --- |
| 초기 진입 시 default/empty/loading/error/permission 상태가 구분된다. | 권한/데이터 fixture 준비 | 화면 진입 | 초기 진입 시 default/empty/loading/error/permission 상태가 구분된다. | state/action/API mock | site-scr-030-ac-01 | Playwright candidate |
| 주요 액션 실행 시 중복 제출이 방지되고 성공/실패 결과가 화면에 반영된다. | 권한/데이터 fixture 준비 | 주요 액션 실행 | 주요 액션 실행 시 중복 제출이 방지되고 성공/실패 결과가 화면에 반영된다. | state/action/API mock | site-scr-030-ac-02 | Playwright candidate |
| 권한이 부족한 사용자는 로그인 유도 또는 운영자 권한 차단 상태를 본다. | 권한/데이터 fixture 준비 | 권한 필요 액션 실행 | 권한이 부족한 사용자는 로그인 유도 또는 운영자 권한 차단 상태를 본다. | state/action/API mock | site-scr-030-ac-03 | Playwright candidate |

## 10. 미확정(Undecided)

| 항목(Item) | 필요한 결정(Decision Needed) | 담당(Owner) |
| --- | --- | --- |
| Figma asset export | 구현 직전 해당 node에서 이미지, icon, component asset을 export하고 파일명을 확정 | Design/Frontend |

## 11. 해당 없음(N/A)

| 항목(Item) | 사유(Reason) |
| --- | --- |
| Admin surface | 공급된 Figma node는 site/mobile 화면군이며 admin 화면은 feature-centered 화면정의서에서 다룬다. |
