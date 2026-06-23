# Builder

BBR 전용 Paperclip 플러그인. 기존 `cos-blueprint`, `wireframe-builder`, `product-builder`를 하나의 설치/배포 단위로 통합한다.

## 메뉴

Paperclip 좌측 메뉴에는 `Builder` 섹션 아래에 다음 순서로 노출된다.

1. Blueprint
2. Wireframe
3. Project Builder

## 실행 흐름

1. Blueprint가 프로젝트 자료를 Project document slot에 등록하고 표준 산출물을 만든다.
2. Wireframe이 `deliverable.screen_definitions`를 읽어 HTML 와이어프레임을 만들고 `deliverable.wireframe_html`에 남긴다.
3. Project Builder가 Blueprint/Wireframe slot을 읽어 BuildPlan, Task 목록, Issue Graph를 만든다.

## 설치

```sh
cd bbr-plugins/builder
pnpm install
pnpm build
paperclipai plugin install /absolute/path/to/company-os-v2/bbr-plugins/builder
```

기존 분리 패키지인 `cos-blueprint`, `wireframe-builder`, `product-builder`와 동시에 설치된 마이그레이션 상태에서는 호스트 UI가 동일 route/sidebar를 Builder 기준으로 우선 표시한다. 운영 기준 설치 대상은 Builder 하나로 제한한다.
