# COS v2 — Paperclip Fork

이 repo는 Paperclip(paperclipai/paperclip)을 fork한 COS v2.
BBrightCode의 AI 에이전트 회사 운영 시스템.

## 언어

**항상 한국어로 응답하세요.** 코드, 기술 용어, 변수명은 원문 유지하되,
설명, 대화, 보고, 커밋 메시지, 댓글은 모두 한국어로 작성합니다.

## 필수 읽기

**작업 전 반드시 읽을 것:**
- `docs/cos-v2/CONTEXT.md` — 전체 컨텍스트, 모든 결정사항, 주의사항

## 핵심 원칙

1. **Paperclip 기존 코드/UI에 추가하는 방식** — 재구현 아님
2. **기존 사이드바에 Teams 메뉴 삽입** — 새 사이드바 만들지 않음
3. **issues.status text 유지** — FK 전환 않음, API 검증만
4. **워크플로우 상태에 immutable slug** — rename-safe
5. **DB는 Embedded PG** — Neon 불필요
6. **리더 에이전트(CLI) + 서브 에이전트(CLI 없음, Agent tool spawn)**

## 구조

```
이 repo (company-os-v2) = Paperclip fork + COS 확장
├── server/        — Express API (기존 Paperclip + 팀/워크플로우 API 추가)
├── ui/            — React+Vite (기존 Paperclip UI + 팀 사이드바/설정 추가)
├── packages/db/   — Drizzle 스키마 (기존 + teams, team_members, team_workflow_statuses 추가)
├── docs/cos-v2/   — COS v2 설계/계획/진행 문서
└── ...            — 나머지 Paperclip 그대로
```

## 스펙/계획 참조

| 문서 | 위치 |
|------|------|
| 전체 컨텍스트 | `docs/cos-v2/CONTEXT.md` |
| 설계 스펙 | `docs/cos-v2/design-spec.md` |
| Paperclip 분석 | `docs/cos-v2/paperclip-analysis.md` |
| Phase 1 분해 | `docs/cos-v2/phase1-breakdown.md` |
| 진행 상태 | `docs/cos-v2/progress.md` |

## upstream 동기화

```bash
git fetch upstream
git merge upstream/master  # 충돌 시 수동 해결
```
