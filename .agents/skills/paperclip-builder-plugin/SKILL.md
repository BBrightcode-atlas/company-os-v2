---
name: paperclip-builder-plugin
description: Work on the company-os-v2 BBR Builder plugin in `bbr-plugins/builder`. Use when modifying or reviewing Blueprint, Wireframe, or Project Builder behavior; changing Blueprint deliverables, project document slots, PM agent workflows, shadcn-based Builder UI, source intake, Notion intake, feature-definition outputs, project-builder-base reuse analysis, or deploying the Builder plugin to mac-studio.
---

# Paperclip Builder Plugin

Use this skill for focused work on `/Users/bright/Projects/company-os-v2/bbr-plugins/builder`.

## Scope Rules

- Keep edits inside `bbr-plugins/builder` unless the user explicitly asks for Paperclip core changes.
- Treat `mac-studio` as the real deployment target when the user asks to deploy or test on `http://mac-studio.tail9b5d74.ts.net:3100`.
- Preserve unrelated dirty files. Known recurring unrelated state: root `docs/superpowers/` in the local checkout and `pnpm-lock.yaml` on mac-studio.
- Use shadcn/Radix components for Builder UI controls and dialogs. Do not use native `alert` or `confirm`.
- For frontend changes, verify layout behavior in the browser when the user is testing UI behavior.

## Code Map

Start by reading the files relevant to the requested module:

- Blueprint contract, state, slots, renderers: `src/blueprint/contract.ts`
- Blueprint worker/actions/data: `src/blueprint/worker.ts`
- Blueprint managed-agent instructions/resources: `src/blueprint/manifest.ts`
- Per-deliverable LLM workflows: `src/blueprint/deliverable-workflows/*.workflow.ts`, `src/blueprint/deliverable-workflows/index.ts`, `src/blueprint/deliverable-workflows/registry.ts`
- Blueprint task mapping: `src/blueprint/build-plan-mapper.ts`
- Blueprint source intake: `src/blueprint/source-intake/`
- Blueprint templates: `templates/deliverables/`, `templates/standards/`
- Shared UI primitives: `src/ui/`
- Module UI: `src/blueprint/ui/`, `src/wireframe/ui/`, `src/project-builder/ui/`
- Wireframe module: `src/wireframe/contract.ts`, `src/wireframe/worker.ts`
- Project Builder module: `src/project-builder/contract.ts`, `src/project-builder/worker.ts`
- Shared project slot registry: `../../packages/shared/src/project-document-slots.ts`
- Regression tests: `tests/plugin.spec.ts`

## Current Product Contracts

- Check Builder slots in three layers before answering or editing: (1) canonical default registry in `packages/shared/src/project-document-slots.ts`, (2) Builder/Blueprint view filtering in `src/blueprint/worker.ts`, and (3) module importers that write slots.
- Canonical default project slots currently are:
  - Source: `source.customer_originals`, `source.internal_notes`, `source.references`
  - Support: `support.pm_execution_procedure`, `support.screen_definition_writing_rules`
  - Deliverable: `deliverable.requirement_inventory`, `deliverable.prd`, `deliverable.feature_files`, `deliverable.schema_definition`, `deliverable.api_definition`, `deliverable.architecture`, `deliverable.screen_definitions`, `deliverable.wireframe_html`, `deliverable.task_list`
- Registered source material lives in source slots (`source.customer_originals`, `source.internal_notes`, `source.references`). Do not create a separate source-material Markdown deliverable.
- `deliverable.requirement_inventory` remains in the shared default registry, but Blueprint's project-document-slot view filters it out with retired/internal slots. It is an internal coverage / source-backed requirement index, not a customer-facing source-material document.
- The user-facing "개발 요구사항 브리프(Development Requirements Brief)" is the DRB. Its persisted slot key remains `deliverable.prd`.
- Preserve legacy wire/persist strings unless doing an explicit migration: `deliverable.prd`, `run-prd`, `confirm-prd`, `write-prd-docs`, `submit-blueprint-prd`, and state field `prd`.
- Current code may use DRB names internally (`BlueprintDrb`, `DRB_SLOT_KEY`, `SUBMIT_BLUEPRINT_DRB_TOOL`, `drb.workflow.ts`). Keep aliases and external contracts synchronized.
- Feature definition is one output: `deliverable.feature_files`. It contains both `docs/cos-blueprint/feature-definition.md` and `docs/cos-blueprint/features/*.md`.
- Blueprint customer-facing deliverables are `deliverable.prd`, `deliverable.feature_files`, `deliverable.schema_definition`, `deliverable.api_definition`, `deliverable.architecture`, and `deliverable.screen_definitions`.
- Wireframe writes `deliverable.wireframe_html`.
- Blueprint's "Task 생성" path writes only `deliverable.task_list`.
- Project Builder's older standalone module still declares `deliverable.build_plan` and tries to import both `deliverable.build_plan` and `deliverable.task_list`. This conflicts with the shared slot service because `deliverable.build_plan` is not in the canonical default registry and unknown slot imports are rejected. Treat remaining BuildPlan references as an active reconciliation/bug target, not as a working user-facing output.
- Treat `deliverable.issue_graph`, `deliverable.feature_index`, `deliverable.standard_plan`, `deliverable.interface_definition`, and `deliverable.layout_definition` as retired output surfaces.
- Feature definitions must include project-builder-base reuse analysis: target surface (`admin`, `site`, `app`, `landing`), full reuse, partial reuse, customization, new build, hard-copy scope, and customization scope.
- Product Builder work must remain server-authoritative. Do not import Flotter local-first, offline-first, PGlite, or ElectricSQL policy into Product Builder guidance.
- `.paperclip-sdk/*.tgz` files are local plugin SDK/shared package tarballs for install/build, not Builder deliverables.
- `.agents/` is ignored by this repo. If the user asks to persist this skill in git, use `git add -f .agents/skills/paperclip-builder-plugin/SKILL.md .agents/skills/paperclip-builder-plugin/agents/openai.yaml`.

