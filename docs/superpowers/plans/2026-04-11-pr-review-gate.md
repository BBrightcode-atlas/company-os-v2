# PR Review Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PR이 올라오면 Codex+Claude 자동 검증 → 사람 승인 → GitHub 머지까지의 리뷰 게이트를 COS에 추가한다.

**Architecture:** 기존 GitHub webhook → issue_work_products 흐름에 review pipeline을 삽입. 팀별 파이프라인 템플릿으로 검증 스텝 정의, review_runs/review_checks로 실행 추적, 기존 approvals 시스템에 pr_review 타입 확장. 승인 시 GitHub API로 머지.

**Tech Stack:** Drizzle ORM, Zod, Express, React + React Query, shadcn/ui + Tailwind, Codex CLI, GitHub REST API

**Spec:** `docs/superpowers/specs/2026-04-11-pr-review-gate-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `packages/db/src/schema/project-environments.ts` | project_environments 테이블 정의 |
| `packages/db/src/schema/review-pipeline-templates.ts` | review_pipeline_templates 테이블 정의 |
| `packages/db/src/schema/review-runs.ts` | review_runs 테이블 정의 |
| `packages/db/src/schema/review-checks.ts` | review_checks 테이블 정의 |
| `packages/db/src/migrations/0071_pr_review_gate.sql` | 4개 테이블 마이그레이션 |
| `packages/shared/src/validators/project-environments.ts` | 환경 CRUD Zod 스키마 |
| `packages/shared/src/validators/review-pipeline.ts` | 파이프라인 + 리뷰 Zod 스키마 |
| `server/src/services/project-environments.ts` | 환경 CRUD 서비스 |
| `server/src/services/review-pipeline.ts` | 파이프라인 실행 + 리뷰 서비스 |
| `server/src/services/review-executors.ts` | Codex/Claude/builtin 실행자 |
| `server/src/routes/project-environments.ts` | 환경 API 라우트 |
| `server/src/routes/review-pipeline.ts` | 리뷰 파이프라인 API 라우트 |
| `ui/src/api/projectEnvironments.ts` | 환경 API 클라이언트 |
| `ui/src/api/reviewPipeline.ts` | 리뷰 API 클라이언트 |
| `ui/src/components/ReviewRunCard.tsx` | 리뷰 실행 결과 카드 |
| `ui/src/components/ReviewCheckItem.tsx` | 개별 체크 항목 |
| `ui/src/components/IssueReviewSection.tsx` | 이슈 상세 Review 탭 내용 |
| `ui/src/components/EnvironmentCard.tsx` | 환경 카드 컴포넌트 |
| `ui/src/components/PipelineStepEditor.tsx` | 파이프라인 스텝 편집 UI |

### Modified Files

| File | Change |
|------|--------|
| `packages/db/src/schema/index.ts` | 새 테이블 export 추가 |
| `packages/shared/src/index.ts` | 새 validator/타입 export 추가 |
| `server/src/services/index.ts` | 새 서비스 export 추가 |
| `server/src/routes/index.ts` | 새 라우트 export 추가 |
| `server/src/index.ts` | 새 라우트 등록 |
| `server/src/services/github-webhooks.ts` | review_run 트리거 로직 추가 |
| `server/src/routes/github-webhooks.ts` | project_environment 매칭 추가 |
| `ui/src/pages/IssueDetail.tsx` | Review 탭 추가 |
| `ui/src/components/ApprovalCard.tsx` | pr_review 타입 아이콘/라벨 추가 |
| `ui/src/lib/queryKeys.ts` | 새 쿼리 키 추가 |

---

## Task 1: DB 스키마 — project_environments

**Files:**
- Create: `packages/db/src/schema/project-environments.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: project_environments 스키마 파일 생성**

```typescript
// packages/db/src/schema/project-environments.ts
import { pgTable, uuid, text, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { projects } from "./projects.js";

export const projectEnvironments = pgTable(
  "project_environments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    config: jsonb("config")
      .$type<{
        github?: {
          owner: string;
          repo: string;
          baseBranch: string;
          webhookSecret?: string;
        };
        deploy?: {
          url?: string;
          healthEndpoint?: string;
        };
        merge?: {
          method?: "squash" | "merge" | "rebase";
          deleteSourceBranch?: boolean;
        };
      }>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyProjectIdx: index("project_environments_company_project_idx").on(
      table.companyId,
      table.projectId,
    ),
    projectSlugIdx: index("project_environments_project_slug_idx")
      .on(table.projectId, table.slug)
      .where(/* unique constraint handled separately */),
  }),
);
```

- [ ] **Step 2: schema/index.ts에 export 추가**

`packages/db/src/schema/index.ts` 파일에 추가:

```typescript
export { projectEnvironments } from "./project-environments.js";
```

기존 export 목록의 알파벳 순서에 맞춰 삽입.

- [ ] **Step 3: 커밋**

```bash
git add packages/db/src/schema/project-environments.ts packages/db/src/schema/index.ts
git commit -m "feat(db): add project_environments schema"
```

---

## Task 2: DB 스키마 — review_pipeline_templates, review_runs, review_checks

**Files:**
- Create: `packages/db/src/schema/review-pipeline-templates.ts`
- Create: `packages/db/src/schema/review-runs.ts`
- Create: `packages/db/src/schema/review-checks.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: review_pipeline_templates 스키마 생성**

```typescript
// packages/db/src/schema/review-pipeline-templates.ts
import { pgTable, uuid, text, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { teams } from "./teams.js";

export interface ReviewStepConfig {
  slug: string;
  name: string;
  type: "auto" | "manual";
  executor: "codex" | "claude" | "builtin" | "manual";
  config?: Record<string, unknown>;
}

export const reviewPipelineTemplates = pgTable(
  "review_pipeline_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    teamId: uuid("team_id").references(() => teams.id),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    enabled: boolean("enabled").notNull().default(true),
    steps: jsonb("steps").$type<ReviewStepConfig[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyTeamIdx: index("review_pipeline_templates_company_team_idx").on(
      table.companyId,
      table.teamId,
    ),
  }),
);
```

- [ ] **Step 2: review_runs 스키마 생성**

```typescript
// packages/db/src/schema/review-runs.ts
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issueWorkProducts } from "./issue_work_products.js";
import { issues } from "./issues.js";
import { reviewPipelineTemplates } from "./review-pipeline-templates.js";

export const reviewRuns = pgTable(
  "review_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id),
    workProductId: uuid("work_product_id")
      .notNull()
      .references(() => issueWorkProducts.id),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id),
    pipelineTemplateId: uuid("pipeline_template_id")
      .notNull()
      .references(() => reviewPipelineTemplates.id),
    status: text("status").notNull().default("running"),
    triggeredBy: text("triggered_by").notNull().default("webhook"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyStatusIdx: index("review_runs_company_status_idx").on(
      table.companyId,
      table.status,
    ),
    workProductIdx: index("review_runs_work_product_idx").on(table.workProductId),
    issueIdx: index("review_runs_issue_idx").on(table.issueId),
  }),
);
```

- [ ] **Step 3: review_checks 스키마 생성**

```typescript
// packages/db/src/schema/review-checks.ts
import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { reviewRuns } from "./review-runs.js";
import { agents } from "./agents.js";

