ALTER TABLE plugin_flotter_agent_chat_9c7a1f643c.chat_messages
  ADD COLUMN message_type text NOT NULL DEFAULT 'text';

ALTER TABLE plugin_flotter_agent_chat_9c7a1f643c.chat_messages
  ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE plugin_flotter_agent_chat_9c7a1f643c.chat_proposals (
  id            uuid PRIMARY KEY,
  thread_id     uuid REFERENCES plugin_flotter_agent_chat_9c7a1f643c.chat_threads(id) ON DELETE CASCADE,
  message_id    uuid,
  company_id    text NOT NULL,
  user_id       text NOT NULL,
  kind          text NOT NULL,
  title         text NOT NULL DEFAULT '',
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status        text NOT NULL DEFAULT 'pending',
  applied_result jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_proposals_thread ON plugin_flotter_agent_chat_9c7a1f643c.chat_proposals (thread_id, created_at);
