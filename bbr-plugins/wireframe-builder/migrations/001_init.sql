CREATE TABLE IF NOT EXISTS plugin_wireframes_dfd3295c23.wireframes (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  spec_doc text NOT NULL DEFAULT '',
  screen_doc text NOT NULL DEFAULT '',
  reference_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  html text,
  status text NOT NULL DEFAULT 'draft',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wireframes_company_status_idx
  ON plugin_wireframes_dfd3295c23.wireframes (company_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS plugin_wireframes_dfd3295c23.wireframe_comments (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  wireframe_id uuid NOT NULL,
  author_type text NOT NULL DEFAULT 'user',
  author_user_id uuid,
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'comment',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wireframe_comments_thread_idx
  ON plugin_wireframes_dfd3295c23.wireframe_comments (company_id, wireframe_id, created_at ASC);