export const reviewChecks = pgTable(
  "review_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewRunId: uuid("review_run_id")
      .notNull()
      .references(() => reviewRuns.id, { onDelete: "cascade" }),
    stepSlug: text("step_slug").notNull(),
    stepName: text("step_name").notNull(),
    stepType: text("step_type").notNull(),
    executor: text("executor").notNull(),
    status: text("status").notNull().default("pending"),
    summary: text("summary"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    checkedByAgentId: uuid("checked_by_agent_id").references(() => agents.id),
    checkedByUserId: uuid("checked_by_user_id"),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    reviewRunIdx: index("review_checks_review_run_idx").on(table.reviewRunId),
  }),
);
```

- [ ] **Step 4: schema/index.ts에 3개 export 추가**

`packages/db/src/schema/index.ts`에 추가:

```typescript
export { reviewPipelineTemplates } from "./review-pipeline-templates.js";
export { reviewRuns } from "./review-runs.js";
export { reviewChecks } from "./review-checks.js";
```

- [ ] **Step 5: 커밋**

```bash
git add packages/db/src/schema/review-pipeline-templates.ts packages/db/src/schema/review-runs.ts packages/db/src/schema/review-checks.ts packages/db/src/schema/index.ts
git commit -m "feat(db): add review pipeline schemas (templates, runs, checks)"
```

---

## Task 3: 마이그레이션 SQL

**Files:**
- Create: `packages/db/src/migrations/0071_pr_review_gate.sql`

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- 0071_pr_review_gate.sql
CREATE TABLE "project_environments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_environments" ADD CONSTRAINT "project_environments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
--> statement-breakpoint
ALTER TABLE "project_environments" ADD CONSTRAINT "project_environments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");
--> statement-breakpoint
CREATE INDEX "project_environments_company_project_idx" ON "project_environments" USING btree ("company_id","project_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "project_environments_project_slug_uniq" ON "project_environments" USING btree ("project_id","slug");
--> statement-breakpoint
CREATE TABLE "review_pipeline_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "team_id" uuid,
  "name" text NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "enabled" boolean NOT NULL DEFAULT true,
  "steps" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_pipeline_templates" ADD CONSTRAINT "review_pipeline_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
--> statement-breakpoint
ALTER TABLE "review_pipeline_templates" ADD CONSTRAINT "review_pipeline_templates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");
--> statement-breakpoint
CREATE INDEX "review_pipeline_templates_company_team_idx" ON "review_pipeline_templates" USING btree ("company_id","team_id");
--> statement-breakpoint
CREATE TABLE "review_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "work_product_id" uuid NOT NULL,
  "issue_id" uuid NOT NULL,
  "pipeline_template_id" uuid NOT NULL,
  "status" text NOT NULL DEFAULT 'running',
  "triggered_by" text NOT NULL DEFAULT 'webhook',
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_runs" ADD CONSTRAINT "review_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");
--> statement-breakpoint
ALTER TABLE "review_runs" ADD CONSTRAINT "review_runs_work_product_id_issue_work_products_id_fk" FOREIGN KEY ("work_product_id") REFERENCES "public"."issue_work_products"("id");
--> statement-breakpoint
ALTER TABLE "review_runs" ADD CONSTRAINT "review_runs_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id");
--> statement-breakpoint
ALTER TABLE "review_runs" ADD CONSTRAINT "review_runs_pipeline_template_id_review_pipeline_templates_id_fk" FOREIGN KEY ("pipeline_template_id") REFERENCES "public"."review_pipeline_templates"("id");
--> statement-breakpoint
CREATE INDEX "review_runs_company_status_idx" ON "review_runs" USING btree ("company_id","status");
--> statement-breakpoint
CREATE INDEX "review_runs_work_product_idx" ON "review_runs" USING btree ("work_product_id");
--> statement-breakpoint
CREATE INDEX "review_runs_issue_idx" ON "review_runs" USING btree ("issue_id");
--> statement-breakpoint
CREATE TABLE "review_checks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "review_run_id" uuid NOT NULL,
  "step_slug" text NOT NULL,
  "step_name" text NOT NULL,
  "step_type" text NOT NULL,
  "executor" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "summary" text,
  "details" jsonb,
  "checked_by_agent_id" uuid,
  "checked_by_user_id" uuid,
  "checked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_checks" ADD CONSTRAINT "review_checks_review_run_id_review_runs_id_fk" FOREIGN KEY ("review_run_id") REFERENCES "public"."review_runs"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "review_checks" ADD CONSTRAINT "review_checks_checked_by_agent_id_agents_id_fk" FOREIGN KEY ("checked_by_agent_id") REFERENCES "public"."agents"("id");
--> statement-breakpoint
CREATE INDEX "review_checks_review_run_idx" ON "review_checks" USING btree ("review_run_id");
```

- [ ] **Step 2: 마이그레이션 실행 확인**

Run: `pnpm --filter @paperclipai/db build && pnpm --filter @paperclipai/db migrate`
Expected: "Applying 1 pending migration(s)... Migrations complete"

- [ ] **Step 3: 커밋**

```bash
git add packages/db/src/migrations/0071_pr_review_gate.sql
git commit -m "feat(db): add migration 0071 — PR review gate tables"
```

---

## Task 4: Shared Zod 스키마 — project environments

**Files:**
- Create: `packages/shared/src/validators/project-environments.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 프로젝트 환경 validator 생성**

```typescript
// packages/shared/src/validators/project-environments.ts
import { z } from "zod";

export const githubConfigSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  baseBranch: z.string().min(1).default("main"),
  webhookSecret: z.string().optional(),
});

export const deployConfigSchema = z.object({
  url: z.string().url().optional(),
  healthEndpoint: z.string().optional(),
});

export const mergeConfigSchema = z.object({
  method: z.enum(["squash", "merge", "rebase"]).default("squash"),
  deleteSourceBranch: z.boolean().default(true),
});

export const environmentConfigSchema = z.object({
  github: githubConfigSchema.optional(),
  deploy: deployConfigSchema.optional(),
  merge: mergeConfigSchema.optional(),
});

export const createProjectEnvironmentSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric with hyphens"),
  isDefault: z.boolean().optional().default(false),
  config: environmentConfigSchema.optional().default({}),
});

export const updateProjectEnvironmentSchema = createProjectEnvironmentSchema.partial();

export type CreateProjectEnvironment = z.infer<typeof createProjectEnvironmentSchema>;
export type UpdateProjectEnvironment = z.infer<typeof updateProjectEnvironmentSchema>;
export type EnvironmentConfig = z.infer<typeof environmentConfigSchema>;
```

- [ ] **Step 2: packages/shared/src/index.ts에 export 추가**

기존 export 목록에 추가:

```typescript
export {
  createProjectEnvironmentSchema,
  updateProjectEnvironmentSchema,
  environmentConfigSchema,
  githubConfigSchema,
  mergeConfigSchema,
  type CreateProjectEnvironment,
  type UpdateProjectEnvironment,
  type EnvironmentConfig,
} from "./validators/project-environments.js";
```

- [ ] **Step 3: shared 빌드 확인**

Run: `pnpm --filter @paperclipai/shared build`
Expected: 에러 없이 완료

- [ ] **Step 4: 커밋**

```bash
git add packages/shared/src/validators/project-environments.ts packages/shared/src/index.ts
git commit -m "feat(shared): add project environment validation schemas"
```

---

## Task 5: Shared Zod 스키마 — review pipeline

**Files:**
- Create: `packages/shared/src/validators/review-pipeline.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 리뷰 파이프라인 validator 생성**

```typescript
// packages/shared/src/validators/review-pipeline.ts
import { z } from "zod";

export const reviewStepConfigSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  type: z.enum(["auto", "manual"]),
  executor: z.enum(["codex", "claude", "builtin", "manual"]),
  config: z.record(z.unknown()).optional().default({}),
});

export const updateReviewPipelineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  steps: z.array(reviewStepConfigSchema).optional(),
});

export const rejectReviewSchema = z.object({
  decisionNote: z.string().min(1).max(5000),
});

export const updateReviewCheckSchema = z.object({
  status: z.enum(["passed", "failed", "skipped"]),
  summary: z.string().max(5000).optional(),
});

export type ReviewStepConfig = z.infer<typeof reviewStepConfigSchema>;
export type UpdateReviewPipeline = z.infer<typeof updateReviewPipelineSchema>;

export const REVIEW_RUN_STATUSES = ["running", "passed", "failed", "cancelled"] as const;
export type ReviewRunStatus = (typeof REVIEW_RUN_STATUSES)[number];

export const REVIEW_CHECK_STATUSES = ["pending", "running", "passed", "failed", "skipped"] as const;
export type ReviewCheckStatus = (typeof REVIEW_CHECK_STATUSES)[number];
```

- [ ] **Step 2: packages/shared/src/index.ts에 export 추가**

```typescript
export {
  reviewStepConfigSchema,
  updateReviewPipelineSchema,
  rejectReviewSchema,
  updateReviewCheckSchema,
  REVIEW_RUN_STATUSES,
  REVIEW_CHECK_STATUSES,
  type ReviewStepConfig,
  type UpdateReviewPipeline,
  type ReviewRunStatus,
  type ReviewCheckStatus,
} from "./validators/review-pipeline.js";
```

