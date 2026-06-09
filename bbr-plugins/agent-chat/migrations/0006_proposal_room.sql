ALTER TABLE plugin_flotter_agent_chat_9c7a1f643c.chat_proposals
  ADD COLUMN room_id uuid REFERENCES plugin_flotter_agent_chat_9c7a1f643c.chat_rooms(id) ON DELETE CASCADE;

CREATE INDEX chat_proposals_room ON plugin_flotter_agent_chat_9c7a1f643c.chat_proposals (room_id, created_at);
