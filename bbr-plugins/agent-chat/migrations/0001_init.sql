CREATE TABLE plugin_flotter_agent_chat_9c7a1f643c.chat_threads (
  id            uuid PRIMARY KEY,
  company_id    text NOT NULL,
  user_id       text NOT NULL,
  agent_id      text NOT NULL,
  task_key      text NOT NULL,
  session_id    text,
  status        text NOT NULL DEFAULT 'idle',
  last_run_id   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_threads_uq UNIQUE (company_id, user_id, agent_id)
);

CREATE TABLE plugin_flotter_agent_chat_9c7a1f643c.chat_messages (
  id                 uuid PRIMARY KEY,
  thread_id          uuid NOT NULL REFERENCES plugin_flotter_agent_chat_9c7a1f643c.chat_threads(id) ON DELETE CASCADE,
  seq                bigint NOT NULL,
  role               text NOT NULL,
  body               text NOT NULL DEFAULT '',
  status             text NOT NULL,
  client_message_id  text,
  run_id             text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_seq_uq UNIQUE (thread_id, seq)
);

CREATE UNIQUE INDEX chat_messages_client_uq
  ON plugin_flotter_agent_chat_9c7a1f643c.chat_messages (thread_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

CREATE UNIQUE INDEX chat_messages_run_uq
  ON plugin_flotter_agent_chat_9c7a1f643c.chat_messages (thread_id, run_id)
  WHERE run_id IS NOT NULL;

CREATE INDEX chat_messages_thread_seq
  ON plugin_flotter_agent_chat_9c7a1f643c.chat_messages (thread_id, seq);
