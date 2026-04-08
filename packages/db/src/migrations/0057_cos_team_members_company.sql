-- Add company_id to team_members for cross-tenant isolation (P0 fix)
ALTER TABLE "team_members" ADD COLUMN "company_id" uuid;--> statement-breakpoint
-- Backfill from teams.company_id
UPDATE "team_members" tm SET "company_id" = t."company_id" FROM "teams" t WHERE tm."team_id" = t."id";--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_members_company_idx" ON "team_members" USING btree ("company_id");
