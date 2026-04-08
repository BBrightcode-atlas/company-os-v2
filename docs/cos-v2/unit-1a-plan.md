# Unit 1a: Fork + 클린 환경 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paperclip을 company-os-v2 repo로 fork하고, Embedded PG로 클린 상태에서 서버+UI 정상 동작 확인.

**Architecture:** Paperclip 코드베이스를 그대로 fork. DB는 Embedded PG 그대로 사용. 기존 테스트 데이터 삭제하고 클린 onboard.

**Tech Stack:** Node.js 20+, pnpm 9.15+, TypeScript, Express, React+Vite, Drizzle ORM, Embedded PostgreSQL

---

### Task 1: GitHub repo 생성 + fork

**Files:**
- Create: `company-os-v2/` (새 repo)

- [ ] **Step 1: Paperclip fork를 GitHub에 생성**

```bash
# GitHub에서 paperclipai/paperclip을 fork
# repo name: company-os-v2
# owner: BBrightcode-atlas
gh repo fork paperclipai/paperclip --clone=false --fork-name company-os-v2 --org BBrightcode-atlas
```

- [ ] **Step 2: 로컬에 clone**

```bash
cd ~/Projects
git clone https://github.com/BBrightcode-atlas/company-os-v2.git
cd company-os-v2
```

- [ ] **Step 3: upstream remote 설정**

```bash
git remote add upstream https://github.com/paperclipai/paperclip.git
git fetch upstream
```

Expected: `git remote -v`에 origin(fork) + upstream(paperclip) 표시

- [ ] **Step 4: 커밋**

```bash
git checkout -b feat/cos-v2-init
git commit --allow-empty -m "chore: COS v2 fork 초기화"
git push origin feat/cos-v2-init
```

---

### Task 2: 기존 데이터 삭제 + 클린 환경

**Files:**
- 삭제: `~/.paperclip/instances/default/db/` (기존 Embedded PG 데이터)

- [ ] **Step 1: 기존 Paperclip 데이터 삭제**

```bash
rm -rf ~/.paperclip/instances/default/db/
rm -rf ~/.paperclip/instances/default/data/
```

- [ ] **Step 2: 의존성 설치**

```bash
cd ~/Projects/company-os-v2
pnpm install
```

Expected: 설치 완료, 경고는 plugin 관련만 (무시 가능)

- [ ] **Step 3: 빌드**

```bash
pnpm build
```

Expected: server, ui, cli 전부 빌드 성공

- [ ] **Step 4: 서버 시작**

```bash
pnpm dev
```

Expected 출력:
```
Mode            embedded-postgres  |  vite-dev-middleware
Deploy          local_trusted (private)
Server          3100
API             http://127.0.0.1:3100/api
UI              http://127.0.0.1:3100
Database        /Users/bright/.paperclip/instances/default/db
Migrations      applied
```

- [ ] **Step 5: 헬스체크**

```bash
curl -s http://127.0.0.1:3100/api/health | jq .status
```

Expected: `"ok"`

---

### Task 3: Onboard — BBrightCode company 생성

- [ ] **Step 1: 브라우저에서 UI 접속**

`http://127.0.0.1:3100` 접속

Expected: Paperclip 초기 화면 (onboard 또는 빈 대시보드)

- [ ] **Step 2: Company 생성 확인**

local_trusted 모드에서는 자동 onboard. 아니라면 CLI로:

```bash
cd ~/Projects/company-os-v2
npx paperclipai onboard --yes
```

- [ ] **Step 3: Company 설정 확인**

```bash
curl -s http://127.0.0.1:3100/api/companies | jq '.[0] | {name, issuePrefix, issueCounter}'
```

Expected:
```json
{
  "name": "BBrightCode",
  "issuePrefix": "BBR",
  "issueCounter": 0
}
```

Company name이 다르면 UI Settings에서 "BBrightCode"로 변경.

- [ ] **Step 4: 클린 상태 확인**

```bash
COMPANY_ID=$(curl -s http://127.0.0.1:3100/api/companies | jq -r '.[0].id')
echo "Agents: $(curl -s http://127.0.0.1:3100/api/companies/$COMPANY_ID/agents | jq length)"
echo "Issues: $(curl -s http://127.0.0.1:3100/api/companies/$COMPANY_ID/issues | jq '.items | length')"
echo "Projects: $(curl -s http://127.0.0.1:3100/api/companies/$COMPANY_ID/projects | jq length)"
```

Expected: Agents 0 (또는 기본 CEO 1), Issues 0, Projects 0

---

### Task 4: 테스트 suite 실행

- [ ] **Step 1: 전체 테스트 실행**

```bash
cd ~/Projects/company-os-v2
pnpm test:run
```

Expected: 전체 통과 (또는 기존 Paperclip의 알려진 실패만)

- [ ] **Step 2: 실패 테스트 기록**

실패한 테스트가 있으면 Paperclip upstream의 기존 이슈인지 확인. 우리 변경으로 인한 실패가 아닌지 검증.

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "chore: 클린 환경 확인 완료 — 테스트 통과"
```

---

### Task 5: UI 동작 확인

- [ ] **Step 1: 주요 페이지 접근 확인**

브라우저에서:
- `http://127.0.0.1:3100` → Dashboard
- `http://127.0.0.1:3100/BBR/issues` → Issues (빈 목록)
- `http://127.0.0.1:3100/BBR/agents` → Agents
- `http://127.0.0.1:3100/BBR/projects` → Projects
- `http://127.0.0.1:3100/BBR/routines` → Routines
- `http://127.0.0.1:3100/BBR/goals` → Goals
- `http://127.0.0.1:3100/BBR/approvals` → Approvals
- `http://127.0.0.1:3100/BBR/org` → OrgChart

Expected: 모든 페이지 정상 렌더링, 에러 없음

- [ ] **Step 2: 사이드바 구조 확인**

사이드바에 표시:
- New Issue, Dashboard, Inbox
- WORK: Issues, Routines, Goals
- PROJECTS: (없음 — 빈 상태)
- AGENTS: (없음 또는 기본 CEO)
- COMPANY: Org

Expected: Paperclip 기본 사이드바 구조 정상 동작

---

## QA 체크리스트

- [ ] company-os-v2 repo가 GitHub에 존재
- [ ] upstream remote 설정됨
- [ ] `pnpm dev` 실행 시 서버(3100) + UI 정상 접속
- [ ] Embedded PG 자동 생성됨
- [ ] BBrightCode company 존재 (issuePrefix: BBR)
- [ ] 에이전트 0, 이슈 0, 프로젝트 0 (클린 상태)
- [ ] `pnpm test:run` 통과
- [ ] 모든 주요 UI 페이지 정상 렌더링
