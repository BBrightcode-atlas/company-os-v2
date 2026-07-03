# Figma 화면정의서 작성 룰(Figma Screen Definition Writing Rules)

이 문서는 Figma 원본 화면을 구현 가능한 기준선으로 해석하기 위한 Figma-first 작성 기준이다. feature 중심 개발 화면정의서와 섞지 않는다.

## 1. 작성 원칙(Writing Principles)

1. Figma는 visual/layout/source-of-truth다.
2. Figma node 1개는 화면, 상태, 모달, 탭, 또는 컴포넌트 변형으로 반드시 매핑한다.
3. 같은 route의 default/error/empty/modal 변형은 한 화면 문서 안의 상태 또는 변형으로 묶을 수 있다.
4. 화면 문서는 Figma URL, file key, node id, frame name, viewport/frame size를 반드시 남긴다.
5. layout, spacing, typography, color, component, asset, responsive 기준은 Figma 또는 export에서 확인된 값만 쓴다.
6. Figma 접근 또는 export가 불가능하면 추정하지 않고 접근/자료 부족을 명시한다.
7. 스키마(Schema), API, 기능 정의서(Feature Definition)는 선행 산출물의 코드만 참조하고 재정의하지 않는다.
8. 이후 feature 중심 개발 화면정의서에서 재사용할 수 있게 `screen-coverage.json` 계열에 Figma node mapping을 남긴다.

## 2. 필수 산출물(Output Contract)

| 산출물 | 설명 |
| --- | --- |
| `figma-screen-definition.md` | Figma 기준 화면정의서 aggregate |
| `figma-screen-definitions/figma-screen-definition-index.md` | Figma 화면 인덱스 |
| `figma-screen-definitions/{surface}/{SURFACE}-SCR-###-{slug}.md` | 화면별 Figma 기준 문서 |
| `figma-screen-coverage.json` | Figma node, screen, feature, API mapping |
| `figma-screen-definition.validation.json` | 구조 검증 |
| `figma-screen-definition.review.json` | 리뷰 JSON |
| `figma-screen-definition-review.md` | 리뷰 문서 |
| `figma-screen-definition-loop.md` | 리뷰/수정 loop 기록 |

## 3. 금지 사항(Do Not)

- Figma 기준 산출물을 feature 중심 구현 산출물인 `screen-definition.md`로 덮어쓰지 않는다.
- Figma에 없는 spacing, color, typography, asset 값을 추정하지 않는다.
- Figma 접근이 막힌 상태에서 "피그마대로 구현 가능"하다고 완료 처리하지 않는다.
- 화면정의서에서 API request/response나 DB 필드를 새로 정의하지 않는다.
- 설정에서 선택된 apps/admin, apps/site, apps/app, apps/landing 화면을 같은 화면 문서에 섞지 않는다.