- [ ] **Step 3: shared 빌드 확인**

Run: `pnpm --filter @paperclipai/shared build`
Expected: 에러 없이 완료

- [ ] **Step 4: 커밋**

```bash
git add packages/shared/src/validators/review-pipeline.ts packages/shared/src/index.ts
git commit -m "feat(shared): add review pipeline validation schemas"
```

---

## Task 6: Server 서비스 — project environments CRUD

**Files:**
- Create: `server/src/services/project-environments.ts`
- Modify: `server/src/services/index.ts`

- [ ] **Step 1: project environments 서비스 생성**

```typescript
// server/src/services/project-environments.ts
import { eq, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { projectEnvironments } from "@paperclipai/db";
import { notFound, conflict } from "../errors.js";

export function projectEnvironmentService(db: Db) {
  return {
    list: async (companyId: string, projectId: string) => {
      return db
        .select()
        .from(projectEnvironments)
        .where(
          and(
            eq(projectEnvironments.companyId, companyId),
            eq(projectEnvironments.projectId, projectId),
          ),
        )
        .orderBy(projectEnvironments.createdAt);
    },

    getById: async (companyId: string, envId: string) => {
      const row = await db
        .select()
        .from(projectEnvironments)
        .where(
          and(
            eq(projectEnvironments.companyId, companyId),
            eq(projectEnvironments.id, envId),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (!row) throw notFound("Environment not found");
      return row;
    },

    findByWebhookRepo: async (owner: string, repo: string) => {
      const all = await db.select().from(projectEnvironments);
      return all.filter((env) => {
        const gh = (env.config as Record<string, unknown>)?.github as
          | { owner?: string; repo?: string }
          | undefined;
        return gh?.owner === owner && gh?.repo === repo;
      });
    },

    create: async (
      companyId: string,
      projectId: string,
      data: {
        name: string;
        slug: string;
        isDefault?: boolean;
        config?: Record<string, unknown>;
      },
    ) => {
      const existing = await db
        .select()
        .from(projectEnvironments)
        .where(
          and(
            eq(projectEnvironments.projectId, projectId),
            eq(projectEnvironments.slug, data.slug),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (existing) throw conflict(`Environment slug "${data.slug}" already exists`);

      if (data.isDefault) {
        await db
          .update(projectEnvironments)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(
            and(
              eq(projectEnvironments.companyId, companyId),
              eq(projectEnvironments.projectId, projectId),
            ),
          );
      }

      const [created] = await db
        .insert(projectEnvironments)
        .values({
          companyId,
          projectId,
          name: data.name,
          slug: data.slug,
          isDefault: data.isDefault ?? false,
          config: data.config ?? {},
        })
        .returning();
      return created;
    },

    update: async (
      companyId: string,
      envId: string,
      data: Partial<{
        name: string;
        slug: string;
        isDefault: boolean;
        config: Record<string, unknown>;
      }>,
    ) => {
      const existing = await db
        .select()
        .from(projectEnvironments)
        .where(
          and(
            eq(projectEnvironments.companyId, companyId),
            eq(projectEnvironments.id, envId),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (!existing) throw notFound("Environment not found");

      if (data.isDefault) {
        await db
          .update(projectEnvironments)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(
            and(
              eq(projectEnvironments.companyId, companyId),
              eq(projectEnvironments.projectId, existing.projectId),
            ),
          );
      }

      const [updated] = await db
        .update(projectEnvironments)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projectEnvironments.id, envId))
        .returning();
      return updated;
    },

    remove: async (companyId: string, envId: string) => {
      const existing = await db
        .select()
        .from(projectEnvironments)
        .where(
          and(
            eq(projectEnvironments.companyId, companyId),
            eq(projectEnvironments.id, envId),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (!existing) throw notFound("Environment not found");

      await db.delete(projectEnvironments).where(eq(projectEnvironments.id, envId));
      return existing;
    },
  };
}
```

- [ ] **Step 2: services/index.ts에 export 추가**

```typescript
export { projectEnvironmentService } from "./project-environments.js";
```

- [ ] **Step 3: 커밋**

```bash
git add server/src/services/project-environments.ts server/src/services/index.ts
git commit -m "feat(server): add project environment CRUD service"
```

---

## Task 7: Server 서비스 — review pipeline 서비스

**Files:**
- Create: `server/src/services/review-pipeline.ts`
- Modify: `server/src/services/index.ts`

- [ ] **Step 1: review pipeline 서비스 생성**

