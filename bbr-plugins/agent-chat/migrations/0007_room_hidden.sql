-- Per-user room close (mirrors per-user DM close). A room is company-wide, so closing it
-- from one user's sidebar must not remove it for everyone — hide it per (room, user) instead
-- of toggling the shared chat_rooms.hidden flag. Reopening a room deletes its hidden row.
CREATE TABLE plugin_flotter_agent_chat_9c7a1f643c.chat_room_hidden (
  room_id    uuid NOT NULL REFERENCES plugin_flotter_agent_chat_9c7a1f643c.chat_rooms(id) ON DELETE CASCADE,
  user_id    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
