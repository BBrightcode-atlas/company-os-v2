-- 0071: PR review gate tables
-- project_environments, review_pipeline_templates, review_runs, review_checks

CREATE TABLE IF NOT EXISTS "project_environments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_pipeline_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"team_id" uuid,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"steps" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"work_product_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"pipeline_template_id" uuid NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"triggered_by" text DEFAULT 'webhook' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_run_id" uuid NOT NULL,
	"step_slug" text NOT NULL,
	"step_name" text NOT NULL,
	"step_type" text NOT NULL,
	"executor" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"summary" text,
	"details" jsonb,
	"checked_by_agent_id" uuid,
	"checked_by_user_id" text,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_environments" ADD CONSTRAINT "project_environments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_environments" ADD CONSTRAINT "project_environments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_pipeline_templates" ADD CONSTRAINT "review_pipeline_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_pipeline_templates" ADD CONSTRAINT "review_pipeline_templates_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_runs" ADD CONSTRAINT "review_runs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_runs" ADD CONSTRAINT "review_runs_work_product_id_issue_work_products_id_fk" FOREIGN KEY ("work_product_id") REFERENCES "public"."issue_work_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_runs" ADD CONSTRAINT "review_runs_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_runs" ADD CONSTRAINT "review_runs_pipeline_template_id_review_pipeline_templates_id_fk" FOREIGN KEY ("pipeline_template_id") REFERENCES "public"."review_pipeline_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_checks" ADD CONSTRAINT "review_checks_review_run_id_review_runs_id_fk" FOREIGN KEY ("review_run_id") REFERENCES "public"."review_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_checks" ADD CONSTRAINT "review_checks_checked_by_agent_id_agents_id_fk" FOREIGN KEY ("checked_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_environments_company_project_idx" ON "project_environments" USING btree ("company_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_environments_project_slug_uniq" ON "project_environments" USING btree ("project_id","slug");--> statement-breakpoint
CREATE INDEX "review_pipeline_templates_company_team_idx" ON "review_pipeline_templates" USING btree ("company_id","team_id");--> statement-breakpoint
CREATE INDEX "review_runs_company_status_idx" ON "review_runs" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "review_runs_work_product_idx" ON "review_runs" USING btree ("work_product_id");--> statement-breakpoint
CREATE INDEX "review_runs_issue_idx" ON "review_runs" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "review_checks_review_run_idx" ON "review_checks" USING btree ("review_run_id");
