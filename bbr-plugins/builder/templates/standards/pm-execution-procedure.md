# PM 업무 실행 절차(PM Execution Procedure)

이 문서는 프로젝트마다 바뀌지 않는 고정 기준 문서다. PM 에이전트(PM Agent)는 이 순서에 따라 산출물을 만들고, 프로젝트별 내용은 별도 산출물에만 기록한다.

## 1. 기본 원칙(Basic Principles)

- 입력 자료(Input Source)는 Paperclip 프로젝트(Project)의 source slot에서 확인한다.
- 산출물(Output)은 고정 목록 전체를 생성한다.
- 내용이 없는 산출물은 삭제하지 않고 `해당 없음(N/A)`과 사유를 남긴다.
- 자료에 없는 내용을 추론으로 채우지 않는다. 필요한 경우 `미확정(Undecided)` 또는 `Missing Input`으로 남긴다.
- 다음 단계는 이전 단계 산출물이 `ready`, `approved`, 또는 타당한 `n/a` 상태일 때만 시작한다.
- Feature, Plugin, UX Flow 단위 설계 산출물에는 Flowchart와 Sequence Diagram을 모두 포함한다. 가능한 경우 Mermaid `flowchart TD`와 `sequenceDiagram`을 기본 형식으로 쓴다.
- 범위, 흐름, actor, 상태, API, 화면 전환, 예외 처리가 바뀌면 관련 Flowchart와 Sequence Diagram도 같은 변경에서 최신 상태로 갱신한다.

## 2. 순차 게이트(Sequential Gates)

| 단계(Step) | 업무(Task) | 입력(Input) | 출력(Output) | 종료 기준(Exit Criteria) | 담당(Owner) |
| --- | --- | --- | --- | --- | --- |
| 1 | 입력 문서 확인(Source Document Check) | Project source slots | 분석 가능/부족/n/a 판단 | 프로젝트 목적, 사용자, 핵심 기능, 화면 범위가 확인됨 | PM Agent |
| 2 | PRD 생성(Product Requirements Document) | Source slots | PRD | 범위와 성공 기준이 검증 가능함 | PM Agent |
| 3 | 기능 정의서 생성(Feature Definition) | PRD | 기능 정의서 목록, 기능별 기능 정의서 | 기능명과 Project slot 문서 참조로 추적 가능함 | PM Agent |
| 4 | 계약 문서 생성(Contract Definition) | 기능 정의서 | 스키마/API/인터페이스/레이아웃 정의서 | 개발/QA가 참조 가능한 계약이 있음 | Contract Agent |
| 5 | 화면정의서 생성(Screen Definition) | PRD, 기능 정의서, 계약 문서 | 화면별 화면정의서 | 주요 화면, 상태, 액션, API 참조가 있음 | Screen Agent |
| 6 | 산출물 검토(Deliverable Review) | 전체 Blueprint 산출물 | ready/approved/n/a 상태 | 다음 플러그인이 읽을 수 있음 | Operator, PM Agent |

## 3. 완료 기준(Done Criteria)

- 모든 고정 산출물 slot이 존재한다.
- 모든 산출물은 `ready`, `approved`, 또는 `n/a` 상태다.
- `n/a` 산출물은 본문에 사유가 있다.
- 기능 정의서는 기능 코드 없이 기능명(Feature Name)과 Project slot 문서 참조(Project Slot Document Reference)로만 추적된다.
- 기능 정의서는 Flowchart와 Sequence Diagram이 존재하고 현재 기능 범위/흐름/actor/API를 반영한다.
- 화면정의서는 API와 스키마를 재정의하지 않고 참조만 한다.
- 화면정의서는 UX Flow Flowchart와 Sequence Diagram이 존재하고 현재 화면 상태/액션/API handoff를 반영한다.
- 산출물 리뷰 시 두 diagram의 존재 여부와 최신성을 checklist로 확인한다.