```typescript
// server/src/services/review-pipeline.ts
import { eq, and, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  reviewPipelineTemplates,
  reviewRuns,
  reviewChecks,
  approvals,
  issueApprovals,
} from "@paperclipai/db";
import type { ReviewStepConfig } from "@paperclipai/shared";
import { notFound } from "../errors.js";

export function reviewPipelineService(db: Db) {
  return {
    // --- Pipeline Template CRUD ---

    getTeamPipeline: async (companyId: string, teamId: string) => {
      return db
        .select()
        .from(reviewPipelineTemplates)
        .where(
          and(
            eq(reviewPipelineTemplates.companyId, companyId),
            eq(reviewPipelineTemplates.teamId, teamId),
            eq(reviewPipelineTemplates.isDefault, true),
          ),
        )
        .then((rows) => rows[0] ?? null);
    },

    upsertTeamPipeline: async (
      companyId: string,
      teamId: string,
      data: { name?: string; enabled?: boolean; steps?: ReviewStepConfig[] },
    ) => {
      const existing = await db
        .select()
        .from(reviewPipelineTemplates)
        .where(
          and(
            eq(reviewPipelineTemplates.companyId, companyId),
            eq(reviewPipelineTemplates.teamId, teamId),
            eq(reviewPipelineTemplates.isDefault, true),
          ),
        )
        .then((rows) => rows[0] ?? null);

      if (existing) {
        const [updated] = await db
          .update(reviewPipelineTemplates)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(reviewPipelineTemplates.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(reviewPipelineTemplates)
        .values({
          companyId,
          teamId,
          name: data.name ?? "Default Review Pipeline",
          isDefault: true,
          enabled: data.enabled ?? true,
          steps: data.steps ?? [],
        })
        .returning();
      return created;
    },

    // --- Review Run lifecycle ---

    createRun: async (params: {
      companyId: string;
      workProductId: string;
      issueId: string;
      pipelineTemplateId: string;
      steps: ReviewStepConfig[];
      triggeredBy: "webhook" | "manual";
    }) => {
      // Cancel existing running/failed runs for same work product
      await db
        .update(reviewRuns)
        .set({ status: "cancelled", completedAt: new Date() })
        .where(
          and(
            eq(reviewRuns.workProductId, params.workProductId),
            inArray(reviewRuns.status, ["running", "failed"]),
          ),
        );

      // Create new run
      const [run] = await db
        .insert(reviewRuns)
        .values({
          companyId: params.companyId,
          workProductId: params.workProductId,
          issueId: params.issueId,
          pipelineTemplateId: params.pipelineTemplateId,
          status: "running",
          triggeredBy: params.triggeredBy,
        })
        .returning();

      // Create check records for each step
      const checks = await db
        .insert(reviewChecks)
        .values(
          params.steps.map((step) => ({
            reviewRunId: run.id,
            stepSlug: step.slug,
            stepName: step.name,
            stepType: step.type,
            executor: step.executor,
            status: "pending",
          })),
        )
        .returning();

      return { run, checks };
    },

    getRunsByIssue: async (companyId: string, issueId: string) => {
      const runs = await db
        .select()
        .from(reviewRuns)
        .where(
          and(eq(reviewRuns.companyId, companyId), eq(reviewRuns.issueId, issueId)),
        )
        .orderBy(reviewRuns.createdAt);

      const runIds = runs.map((r) => r.id);
      if (runIds.length === 0) return [];

      const checks = await db
        .select()
        .from(reviewChecks)
        .where(inArray(reviewChecks.reviewRunId, runIds))
        .orderBy(reviewChecks.createdAt);

      return runs.map((run) => ({
        ...run,
        checks: checks.filter((c) => c.reviewRunId === run.id),
      }));
    },

    getRunById: async (runId: string) => {
      const run = await db
        .select()
        .from(reviewRuns)
        .where(eq(reviewRuns.id, runId))
        .then((rows) => rows[0] ?? null);
      if (!run) throw notFound("Review run not found");

      const checks = await db
        .select()
        .from(reviewChecks)
        .where(eq(reviewChecks.reviewRunId, runId))
        .orderBy(reviewChecks.createdAt);

      return { ...run, checks };
    },

    // --- Check updates ---

    updateCheck: async (
      checkId: string,
      data: {
        status: string;
        summary?: string;
        details?: Record<string, unknown>;
        checkedByAgentId?: string;
        checkedByUserId?: string;
      },
    ) => {
      const [updated] = await db
        .update(reviewChecks)
        .set({
          ...data,
          checkedAt: new Date(),
        })
        .where(eq(reviewChecks.id, checkId))
        .returning();
      if (!updated) throw notFound("Review check not found");

      // Check if all checks in run are complete
      const allChecks = await db
        .select()
        .from(reviewChecks)
        .where(eq(reviewChecks.reviewRunId, updated.reviewRunId));

      const allDone = allChecks.every((c) =>
        ["passed", "failed", "skipped"].includes(c.status),
      );

      if (allDone) {
        const hasFailed = allChecks.some((c) => c.status === "failed");
        const runStatus = hasFailed ? "failed" : "passed";

        await db
          .update(reviewRuns)
          .set({ status: runStatus, completedAt: new Date() })
          .where(eq(reviewRuns.id, updated.reviewRunId));

        // Get run details for approval creation
        const run = await db
          .select()
          .from(reviewRuns)
          .where(eq(reviewRuns.id, updated.reviewRunId))
          .then((rows) => rows[0]!);

        const passedCount = allChecks.filter((c) => c.status === "passed").length;
        const failedCount = allChecks.filter((c) => c.status === "failed").length;

        // Create approval
        const [approval] = await db
          .insert(approvals)
          .values({
            companyId: run.companyId,
            type: "pr_review",
            status: "pending",
            payload: {
              reviewRunId: run.id,
              workProductId: run.workProductId,
              issueId: run.issueId,
              checkSummary: {
                passed: passedCount,
                failed: failedCount,
                total: allChecks.length,
              },
            },
          })
          .returning();

        // Link approval to issue
        await db.insert(issueApprovals).values({
          companyId: run.companyId,
          issueId: run.issueId,
          approvalId: approval.id,
        });

        return { check: updated, runCompleted: true, runStatus, approval };
      }

      return { check: updated, runCompleted: false };
    },

    // --- Approve / Reject ---

    approveRun: async (runId: string, userId: string) => {
      const run = await db
        .select()
        .from(reviewRuns)
        .where(eq(reviewRuns.id, runId))
        .then((rows) => rows[0] ?? null);
      if (!run) throw notFound("Review run not found");

      // Update linked approval
      const linkedApprovals = await db
        .select()
        .from(approvals)
        .where(eq(approvals.type, "pr_review"));

      const matchedApproval = linkedApprovals.find((a) => {
        const payload = a.payload as Record<string, unknown>;
        return payload.reviewRunId === runId;
      });

      if (matchedApproval) {
        await db
          .update(approvals)
          .set({
            status: "approved",
            decidedByUserId: userId,
            decidedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(approvals.id, matchedApproval.id));
      }

      return run;
    },

    rejectRun: async (runId: string, userId: string, decisionNote: string) => {
      const run = await db
        .select()
        .from(reviewRuns)
        .where(eq(reviewRuns.id, runId))
        .then((rows) => rows[0] ?? null);
      if (!run) throw notFound("Review run not found");

      const linkedApprovals = await db
        .select()
        .from(approvals)
        .where(eq(approvals.type, "pr_review"));

      const matchedApproval = linkedApprovals.find((a) => {
        const payload = a.payload as Record<string, unknown>;
        return payload.reviewRunId === runId;
      });

      if (matchedApproval) {
        await db
          .update(approvals)
          .set({
            status: "rejected",
            decidedByUserId: userId,
            decidedAt: new Date(),
            decisionNote,
            updatedAt: new Date(),
          })
          .where(eq(approvals.id, matchedApproval.id));
      }

      return run;
    },
  };
}
```

- [ ] **Step 2: services/index.ts에 export 추가**

```typescript
export { reviewPipelineService } from "./review-pipeline.js";
```

- [ ] **Step 3: 커밋**

```bash
git add server/src/services/review-pipeline.ts server/src/services/index.ts
git commit -m "feat(server): add review pipeline service (template CRUD, run lifecycle, approve/reject)"
```

---

## Task 8: Server 서비스 — review executors (Codex + Claude)

**Files:**
- Create: `server/src/services/review-executors.ts`
- Modify: `server/src/services/index.ts`

- [ ] **Step 1: review executors 서비스 생성**

```typescript
// server/src/services/review-executors.ts
import type { Db } from "@paperclipai/db";
import type { ReviewStepConfig } from "@paperclipai/shared";
import { issues } from "@paperclipai/db";
import { eq } from "drizzle-orm";

interface ExecutionContext {
  companyId: string;
  issueId: string;
  workProductId: string;
  prDiff?: string;
  prUrl?: string;
  prTitle?: string;
}

interface ExecutionResult {
  status: "passed" | "failed";
  summary: string;
  details: Record<string, unknown>;
}

export function reviewExecutorService(db: Db) {
  async function getIssueSummary(issueId: string): Promise<string> {
    const issue = await db
      .select()
      .from(issues)
      .where(eq(issues.id, issueId))
      .then((rows) => rows[0] ?? null);
    if (!issue) return "(issue not found)";
    return `Title: ${issue.title}\nDescription: ${issue.description ?? "(none)"}`;
  }

  async function executeCodex(
    step: ReviewStepConfig,
    ctx: ExecutionContext,
  ): Promise<ExecutionResult> {
    const prompt =
      (step.config?.prompt as string) ??
      "PR diff를 분석하여 코드 품질, 보안 취약점, 안티패턴을 검증하라. pass/fail 판정과 구체적 이슈 목록을 반환하라.";

    // TODO Phase 1: Codex CLI subprocess 호출
    // 현재는 placeholder — Codex CLI 연동 시 교체
    // const result = await spawnCodex({ mode: "review", prompt, diff: ctx.prDiff });
    return {
      status: "passed",
      summary: `[Codex] ${step.name}: 검증 대기 중 (Codex CLI 연동 예정)`,
      details: { executor: "codex", stepSlug: step.slug, pending: true },
    };
  }

  async function executeClaude(
    step: ReviewStepConfig,
    ctx: ExecutionContext,
  ): Promise<ExecutionResult> {
    const issueSummary = await getIssueSummary(ctx.issueId);

    // TODO Phase 1: Claude agent에게 검증 작업 위임
    // 현재는 placeholder — leader CLI 연동 시 교체
    return {
      status: "passed",
      summary: `[Claude] ${step.name}: 검증 대기 중 (Claude agent 연동 예정)`,
      details: {
        executor: "claude",
        stepSlug: step.slug,
        issueSummary,
        pending: true,
      },
    };
  }

  async function executeBuiltin(
    step: ReviewStepConfig,
    ctx: ExecutionContext,
  ): Promise<ExecutionResult> {
    const handler = step.config?.handler as string | undefined;

    switch (handler) {
      case "builtin:screenshot":
        // TODO Phase 2: headless browser screenshot 검증
        return {
          status: "passed",
          summary: `[Builtin] ${step.name}: 화면 검증 대기 중`,
          details: { executor: "builtin", handler, pending: true },
        };
      default:
        return {
          status: "skipped" as "passed",
          summary: `Unknown builtin handler: ${handler}`,
          details: { executor: "builtin", handler, skipped: true },
        };
    }
  }

  return {
    execute: async (
      step: ReviewStepConfig,
      ctx: ExecutionContext,
    ): Promise<ExecutionResult> => {
      switch (step.executor) {
        case "codex":
          return executeCodex(step, ctx);
        case "claude":
          return executeClaude(step, ctx);
        case "builtin":
          return executeBuiltin(step, ctx);
        case "manual":
          // Manual steps wait for human input — don't auto-execute
          return {
            status: "passed",
            summary: "수동 검증 대기 중",
            details: { executor: "manual", awaitingHuman: true },
          };
        default:
          return {
            status: "failed",
            summary: `Unknown executor: ${step.executor}`,
            details: {},
          };
      }
    },
  };
}
```

