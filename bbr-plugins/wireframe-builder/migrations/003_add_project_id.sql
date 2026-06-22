ALTER TABLE plugin_wireframes_dfd3295c23.wireframes
  ADD COLUMN IF NOT EXISTS project_id uuid;

CREATE INDEX IF NOT EXISTS wireframes_project_status_idx
  ON plugin_wireframes_dfd3295c23.wireframes (company_id, project_id, status, created_at DESC);
