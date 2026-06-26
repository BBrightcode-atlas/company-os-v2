# 화면정의서 작성 룰(Screen Definition Writing Rules)

이 문서는 화면정의서(Screen Definition)를 항상 같은 구조로 작성하기 위한 고정 기준 문서다.

## 1. 작성 원칙(Writing Principles)

1. 화면 1개는 화면정의서 1개로 작성한다.
2. 화면정의서는 화면에서 필요한 정보를 재정의하지 않고 선행 산출물을 참조한다.
3. 각 화면은 Product Builder base surface 기준으로 관리자용(Admin), 사용자용 사이트(Site), 사용자용 앱(App), 랜딩(Landing) 중 어디에 속하는지 적는다.
4. 스키마(Schema), API, 레이아웃(Layout)은 각 정의서의 코드 또는 이름을 참조한다.
5. 화면 상태(Screen State)는 최소한 기본(Default), 빈 상태(Empty), 로딩(Loading), 오류(Error), 권한 오류(Permission)를 검토한다.
6. 사용자 액션(User Action)은 트리거(Trigger), 결과(Result), API 참조(API Reference), 이동 대상(Target Screen)을 함께 적는다.
7. `data-testid`가 필요한 경우 화면명과 액션 목적에서 파생해 사람이 읽을 수 있게 작성한다.
8. 미확정 사항은 추론하지 않고 `미확정(Undecided)` 섹션에 남긴다.

## 2. 화면 문서 구조(Screen Document Structure)

| 섹션(Section) | 필수(Required) | 설명(Description) |
| --- | --- | --- |
| 기본 정보(Basic Information) | Yes | 화면명, 목적, route, 접근 권한 |
| 대상 surface(Target Surface) | Yes | admin/site/app/landing 중 구현 표면 |
| 참조 계약(Referenced Contracts) | Yes | 관련 스키마, API, 레이아웃 |
| 화면 구성(Screen Composition) | Yes | 영역, 컴포넌트, 표시 조건 |
| 화면 필드(Screen Fields) | Yes | 입력/표시 필드와 검증 |
| 화면 상태(Screen States) | Yes | default/empty/loading/error/permission |
| 사용자 액션(User Actions) | Yes | 버튼, 링크, 탭, 모달, 이동 |
| 화면 QA 인수 기준(Screen QA Acceptance Criteria) | Yes | QA가 화면 단위로 렌더링, 권한, 입력 검증, 상태 전환, API 연동, 오류 처리를 확인할 조건 |
| 미확정(Undecided) | Optional | 자료 부족 또는 결정 필요 항목 |

## 3. 금지 사항(Do Not)

- 화면정의서에서 API request/response를 새로 정의하지 않는다.
- 화면정의서에서 DB 필드를 새로 추가하지 않는다.
- 와이어프레임 디자인 취향을 화면정의서에 과도하게 적지 않는다.
- 기능 코드를 새로 만들지 않는다.
- 관리자용 화면과 사용자용(site/app) 화면을 같은 화면정의서 섹션에 섞지 않는다.
