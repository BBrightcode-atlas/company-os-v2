CREATE TABLE "project_document_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"slot_key" text NOT NULL,
	"slot_group" text NOT NULL,
	"title" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'empty' NOT NULL,
	"document_id" uuid,
	"artifact_id" uuid,
	"content_type" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_document_slots" ADD CONSTRAINT "project_document_slots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_document_slots" ADD CONSTRAINT "project_document_slots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_document_slots" ADD CONSTRAINT "project_document_slots_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_document_slots" ADD CONSTRAINT "project_document_slots_artifact_id_assets_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_document_slots_company_project_key_uq" ON "project_document_slots" USING btree ("company_id","project_id","slot_key");--> statement-breakpoint
CREATE INDEX "project_document_slots_company_project_idx" ON "project_document_slots" USING btree ("company_id","project_id");--> statement-breakpoint
CREATE INDEX "project_document_slots_project_group_idx" ON "project_document_slots" USING btree ("project_id","slot_group");--> statement-breakpoint
CREATE INDEX "project_document_slots_document_idx" ON "project_document_slots" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "project_document_slots_artifact_idx" ON "project_document_slots" USING btree ("artifact_id");
