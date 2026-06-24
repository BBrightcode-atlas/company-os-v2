# Builder Agent Bootstrap and Coverage Plan

Status: design approved for planning
Date: 2026-06-24
Scope: `bbr-plugins/builder`

## Problem

Builder currently has the right high-level workflow, but two operational gaps make Blueprint output unreliable:

1. Builder-managed agents are declared in plugin manifests but are not visible in the company agent list until a reconcile path runs. Blueprint pages do not currently trigger a full Builder bootstrap, and Project Builder agents are reconciled only when a build is instantiated.
2. Blueprint standard-plan generation compresses registered source documents directly into one large JSON output. With long or multiple source documents, the model tends to summarize representative items instead of enumerating every requirement, screen, data object, integration, permission, admin need, and non-functional requirement.

The fix should optimize for accuracy over speed or cost.

## Decisions

- All Builder-managed agents use the top signature Codex lane: `codex_local`, `model: "gpt-5.5"`, `modelReasoningEffort: "xhigh"`.
- Builder managed-agent declarations should not prefer or fall back to lower-tier adapters. Their `adapterPreference` should be `["codex_local"]`.
- Codex Fast Mode should remain off for these agents unless a later task proves it does not reduce output quality.
- Existing managed agents need an explicit reset path after manifest changes. Reconcile alone does not overwrite existing `adapterConfig`.
- Direct worker LLM calls used by Blueprint and Wireframe are not Paperclip agents. They should still default to the same top model family for consistency, but any reasoning-effort payload extension must be verified against the active gateway before implementation.

## Agent Topology

Builder should expose and bootstrap all of these managed agents:

| Agent | Role | Primary responsibility |
| --- | --- | --- |
| Blueprint Requirement Analyst | analyst | Read registered source slots and produce exhaustive requirement inventory with evidence. |
| Blueprint PM Agent | pm | Convert inventory into Standard Plan, PRD, feature definitions, and approval-ready planning outputs. |
| Blueprint Contract Agent | engineer | Convert covered requirements into schema, REST API, interface, layout, auth, error, and audit contracts. |
| Blueprint Screen Agent | designer | Convert inventory and contracts into screen candidates and screen definitions. |
| Product Builder Orchestrator | delivery-orchestrator | Convert approved Blueprint/Wireframe outputs into build plans and issue graphs. |
| Product Builder Backend | backend-engineer | Own backend/API/data implementation issues. |
| Product Builder Frontend | frontend-engineer | Own public/app/admin UI implementation issues. |
| Product Builder Platform | platform-engineer | Own repo, workspace, environment, deployment, and operational handoff issues. |
| Product Builder AI Runtime | ai-runtime-engineer | Own AI server/runtime, prompt, cost, and observability implementation issues. |
| Product Builder QA | qa-engineer | Own contract, build, browser, deployment, login, and admin verification issues. |

## Bootstrap Flow

Add a Builder-level managed-resource bootstrap surface, not only Blueprint-specific resource actions.

- Data key: `builder.managed-resources`
- Action: `ensure-builder-resources`
- Action: `reset-builder-resources`

`ensure-builder-resources` should reconcile all Builder agents, skills, routines, and the Blueprint managed project. It must be idempotent. If the company requires board approval for new agents, it should leave new agents in the host's existing pending-approval path instead of bypassing governance.

`reset-builder-resources` should be explicit and operator-triggered because it overwrites existing managed agent defaults, including adapter config and instructions. Use it after changing the model policy.

The Builder UI should show a compact readiness panel on Blueprint and Project Builder pages:

- ready: all expected managed agents are resolved
- missing: one or more declarations are not materialized
- pending approval: host created approval-gated agents
- drift: declared instructions differ from materialized instructions
- wrong model policy: resolved agent is not `codex_local` / `gpt-5.5` / `xhigh`

## Accuracy Pipeline

Replace direct source-to-standard-plan compression with a staged inventory pipeline.

### 1. Requirement Inventory

Add slot: `deliverable.requirement_inventory`

Add action: `run-requirement-inventory`

The Requirement Analyst should extract source-backed atomic items before any polished planning document is generated. Every item must include:

- stable id
- category
- title
- description
- source id/title
- short evidence excerpt
- confidence
- status: `candidate`, `confirmed`, `duplicate`, `unclear`, or `out_of_scope`

Categories should include at least:

- functional requirement
- actor or permission
- screen candidate
- data object
- API or integration
- admin operation
- payment
- notification
- upload or media
- AI/runtime
- non-functional requirement
- risk
- missing input or open question

### 2. Canonicalization

The inventory stage should merge duplicates only by creating a canonical item with multiple source refs. It must not discard source evidence.

### 3. Coverage Matrix

Add slot: `deliverable.coverage_matrix`

Add action: `verify-standard-plan-coverage`

The coverage matrix maps each canonical inventory item to downstream outputs:

- PRD coverage
- feature definition coverage
- schema coverage
- API coverage
- interface/layout coverage
- screen definition coverage
- Project Builder feature/build-plan coverage

Statuses should be `covered`, `weak`, `missing`, `n/a`, or `blocked`.

### 4. Gates

`run-standard-plan` should use inventory as the primary input. If inventory is missing, the UI should either run the inventory step first or block with a clear message.

`confirm-standard-plan` should surface coverage state. Accuracy-first default: block confirmation while any `missing` item remains unless it is explicitly marked `n/a` with a reason.

`run-screens` should use screen candidates from inventory plus confirmed contracts, not only the compressed standard-plan summary.

## Implementation Notes

- Keep hand-off through Project document slots. Do not introduce workspace-file-only outputs for this flow.
- Keep project scope. Inventory, coverage, standard plan, screens, wireframe, build plan, task list, and issue graph must remain project-scoped.
- Keep activity logging for new mutating actions.
- Keep BBR company gating consistent with current Blueprint behavior.
- Preserve the existing fire-and-forget job pattern for LLM operations that can exceed RPC timeouts.
- Use stale job guards for the new inventory and coverage jobs, matching the existing `jobId` behavior.

## Tests

Add focused tests under `bbr-plugins/builder/tests/plugin.spec.ts`:

- Builder manifest declares every managed agent with `codex_local`, `gpt-5.5`, `modelReasoningEffort: "xhigh"`, and no alternate adapter preference.
- `ensure-builder-resources` reconciles Blueprint and Project Builder managed agents in one action.
- `reset-builder-resources` overwrites existing managed agent model policy.
- Requirement inventory slot is project-scoped.
- Standard-plan generation refuses or auto-runs when inventory is missing.
- Coverage matrix flags an inventory item missing from generated schema/API/screen outputs.
- `confirm-standard-plan` blocks or warns according to unresolved coverage state.

## Open Implementation Check

Before changing worker direct LLM payloads, verify the active `vibeproxy`/Anthropic-compatible gateway accepts the intended GPT-5.5 model id and any reasoning-effort extension. If the gateway only accepts `model`, make worker direct calls use `gpt-5.5` and leave `xhigh` enforcement to Codex-managed agents.