- [ ] **Step 2: services/index.ts에 export 추가**

```typescript
export { reviewExecutorService } from "./review-executors.js";
```

- [ ] **Step 3: 커밋**

```bash
git add server/src/services/review-executors.ts server/src/services/index.ts
git commit -m "feat(server): add review executor service (codex/claude/builtin placeholders)"
```

---

## Task 9: Server 라우트 — project environments API

**Files:**
- Create: `server/src/routes/project-environments.ts`
- Modify: `server/src/routes/index.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: project environments 라우트 생성**

```typescript
// server/src/routes/project-environments.ts
import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  createProjectEnvironmentSchema,
  updateProjectEnvironmentSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { projectEnvironmentService } from "../services/index.js";
import { assertCompanyAccess } from "./authz.js";

export function projectEnvironmentRoutes(db: Db) {
  const router = Router({ mergeParams: true });
  const svc = projectEnvironmentService(db);

  router.get("/", async (req, res) => {
    assertCompanyAccess(req);
    const { companyId, projectId } = req.params;
    const result = await svc.list(companyId, projectId);
    res.json(result);
  });

  router.post("/", validate(createProjectEnvironmentSchema), async (req, res) => {
    assertCompanyAccess(req);
    const { companyId, projectId } = req.params;
    const result = await svc.create(companyId, projectId, req.body);
    res.status(201).json(result);
  });

  router.put("/:envId", validate(updateProjectEnvironmentSchema), async (req, res) => {
    assertCompanyAccess(req);
    const { companyId, envId } = req.params;
    const result = await svc.update(companyId, envId, req.body);
    res.json(result);
  });

  router.delete("/:envId", async (req, res) => {
    assertCompanyAccess(req);
    const { companyId, envId } = req.params;
    await svc.remove(companyId, envId);
    res.status(204).end();
  });

  return router;
}
```

- [ ] **Step 2: routes/index.ts에 export 추가**

```typescript
export { projectEnvironmentRoutes } from "./project-environments.js";
```

- [ ] **Step 3: server/src/index.ts에 라우트 등록**

기존 라우트 등록 패턴을 찾아서 추가. `app.use("/api/companies/:companyId/projects/:projectId/environments", projectEnvironmentRoutes(db));` 형태로 등록.

- [ ] **Step 4: 커밋**

```bash
git add server/src/routes/project-environments.ts server/src/routes/index.ts server/src/index.ts
git commit -m "feat(server): add project environments API routes"
```

---

## Task 10: Server 라우트 — review pipeline API

**Files:**
- Create: `server/src/routes/review-pipeline.ts`
- Modify: `server/src/routes/index.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: review pipeline 라우트 생성**

```typescript
// server/src/routes/review-pipeline.ts
import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  updateReviewPipelineSchema,
  rejectReviewSchema,
  updateReviewCheckSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { reviewPipelineService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function reviewPipelineRoutes(db: Db) {
  const router = Router({ mergeParams: true });
  const svc = reviewPipelineService(db);

  // --- Team pipeline template ---

  router.get("/teams/:teamId/review-pipeline", async (req, res) => {
    assertCompanyAccess(req);
    const { companyId, teamId } = req.params;
    const result = await svc.getTeamPipeline(companyId, teamId);
    res.json(result);
  });

  router.put(
    "/teams/:teamId/review-pipeline",
    validate(updateReviewPipelineSchema),
    async (req, res) => {
      assertCompanyAccess(req);
      const { companyId, teamId } = req.params;
      const result = await svc.upsertTeamPipeline(companyId, teamId, req.body);
      res.json(result);
    },
  );

  // --- Review runs ---

  router.get("/issues/:issueId/reviews", async (req, res) => {
    assertCompanyAccess(req);
    const { companyId, issueId } = req.params;
    const result = await svc.getRunsByIssue(companyId, issueId);
    res.json(result);
  });

  router.get("/issues/:issueId/reviews/:runId", async (req, res) => {
    assertCompanyAccess(req);
    const { runId } = req.params;
    const result = await svc.getRunById(runId);
    res.json(result);
  });

  router.post("/issues/:issueId/reviews/:runId/approve", async (req, res) => {
    assertCompanyAccess(req);
    const { runId } = req.params;
    const actor = getActorInfo(req);
    const result = await svc.approveRun(runId, actor.actorId);
    res.json(result);
  });

  router.post(
    "/issues/:issueId/reviews/:runId/reject",
    validate(rejectReviewSchema),
    async (req, res) => {
      assertCompanyAccess(req);
      const { runId } = req.params;
      const actor = getActorInfo(req);
      const result = await svc.rejectRun(runId, actor.actorId, req.body.decisionNote);
      res.json(result);
    },
  );

  // --- Manual check update ---

  router.put(
    "/reviews/:runId/checks/:checkId",
    validate(updateReviewCheckSchema),
    async (req, res) => {
      assertCompanyAccess(req);
      const { checkId } = req.params;
      const actor = getActorInfo(req);
      const result = await svc.updateCheck(checkId, {
        ...req.body,
        checkedByUserId: actor.actorId,
      });
      res.json(result);
    },
  );

  return router;
}
```

- [ ] **Step 2: routes/index.ts에 export 추가**

```typescript
export { reviewPipelineRoutes } from "./review-pipeline.js";
```

- [ ] **Step 3: server/src/index.ts에 라우트 등록**

```typescript
app.use("/api/companies/:companyId", reviewPipelineRoutes(db));
```

- [ ] **Step 4: 커밋**

```bash
git add server/src/routes/review-pipeline.ts server/src/routes/index.ts server/src/index.ts
git commit -m "feat(server): add review pipeline API routes (template, runs, checks, approve/reject)"
```

---

## Task 11: GitHub webhook 확장 — review run 트리거

**Files:**
- Modify: `server/src/services/github-webhooks.ts`

- [ ] **Step 1: github-webhooks.ts 수정 — review run 트리거 추가**

`applyPullRequestEvent` 함수(또는 이슈 매칭 후 work_product upsert 하는 부분) 끝에 리뷰 파이프라인 트리거 로직 추가:

```typescript
// work_product upsert 후, opened/synchronize 이벤트일 때:
// 1. 이슈의 팀 조회
// 2. 팀의 review_pipeline_template 조회
// 3. enabled=true면 review_run 생성 + 이슈 상태 in_review 전환

import { reviewPipelineService } from "./review-pipeline.js";
import { reviewExecutorService } from "./review-executors.js";

// applyPullRequestEvent 내부, work_product upsert 후:
if (action === "opened" || action === "synchronize") {
  for (const matched of matchedIssues) {
    // 이슈의 팀 조회 (issues 테이블에 teamId가 있다면)
    const issue = matched.issue;
    if (!issue.teamId) continue;

    const pipeline = await reviewSvc.getTeamPipeline(companyId, issue.teamId);
    if (!pipeline || !pipeline.enabled || pipeline.steps.length === 0) continue;

    const steps = pipeline.steps as ReviewStepConfig[];

    // Create review run
    const { run, checks } = await reviewSvc.createRun({
      companyId,
      workProductId: matched.workProductId,
      issueId: issue.id,
      pipelineTemplateId: pipeline.id,
      steps,
      triggeredBy: "webhook",
    });

    // Update issue status to in_review
    await issueService.updateStatus(issue.id, "in_review");

    // Execute auto steps asynchronously
    void executeAutoSteps(run.id, checks, steps, {
      companyId,
      issueId: issue.id,
      workProductId: matched.workProductId,
      prUrl: prPayload.html_url,
      prTitle: prPayload.title,
    });
  }
}
```

이 코드는 기존 webhook 서비스의 구조에 맞게 통합해야 합니다. 정확한 삽입 위치는 `applyPullRequestEvent` 함수의 work_product upsert 이후.

- [ ] **Step 2: auto step 실행 함수 추가**

같은 파일 또는 review-pipeline 서비스에:

