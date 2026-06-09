ALTER TABLE plugin_flotter_agent_chat_9c7a1f643c.chat_messages
  ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
