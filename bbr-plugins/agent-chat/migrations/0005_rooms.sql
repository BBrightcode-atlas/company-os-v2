CREATE TABLE plugin_flotter_agent_chat_9c7a1f643c.chat_rooms (
  id            uuid PRIMARY KEY,
  company_id    text NOT NULL,
  slug          text NOT NULL,
  display_name  text NOT NULL,
  kind          text NOT NULL DEFAULT 'group',
  created_by_user_id text,
  hidden        boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_rooms_uq UNIQUE (company_id, slug)
);

CREATE TABLE plugin_flotter_agent_chat_9c7a1f643c.chat_room_members (
  room_id    uuid NOT NULL REFERENCES plugin_flotter_agent_chat_9c7a1f643c.chat_rooms(id) ON DELETE CASCADE,
  agent_id   text NOT NULL,
  added_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, agent_id)
);

CREATE TABLE plugin_flotter_agent_chat_9c7a1f643c.chat_room_messages (
  id                uuid PRIMARY KEY,
  room_id           uuid NOT NULL REFERENCES plugin_flotter_agent_chat_9c7a1f643c.chat_rooms(id) ON DELETE CASCADE,
  seq               bigint NOT NULL,
  author_kind       text NOT NULL,
  author_agent_id   text,
  author_user_id    text,
  body              text NOT NULL DEFAULT '',
  status            text NOT NULL,
  client_message_id text,
  run_id            text,
  message_type      text NOT NULL DEFAULT 'text',
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_room_messages_seq_uq UNIQUE (room_id, seq)
);

CREATE UNIQUE INDEX chat_room_messages_client_uq
  ON plugin_flotter_agent_chat_9c7a1f643c.chat_room_messages (room_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

CREATE INDEX chat_room_messages_room_seq
  ON plugin_flotter_agent_chat_9c7a1f643c.chat_room_messages (room_id, seq);