```typescript
async function executeAutoSteps(
  runId: string,
  checks: typeof reviewChecks.$inferSelect[],
  steps: ReviewStepConfig[],
  ctx: ExecutionContext,
) {
  const executors = reviewExecutorService(db);

  for (const check of checks) {
    const step = steps.find((s) => s.slug === check.stepSlug);
    if (!step || step.type === "manual") continue;

    // Update check to running
    await reviewSvc.updateCheck(check.id, { status: "running" });

    try {
      const result = await executors.execute(step, ctx);
      await reviewSvc.updateCheck(check.id, {
        status: result.status,
        summary: result.summary,
        details: result.details,
      });
    } catch (err) {
      await reviewSvc.updateCheck(check.id, {
        status: "failed",
        summary: `Execution error: ${err instanceof Error ? err.message : "unknown"}`,
        details: { error: true },
      });
    }
  }
}
```

- [ ] **Step 3: 커밋**

```bash
git add server/src/services/github-webhooks.ts
git commit -m "feat(server): trigger review pipeline on PR webhook events"
```

---

## Task 12: ApprovalCard — pr_review 타입 지원

**Files:**
- Modify: `ui/src/components/ApprovalCard.tsx`

- [ ] **Step 1: typeIcon과 typeLabel 맵에 pr_review 추가**

기존 `typeIcon` / `typeLabel` 맵을 찾아서 추가:

```typescript
// typeIcon 맵에 추가
pr_review: GitPullRequest, // lucide-react 아이콘

// typeLabel 맵에 추가
pr_review: "PR Review",
```

lucide-react에서 `GitPullRequest` import 추가.

- [ ] **Step 2: 커밋**

```bash
git add ui/src/components/ApprovalCard.tsx
git commit -m "feat(ui): add pr_review type to ApprovalCard"
```

---

## Task 13: UI API 클라이언트 — project environments + review pipeline

**Files:**
- Create: `ui/src/api/projectEnvironments.ts`
- Create: `ui/src/api/reviewPipeline.ts`
- Modify: `ui/src/lib/queryKeys.ts`

- [ ] **Step 1: project environments API 클라이언트 생성**

```typescript
// ui/src/api/projectEnvironments.ts
import { api } from "./client";

export interface ProjectEnvironment {
  id: string;
  companyId: string;
  projectId: string;
  name: string;
  slug: string;
  isDefault: boolean;
  config: {
    github?: { owner: string; repo: string; baseBranch: string; webhookSecret?: string };
    deploy?: { url?: string; healthEndpoint?: string };
    merge?: { method?: string; deleteSourceBranch?: boolean };
  };
  createdAt: string;
  updatedAt: string;
}

export const projectEnvironmentsApi = {
  list: (companyId: string, projectId: string) =>
    api.get<ProjectEnvironment[]>(
      `/companies/${companyId}/projects/${projectId}/environments`,
    ),
  create: (companyId: string, projectId: string, data: Record<string, unknown>) =>
    api.post<ProjectEnvironment>(
      `/companies/${companyId}/projects/${projectId}/environments`,
      data,
    ),
  update: (companyId: string, envId: string, data: Record<string, unknown>) =>
    api.put<ProjectEnvironment>(
      `/companies/${companyId}/projects/${companyId}/environments/${envId}`,
      data,
    ),
  remove: (companyId: string, projectId: string, envId: string) =>
    api.delete(`/companies/${companyId}/projects/${projectId}/environments/${envId}`),
};
```

- [ ] **Step 2: review pipeline API 클라이언트 생성**

```typescript
// ui/src/api/reviewPipeline.ts
import { api } from "./client";

export interface ReviewCheck {
  id: string;
  reviewRunId: string;
  stepSlug: string;
  stepName: string;
  stepType: string;
  executor: string;
  status: string;
  summary: string | null;
  details: Record<string, unknown> | null;
  checkedAt: string | null;
  createdAt: string;
}

export interface ReviewRun {
  id: string;
  companyId: string;
  workProductId: string;
  issueId: string;
  pipelineTemplateId: string;
  status: string;
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  checks: ReviewCheck[];
}

export interface ReviewPipelineTemplate {
  id: string;
  companyId: string;
  teamId: string | null;
  name: string;
  isDefault: boolean;
  enabled: boolean;
  steps: Array<{
    slug: string;
    name: string;
    type: string;
    executor: string;
    config?: Record<string, unknown>;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const reviewPipelineApi = {
  getTeamPipeline: (companyId: string, teamId: string) =>
    api.get<ReviewPipelineTemplate | null>(
      `/companies/${companyId}/teams/${teamId}/review-pipeline`,
    ),
  updateTeamPipeline: (companyId: string, teamId: string, data: Record<string, unknown>) =>
    api.put<ReviewPipelineTemplate>(
      `/companies/${companyId}/teams/${teamId}/review-pipeline`,
      data,
    ),
  getIssueReviews: (companyId: string, issueId: string) =>
    api.get<ReviewRun[]>(`/companies/${companyId}/issues/${issueId}/reviews`),
  getReviewRun: (companyId: string, issueId: string, runId: string) =>
    api.get<ReviewRun>(
      `/companies/${companyId}/issues/${issueId}/reviews/${runId}`,
    ),
  approveRun: (companyId: string, issueId: string, runId: string) =>
    api.post(`/companies/${companyId}/issues/${issueId}/reviews/${runId}/approve`, {}),
  rejectRun: (companyId: string, issueId: string, runId: string, decisionNote: string) =>
    api.post(`/companies/${companyId}/issues/${issueId}/reviews/${runId}/reject`, {
      decisionNote,
    }),
  updateCheck: (companyId: string, runId: string, checkId: string, data: Record<string, unknown>) =>
    api.put(`/companies/${companyId}/reviews/${runId}/checks/${checkId}`, data),
};
```

- [ ] **Step 3: queryKeys에 추가**

`ui/src/lib/queryKeys.ts`에 추가:

```typescript
projectEnvironments: {
  all: (companyId: string, projectId: string) =>
    ["projectEnvironments", companyId, projectId] as const,
},
reviewPipeline: {
  teamPipeline: (companyId: string, teamId: string) =>
    ["reviewPipeline", "team", companyId, teamId] as const,
  issueReviews: (companyId: string, issueId: string) =>
    ["reviewPipeline", "issueReviews", companyId, issueId] as const,
  run: (runId: string) => ["reviewPipeline", "run", runId] as const,
},
```

- [ ] **Step 4: 커밋**

```bash
git add ui/src/api/projectEnvironments.ts ui/src/api/reviewPipeline.ts ui/src/lib/queryKeys.ts
git commit -m "feat(ui): add API clients for project environments and review pipeline"
```

---

## Task 14: UI 컴포넌트 — ReviewCheckItem + ReviewRunCard

**Files:**
- Create: `ui/src/components/ReviewCheckItem.tsx`
- Create: `ui/src/components/ReviewRunCard.tsx`

- [ ] **Step 1: ReviewCheckItem 컴포넌트 생성**

```tsx
// ui/src/components/ReviewCheckItem.tsx
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { useState } from "react";
import type { ReviewCheck } from "../api/reviewPipeline";

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  passed: { icon: CheckCircle2, color: "text-green-500", label: "passed" },
  failed: { icon: XCircle, color: "text-red-500", label: "failed" },
  running: { icon: Loader2, color: "text-blue-500 animate-spin", label: "running" },
  pending: { icon: Clock, color: "text-muted-foreground", label: "pending" },
  skipped: { icon: Clock, color: "text-muted-foreground", label: "skipped" },
};

export function ReviewCheckItem({ check }: { check: ReviewCheck }) {
  const [open, setOpen] = useState(false);
  const config = statusConfig[check.status] ?? statusConfig.pending;
  const Icon = config.icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted/50">
        <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
        <span className="flex-1 text-left font-medium">{check.stepName}</span>
        <Badge variant="outline" className="text-xs">
          {check.executor}
        </Badge>
        <span className="text-xs text-muted-foreground">{config.label}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-10 pb-2">
        {check.summary && (
          <p className="text-sm text-muted-foreground">{check.summary}</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

- [ ] **Step 2: ReviewRunCard 컴포넌트 생성**

```tsx
// ui/src/components/ReviewRunCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ReviewCheckItem } from "./ReviewCheckItem";
import type { ReviewRun } from "../api/reviewPipeline";

interface ReviewRunCardProps {
  run: ReviewRun;
  prTitle?: string;
  prUrl?: string;
  onApprove?: () => void;
  onReject?: () => void;
  isApproving?: boolean;
}

