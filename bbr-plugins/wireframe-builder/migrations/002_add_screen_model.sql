ALTER TABLE plugin_wireframes_dfd3295c23.wireframes
  ADD COLUMN IF NOT EXISTS screen_model jsonb NOT NULL DEFAULT '{"screens":[]}'::jsonb;
