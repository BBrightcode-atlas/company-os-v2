# Agent Chat — 100x Plan

Turn the 1:1 agent-DM plugin into a trustworthy operational console: agents answer about
real projects/issues/runs/code ONLY from live host data they just pulled (cite FLO-19-style
identifiers, refuse to guess), and turn conversation into real backlog — drafting issues/goals
from chat, gated behind a one-click human confirm, then host-created + assigned + auto-started.
Later: company-wide group rooms (roadmap + weekly standup) with multi-agent turn-taking.

## Load-bearing constraint
`ctx.*` RPC FAILS inside the fire-and-forget reply IIFE (scope dies when the action returns).
`ctx.streams.emit` and `ctx.db` survive (proven). Two consequences shape everything:
- **READS** = a `GroundingSnapshot` pre-fetched synchronously in the action scope, frozen into
  the `makeToolExecutor` closure. Tools read ONLY the snapshot, never call `ctx.*` lazily.
- **WRITES** never fire from the LLM lane. `propose_*` tools validate+normalize args against the
  frozen snapshot and persist a `chat_proposals` row + render a confirm card. A SEPARATE
  `applyProposal` action (fresh live RPC scope, human-triggered) does the real `ctx.issues.create`.

Namespace literal `plugin_flotter_agent_chat_9c7a1f643c` reused verbatim in new migrations
(verified: sha256('flotter.agent-chat').slice(0,10)).

## Verified worker ctx signatures (authoritative — NOT host-client-factory)
- `ctx.companies.list(input?)`, `ctx.companies.get(companyId)`
- `ctx.projects.list({companyId})`, `ctx.projects.get(projectId, companyId)`,
  `ctx.projects.getPrimaryWorkspace(projectId, companyId)`, `ctx.projects.getWorkspaceForIssue(issueId, companyId)`
- `ctx.executionWorkspaces.get(workspaceId, companyId)`
- `ctx.issues.list({companyId, projectId?, assigneeAgentId?, status?})`,
  `ctx.issues.get(issueId, companyId)`,
  `ctx.issues.create({companyId, title, description?, projectId?, goalId?, assigneeAgentId?, status?, priority?, blockedByIssueIds?, actor?})`,
  `ctx.issues.getSubtree(issueId, companyId, options?)`,
  `ctx.issues.listComments(issueId, companyId)`,
  `ctx.issues.summaries.getOrchestration({issueId, companyId, includeSubtree?})`,
  `ctx.issues.relations.setBlockedBy(issueId, ids[], companyId, actor?)`
- `ctx.goals.list({companyId, level?, status?})`, `ctx.goals.get(goalId, companyId)`,
  `ctx.goals.create({companyId, title, description?, level?, status?, parentId?, ownerAgentId?})`
- `ctx.agents.list({companyId})`, `ctx.agents.get(agentId, companyId)` (POSITIONAL — trap)
- Enums: issue status backlog|todo|in_progress|in_review|done|blocked|cancelled;
  priority critical|high|medium|low; goal level company|team|agent|task; goal status planned|active|achieved|cancelled
- Issue has `identifier` (FLO-19), `issueNumber`, `projectId`, `goalId`, `assigneeAgentId`
- `ctx.issues.create` with status != 'backlog' + assigneeAgentId ⇒ host auto-starts the agent

## Capabilities to add (Phase 1)
companies.read, projects.read, project.workspaces.read, execution.workspaces.read,
issues.read, issue.subtree.read, issue.comments.read, issues.orchestration.read,
goals.read, goals.create, issues.create, issue.relations.write, activity.log.write

## Phases
1. **Grounded reads + propose→confirm→create-issue in the DM** (highest value, zero host edits).
2. Room substrate + multi-agent group chat (read-grounded).
3. Meetings produce artifacts (roadmap flow): propose_roadmap → goal + N assigned issues + deps.
4. Scheduled weekly standup (ctx.jobs) + facilitator + project-gap honesty.
5. Deeper code/PR grounding + token streaming (REQUIRES host PRs).

## Known host gaps
- No free-text issue search (filter only by project/assignee/status) → directive must disclose.
- No `projects.create` RPC → project creation = proposal-only / goal fallback.
- Vision/system ignored by VibeProxy → persona + grounding directive ride first-user-turn.

## Trust / risk
Agents can create real issues + auto-start agents from chat → EVERY write is human-confirm-gated;
applyProposal re-validates ids in a live scope before mutating; `ctx.activity.log` every write.
Auto-start is explicit on the confirm card ("이 작업은 @agent를 지금 시작합니다") with a backlog toggle.