export function ReviewRunCard({
  run,
  prTitle,
  prUrl,
  onApprove,
  onReject,
  isApproving,
}: ReviewRunCardProps) {
  const passedCount = run.checks.filter((c) => c.status === "passed").length;
  const totalCount = run.checks.length;
  const allDone = run.checks.every((c) =>
    ["passed", "failed", "skipped"].includes(c.status),
  );

  const statusColor =
    run.status === "passed"
      ? "text-green-600"
      : run.status === "failed"
        ? "text-red-600"
        : "text-blue-600";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {prTitle && <span>{prTitle}</span>}
          </CardTitle>
          {prUrl && (
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              GitHub에서 보기 ↗
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className={statusColor}>
            {run.status}
          </Badge>
          <span>
            {passedCount}/{totalCount} 통과
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {run.checks.map((check) => (
          <ReviewCheckItem key={check.id} check={check} />
        ))}

        {allDone && (
          <div className="flex gap-2 pt-3 border-t">
            <Button size="sm" onClick={onApprove} disabled={isApproving}>
              승인 + 머지
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} disabled={isApproving}>
              반려
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: 커밋**

```bash
git add ui/src/components/ReviewCheckItem.tsx ui/src/components/ReviewRunCard.tsx
git commit -m "feat(ui): add ReviewCheckItem and ReviewRunCard components"
```

---

## Task 15: UI — IssueDetail Review 탭

**Files:**
- Create: `ui/src/components/IssueReviewSection.tsx`
- Modify: `ui/src/pages/IssueDetail.tsx`

- [ ] **Step 1: IssueReviewSection 컴포넌트 생성**

```tsx
// ui/src/components/IssueReviewSection.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { reviewPipelineApi } from "../api/reviewPipeline";
import { ReviewRunCard } from "./ReviewRunCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { queryKeys } from "../lib/queryKeys";

interface IssueReviewSectionProps {
  companyId: string;
  issueId: string;
}

export function IssueReviewSection({ companyId, issueId }: IssueReviewSectionProps) {
  const queryClient = useQueryClient();
  const [rejectRunId, setRejectRunId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const { data: runs, isLoading } = useQuery({
    queryKey: queryKeys.reviewPipeline.issueReviews(companyId, issueId),
    queryFn: () => reviewPipelineApi.getIssueReviews(companyId, issueId),
  });

  const approveMutation = useMutation({
    mutationFn: (runId: string) =>
      reviewPipelineApi.approveRun(companyId, issueId, runId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reviewPipeline.issueReviews(companyId, issueId),
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ runId, note }: { runId: string; note: string }) =>
      reviewPipelineApi.rejectRun(companyId, issueId, runId, note),
    onSuccess: () => {
      setRejectRunId(null);
      setRejectNote("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.reviewPipeline.issueReviews(companyId, issueId),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        리뷰가 없습니다. PR이 올라오면 자동으로 리뷰가 시작됩니다.
      </div>
    );
  }

  // Show latest run first
  const sortedRuns = [...runs].reverse();

  return (
    <div className="space-y-4">
      {sortedRuns.map((run) => (
        <ReviewRunCard
          key={run.id}
          run={run}
          onApprove={() => approveMutation.mutate(run.id)}
          onReject={() => setRejectRunId(run.id)}
          isApproving={approveMutation.isPending}
        />
      ))}

      <Dialog open={!!rejectRunId} onOpenChange={() => setRejectRunId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PR 반려</DialogTitle>
          </DialogHeader>
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            rows={4}
            placeholder="반려 사유를 입력하세요..."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectRunId(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectNote.trim() || rejectMutation.isPending}
              onClick={() =>
                rejectRunId &&
                rejectMutation.mutate({ runId: rejectRunId, note: rejectNote })
              }
            >
              반려
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: IssueDetail.tsx에 Review 탭 추가**

`IssueDetail.tsx`의 기존 탭 목록에 "Review" 탭을 추가. 기존 탭 구조(Tabs/TabsList/TabsTrigger/TabsContent)를 따름.

```tsx
// import 추가
import { IssueReviewSection } from "../components/IssueReviewSection";

// TabsTrigger 추가 (기존 탭들 옆에)
<TabsTrigger value="review">Review</TabsTrigger>

// TabsContent 추가
<TabsContent value="review">
  <IssueReviewSection companyId={companyId} issueId={issueId} />
</TabsContent>
```

정확한 삽입 위치는 기존 탭 구조를 읽고 패턴에 맞게 삽입.

- [ ] **Step 3: 커밋**

```bash
git add ui/src/components/IssueReviewSection.tsx ui/src/pages/IssueDetail.tsx
git commit -m "feat(ui): add Review tab to issue detail page"
```

---

## Task 16: UI — 프로젝트 설정 Environments 탭

**Files:**
- Create: `ui/src/components/EnvironmentCard.tsx`
- Modify: 프로젝트 설정 페이지 (정확한 파일은 기존 코드 확인 필요)

- [ ] **Step 1: EnvironmentCard 컴포넌트 생성**

```tsx
// ui/src/components/EnvironmentCard.tsx
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { ProjectEnvironment } from "../api/projectEnvironments";

interface EnvironmentCardProps {
  env: ProjectEnvironment;
  onEdit: () => void;
  onDelete: () => void;
}

export function EnvironmentCard({ env, onEdit, onDelete }: EnvironmentCardProps) {
  const gh = env.config.github;
  const merge = env.config.merge;

  return (
    <Card>
      <CardContent className="flex items-start justify-between p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{env.name}</span>
            {env.isDefault && <Badge variant="secondary">default</Badge>}
          </div>
          {gh && (
            <p className="text-sm text-muted-foreground">
              GitHub: {gh.owner}/{gh.repo} · Branch: {gh.baseBranch}
            </p>
          )}
          {env.config.deploy?.url && (
            <p className="text-sm text-muted-foreground">
              Deploy: {env.config.deploy.url}
            </p>
          )}
          {merge && (
            <p className="text-xs text-muted-foreground">
              Merge: {merge.method ?? "squash"}
              {merge.deleteSourceBranch ? ", 소스 브랜치 삭제" : ""}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 프로젝트 설정 페이지에 Environments 탭 통합**

기존 프로젝트 설정 페이지의 탭 구조에 "Environments" 탭 추가. `useQuery`로 환경 목록 조회, `useMutation`으로 CRUD. `Dialog`로 추가/편집 모달.

정확한 삽입은 기존 프로젝트 설정 페이지 파일을 읽고 패턴에 맞게.

- [ ] **Step 3: 커밋**

```bash
git add ui/src/components/EnvironmentCard.tsx
git commit -m "feat(ui): add Environments tab to project settings"
```

---

## Task 17: UI — 팀 설정 Review Pipeline 탭

**Files:**
- Create: `ui/src/components/PipelineStepEditor.tsx`
- Modify: 팀 설정 페이지

- [ ] **Step 1: PipelineStepEditor 컴포넌트 생성**

```tsx
// ui/src/components/PipelineStepEditor.tsx
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Settings2, GripVertical, Trash2 } from "lucide-react";

interface PipelineStep {
  slug: string;
  name: string;
  type: string;
  executor: string;
  config?: Record<string, unknown>;
}

interface PipelineStepEditorProps {
  steps: PipelineStep[];
  onUpdate: (steps: PipelineStep[]) => void;
}

export function PipelineStepEditor({ steps, onUpdate }: PipelineStepEditorProps) {
  const removeStep = (index: number) => {
    const next = steps.filter((_, i) => i !== index);
    onUpdate(next);
  };

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <Card key={step.slug}>
          <CardContent className="flex items-center gap-3 p-3">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <span className="flex-1 text-sm font-medium">
              {i + 1}. {step.name}
            </span>
            <Badge variant="outline" className="text-xs">
              {step.type}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {step.executor}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeStep(i)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 팀 설정 페이지에 Review Pipeline 탭 통합**

팀 설정 페이지의 탭에 "Review Pipeline" 추가. `ToggleSwitch`로 리뷰 게이트 on/off, `PipelineStepEditor`로 스텝 관리, `Select`로 머지 방식. `useMutation`으로 저장.

정확한 삽입은 팀 설정 페이지 파일을 읽고 패턴에 맞게.

- [ ] **Step 3: 커밋**

```bash
git add ui/src/components/PipelineStepEditor.tsx
git commit -m "feat(ui): add Review Pipeline tab to team settings"
```

---

## Task 18: GitHub 머지 실행

**Files:**
- Modify: `server/src/services/review-pipeline.ts`

- [ ] **Step 1: approveRun에 GitHub 머지 로직 추가**

`approveRun` 메서드를 수정하여 승인 시 GitHub API로 PR 머지 실행:

```typescript
// approveRun 내부에 추가:

// 1. work_product에서 PR 정보 조회
const workProduct = await db
  .select()
  .from(issueWorkProducts)
  .where(eq(issueWorkProducts.id, run.workProductId))
  .then((rows) => rows[0] ?? null);

if (!workProduct || !workProduct.url) {
  throw unprocessable("Work product has no PR URL");
}

// 2. project_environment에서 GitHub 설정 조회
const envs = await db
  .select()
  .from(projectEnvironments)
  .where(eq(projectEnvironments.projectId, workProduct.projectId!))
  .then((rows) => rows.filter((e) => e.isDefault));

const env = envs[0];
const ghConfig = env?.config?.github;

if (ghConfig) {
  // 3. company_secrets에서 GitHub token 조회
  const tokenSecret = await db
    .select()
    .from(companySecrets)
    .where(
      and(
        eq(companySecrets.companyId, run.companyId),
        eq(companySecrets.name, "github_token"),
      ),
    )
    .then((rows) => rows[0] ?? null);

  if (tokenSecret?.value) {
    const prNumber = extractPrNumber(workProduct.url);
    const mergeMethod = env.config?.merge?.method ?? "squash";

    const response = await fetch(
      `https://api.github.com/repos/${ghConfig.owner}/${ghConfig.repo}/pulls/${prNumber}/merge`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenSecret.value}`,
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({ merge_method: mergeMethod }),
      },
    );

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw unprocessable(`GitHub merge failed: ${body.message ?? response.statusText}`);
    }

    // 4. work_product 상태 업데이트
    await db
      .update(issueWorkProducts)
      .set({ status: "merged" })
      .where(eq(issueWorkProducts.id, run.workProductId));

    // 5. 이슈 상태 done으로 전환
    // issueService.updateStatus(run.issueId, "done")와 동일한 로직
  }
}
```

- [ ] **Step 2: PR 번호 추출 헬퍼**

```typescript
function extractPrNumber(prUrl: string): number {
  const match = prUrl.match(/\/pull\/(\d+)/);
  if (!match) throw unprocessable(`Cannot extract PR number from URL: ${prUrl}`);
  return parseInt(match[1], 10);
}
```

- [ ] **Step 3: 커밋**

```bash
git add server/src/services/review-pipeline.ts
git commit -m "feat(server): add GitHub merge on PR approval"
```

---

## Task 19: 이슈 상태 게이트 — in_review + Done 보호

**Files:**
- Modify: `server/src/services/issues.ts`

- [ ] **Step 1: 이슈 상태 전환 시 리뷰 게이트 체크**

이슈의 status를 "done" (completed 카테고리)으로 변경하는 로직에 게이트 추가:

```typescript
// status를 completed 카테고리로 전환할 때:
// 1. 이슈의 팀 조회
// 2. 팀의 review_pipeline_template 조회
// 3. enabled=true이면 → 해당 이슈에 approved review_run이 있는지 확인
// 4. 없으면 전환 차단 (conflict 에러)

if (targetCategory === "completed") {
  const pipeline = await reviewPipelineSvc.getTeamPipeline(issue.companyId, issue.teamId);
  if (pipeline?.enabled) {
    const runs = await reviewPipelineSvc.getRunsByIssue(issue.companyId, issue.id);
    const hasApproved = runs.some((r) => r.status === "passed");
    // 리뷰 게이트를 통과한 승인이 있는지 확인
    // approve 플로우에서만 done으로 전환 가능
  }
}
```

정확한 삽입 위치는 issues 서비스의 status update 로직 내부.

- [ ] **Step 2: "in_review" 상태를 team_workflow_statuses에 추가할 수 있도록**

팀 워크플로우에 "in_review" 상태가 "started" 카테고리로 추가 가능하도록 안내. 기존 팀 설정 UI에서 워크플로우 상태를 추가할 수 있으므로 코드 변경 없이 데이터로 해결.

- [ ] **Step 3: 커밋**

```bash
git add server/src/services/issues.ts
git commit -m "feat(server): add review gate check on issue status transition to done"
```

---

## Task 20: 알림 — activity_log 이벤트 추가

**Files:**
- Modify: `server/src/services/review-pipeline.ts`
- Modify: `server/src/services/github-webhooks.ts`

- [ ] **Step 1: 리뷰 이벤트 로깅 추가**

review_run 생성, 완료, 승인, 반려 시 activity_log에 기록:

```typescript
import { logActivity } from "./index.js";

// review_run 생성 시:
await logActivity({
  companyId,
  actorType: "system",
  actorId: "system",
  action: "review_started",
  entityType: "issue",
  entityId: issueId,
  details: { reviewRunId: run.id, triggeredBy: "webhook" },
});

// review_run 완료 시:
await logActivity({
  companyId: run.companyId,
  actorType: "system",
  actorId: "system",
  action: run.status === "passed" ? "review_passed" : "review_failed",
  entityType: "issue",
  entityId: run.issueId,
  details: { reviewRunId: run.id },
});

// 승인 시:
await logActivity({
  companyId: run.companyId,
  actorType: "user",
  actorId: userId,
  action: "pr_approved",
  entityType: "issue",
  entityId: run.issueId,
  details: { reviewRunId: run.id },
});

// 반려 시:
await logActivity({
  companyId: run.companyId,
  actorType: "user",
  actorId: userId,
  action: "pr_rejected",
  entityType: "issue",
  entityId: run.issueId,
  details: { reviewRunId: run.id, decisionNote },
});
```

- [ ] **Step 2: Mission Room 전달**

승인/반려 결과를 이슈에 연결된 룸에 메시지로 전달. 기존 `room_messages` insert 패턴 사용:

```typescript
// 이슈에 연결된 룸 조회
const linkedRoom = await db
  .select()
  .from(roomIssues)
  .where(eq(roomIssues.issueId, run.issueId))
  .then((rows) => rows[0] ?? null);

if (linkedRoom) {
  await db.insert(roomMessages).values({
    roomId: linkedRoom.roomId,
    companyId: run.companyId,
    senderType: "system",
    body: `PR 리뷰 ${run.status === "passed" ? "통과" : "실패"}: ...`,
  });
}
```

정확한 삽입은 기존 룸 메시지 패턴 확인 후.

- [ ] **Step 3: 커밋**

```bash
git add server/src/services/review-pipeline.ts server/src/services/github-webhooks.ts
git commit -m "feat(server): add activity logging and room notifications for review events"
```

---

## Task 21: shared + db 빌드 확인 및 통합 테스트

- [ ] **Step 1: 전체 빌드**

```bash
pnpm --filter @paperclipai/shared build
pnpm --filter @paperclipai/db build
pnpm --filter @paperclipai/plugin-sdk build
```

Expected: 에러 없이 완료

- [ ] **Step 2: 마이그레이션 재확인**

```bash
pnpm --filter @paperclipai/db migrate
```

Expected: 마이그레이션 적용 확인

- [ ] **Step 3: 서버 시작 확인**

```bash
PORT=3101 pnpm dev
```

Expected: 서버 정상 시작, 새 라우트 등록 확인

- [ ] **Step 4: API 수동 테스트**

```bash
# 환경 생성 테스트
curl -X POST http://127.0.0.1:3101/api/companies/{companyId}/projects/{projectId}/environments \
  -H "Content-Type: application/json" \
  -d '{"name":"production","slug":"production","isDefault":true,"config":{"github":{"owner":"test","repo":"test","baseBranch":"main"}}}'

# 팀 파이프라인 조회
curl http://127.0.0.1:3101/api/companies/{companyId}/teams/{teamId}/review-pipeline
```

- [ ] **Step 5: 최종 커밋**

```bash
git add -A
git commit -m "feat: PR review gate — integration verification"
```