## Implementation Workflow

1. Inspect current git state and restrict the diff:

```sh
git status -sb
git diff --name-only
```

2. Read the relevant contract, worker, template, and test files before editing.
3. Make the smallest contract-correct change. Keep slot keys, action names, worker state, templates, and tests synchronized.
4. For deliverable changes, update all applicable surfaces:
   - `packages/shared/src/project-document-slots.ts`
   - output inventory target definitions
   - `buildBlueprintWorkflowPanel`
   - deliverable workflow registry
   - PM agent instructions
   - templates
   - `projectSlotKeyForDocumentPath`
   - slot view filtering for retired keys
   - `tests/plugin.spec.ts`
5. For DRB naming changes, keep internal names, persisted keys, UI labels, agent prompts, stream channels, slot metadata, and tests aligned. Do not rename legacy external keys casually.
6. For UI changes, use existing shadcn/Radix primitives from `src/ui` and edit the relevant module UI directory. Keep scroll ownership local to the intended pane.

## Verification

Run package-local checks before claiming the Builder change is done:

```sh
pnpm --dir bbr-plugins/builder typecheck
pnpm --dir bbr-plugins/builder test
pnpm --dir bbr-plugins/builder build
git diff --check
```

Use narrower checks while iterating, but run the set above before commit/deploy. If the change crosses Paperclip core contracts, add the smallest relevant repo-level check.

## Publish And Deploy

When the user asks to merge, push, or deploy:

1. Commit only the Builder-related files.
2. Push the intended branches, usually:

```sh
git push origin HEAD:develop HEAD:main
```

3. Deploy to mac-studio:

```sh
ssh mac-studio 'export PATH=/opt/homebrew/Cellar/node@24/24.15.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH; set -e; cd /Users/papert/Projects/company-os-v2; git fetch origin main; git merge --ff-only origin/main; cd bbr-plugins/builder; pnpm install --frozen-lockfile --force; pnpm build; pm2 restart paperclip --update-env'
```

If a stale local `file:` SDK dependency is suspected, clean only the plugin package before reinstalling:

```sh
ssh mac-studio 'cd /Users/papert/Projects/company-os-v2/bbr-plugins/builder; rm -rf node_modules dist'
```

4. Verify deployment:

```sh
curl -fsS http://mac-studio.tail9b5d74.ts.net:3100/api/health
ssh mac-studio 'cd /Users/papert/Projects/company-os-v2; git status -sb; git rev-parse HEAD; git rev-parse origin/main'
ssh mac-studio 'export PATH=/opt/homebrew/Cellar/node@24/24.15.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH; pm2 status paperclip --no-color'
```

5. Verify plugin registry without printing tokens:

```sh
ssh mac-studio 'python3 - <<'"'"'PY'"'"'
import json, urllib.request
from pathlib import Path
cred=json.loads(Path("/Users/papert/.cos-v2/paperclip-prod/auth.json").read_text())["credentials"]["http://127.0.0.1:3100"]
req=urllib.request.Request("http://127.0.0.1:3100/api/plugins", headers={"Authorization": "Bearer " + cred["token"]})
plugins=json.loads(urllib.request.urlopen(req, timeout=10).read().decode())
for p in plugins:
    if p.get("pluginKey")=="paperclip-plugin-builder":
        print(json.dumps({"id":p.get("id"),"pluginKey":p.get("pluginKey"),"status":p.get("status"),"packagePath":p.get("packagePath"),"lastError":p.get("lastError")}, ensure_ascii=False))
PY'
```

If the local registry probe fails immediately after restart but `/api/health` is already ok, wait briefly and retry before diagnosing.
