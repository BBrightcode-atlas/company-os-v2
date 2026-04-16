---
title: Agent Org Migration — 2026-04-16
summary: Builder-centric cell 구조 전환 마이그레이션 실행 증거 (before/after 스냅샷 + 실행 로그)
---

# Agent Org Migration (2026-04-16)

기존 18명 구조 (7 리더 + 11 서브) → Builder-centric cell 10명 구조 전환 마이그레이션 실행 증거.

- PR: BBrightcode-atlas/company-os-v2#3
- 스크립트: `scripts/migrate-agent-org.ts`
- 대상 DB: Mac Studio prod (`mac-studio:55433/cos`, company `7ff1f5d1-d3cc-4411-a77c-442b50d50e57`)
- 실행 시각: 2026-04-16 17:46 KST

## 실행 결과 요약

| Phase | 작업 | 건수 |
|---|---|---|
| 1 | 유지 에이전트 title/capabilities 업데이트 | 10 |
| 2 | Flotter 서브팀 lead 해제 (ENG3/PLT3/GRW/QA) | 4 |
| 3 | 은퇴 에이전트 terminate (soft delete) | 8 |
| 4 | 빈 팀 soft delete (AIP/CORE/PX) | 3 |

- 활성 에이전트: 27 → 19 (8 terminated)
- 활성 팀: 11 → 8 (3 soft deleted, status='deleted')

## 파일

| 파일 | 내용 |
|---|---|
| `dry-run.log` | `--apply` 전 dry-run 출력 (예상 동작) |
| `apply.log` | 실제 적용 출력 |
| `before-agents.json` / `before-teams.json` | 실행 전 API 스냅샷 |
| `after-agents.json` / `after-teams.json` | 실행 후 API 스냅샷 |
| `psql-retired-check.log` | 은퇴 8명 DB 직접 조회 (terminated 확인) |
| `psql-deleted-teams.log` | 빈 팀 DB 조회 (status='deleted' 확인) |
| `psql-kept-agents.log` | 유지 10명 DB 조회 (신 title 확인) |

## 롤백 가능성

모든 변경은 **soft delete**. hard delete 없음. 필요 시 DB `UPDATE agents SET status='idle' WHERE ...` 로 복구 가능.

단, terminate 된 claude_local 에이전트 4명 (Cyrus/Felix/LunaLead/Iris) 의 leader CLI PM2 프로세스는 자동 종료됨 (`heartbeat.cancelActiveForAgent`). 복구 시 CLI 재기동 필요.

## 참조

- 조직 스펙: `docs/cos-v2/agent-roles.md`
- 마이그레이션 스크립트: `scripts/migrate-agent-org.ts`
