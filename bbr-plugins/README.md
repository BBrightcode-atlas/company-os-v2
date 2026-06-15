# BBR 커스텀 Paperclip 플러그인

비브라이트코드(BBR) 전용 Paperclip 플러그인. 모노레포 밖에서 개발하던 것을 버전관리 위해 여기 보관한다. 순정 upstream 코드(`packages/`, `server/`, `ui/`)와 분리된 커스텀 영역.

## 플러그인

| 디렉토리 | 설명 |
| --- | --- |
| `quote-issuer/` | 견적서 발행 — 회사 표준 엑셀 견적서 HTML 생성, AI 리스크분석·가격산출, 댓글 보완 (BBR 전용) |
| `contract-issuer/` | 계약서 발행 — 표준 도급계약서 AI 작성(빈칸 채움), 법인직인, 댓글 보완 (BBR 전용) |
| `knowledge-base/` | 지식베이스(LLM Wiki) — 소스를 AI 가 위키로 통합, `[[링크]]`·백링크·그래프뷰, 플랫폼 에이전트 `wiki:*` 도구. **범용**(회사 게이트 없음) |
| `product-builder/` | Product Builder — 반복 제품/서비스 제작 blueprint를 Paperclip issue graph로 생성, 재사용 feature 선택/기능 카드/구현 task 분리 |

견적/계약은 **BBR 회사 전용**(플러그인 레벨 게이트), 지식베이스는 **범용**. Product Builder는 BBR 제작 표준 워크플로우 관리용. 분석/생성은 vibeproxy(`localhost:8317`) 직접 호출.

## 빌드

```bash
cd quote-issuer   # 또는 contract-issuer
pnpm install      # .paperclip-sdk/*.tgz(벤더링 SDK 스냅샷) 사용
node ./esbuild.config.mjs   # dist/{worker,manifest,ui} 생성
node_modules/.bin/tsc --noEmit   # 타입체크
```

## 설치 (Paperclip 인스턴스)

`dist/` + `migrations/` + `package.json` 을 대상 머신에 두고:

```
POST /api/plugins/install  { "packageName": "<로컬경로>", "isLocalPath": true }
```

(instance admin 권한.) host 가 DB `plugins` 등록 + migration 적용 + 활성화. 이후 갱신은 `dist/` rsync + 서버 재시작.

자세한 함정·레시피는 메모리 `project_quote_plugin` / `project_contract_plugin` / `reference_paperclip_plugin_host_gotchas` 참고.
