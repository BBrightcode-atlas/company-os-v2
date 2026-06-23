ALTER TABLE plugin_wireframes_a96aea0e66.wireframes
  ADD COLUMN IF NOT EXISTS screen_model jsonb NOT NULL DEFAULT '{"screens":[]}'::jsonb;
