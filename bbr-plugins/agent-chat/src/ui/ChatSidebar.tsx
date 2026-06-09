import { useState } from "react";
import {
  useHostContext,
  useHostLocation,
  useHostNavigation,
  usePluginAction,
  usePluginData,
} from "@paperclipai/plugin-sdk/ui";
import { Avatar, cn } from "./ui.js";

interface AgentRow {
  id: string;
  name: string;
  role: string | null;
  status: string | null;
}

function initial(name: string): string {
  return (name?.trim()?.[0] ?? "?").toUpperCase();
}

/**
 * sidebar slot: "CHAT" (DM list) + "ROOMS" (group channels), rendered inside the host sidebar
 * alongside the global nav (Slack-style). Hovering a DM reveals an "×" to close it.
 */
export function ChatSidebar() {
  const { companyId, companyPrefix, userId } = useHostContext();
  const nav = useHostNavigation();
  const location = useHostLocation();
  const selected = new URLSearchParams(location.search).get("agent");
  const base = `/${companyPrefix ?? ""}/chat`;
  const { data, refresh } = usePluginData<{ threads: AgentRow[] }>("listThreads", {
    companyId: companyId ?? "",
    userId: userId ?? "",
  });
  const { data: agentsData } = usePluginData<{ agents: AgentRow[] }>("listAgents", {
    companyId: companyId ?? "",
  });
  const { data: roomsData, refresh: refreshRooms } = usePluginData<{ rooms: { slug: string; displayName: string; kind: string }[] }>(
    "listRooms",
    { companyId: companyId ?? "", userId: userId ?? "" },
  );
  const roomBase = `/${companyPrefix ?? ""}/room`;
  const selectedRoom = new URLSearchParams(location.search).get("room");
  const rooms = roomsData?.rooms ?? [];
  const closeThread = usePluginAction("closeThread");
  const closeRoom = usePluginAction("closeRoom");
  const [hovered, setHovered] = useState<string | null>(null);
  const threadList = data?.threads ?? [];

  // Surface the currently-open agent even before its thread row exists (Slack opens a DM on click).
  const threads = [...threadList];
  if (selected && !threads.some((t) => t.id === selected)) {
    const active = agentsData?.agents.find((a) => a.id === selected);
    if (active) threads.unshift(active);
  }

  async function onClose(agentId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await closeThread({ companyId: companyId ?? "", userId: userId ?? "", agentId });
      if (selected === agentId) nav.navigate(base);
      refresh();
    } catch {
      /* best-effort */
    }
  }

  async function onCloseRoom(roomSlug: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await closeRoom({ companyId: companyId ?? "", userId: userId ?? "", roomSlug });
      if (selectedRoom === roomSlug) nav.navigate(roomBase);
      refreshRooms();
    } catch {
      /* best-effort */
    }
  }

  const sectionHeader = "flex items-center justify-between px-3 pb-2 pt-3";
  const sectionLabel = "text-xs font-medium uppercase tracking-wide text-muted-foreground";
  const plusBtn = "inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground no-underline text-base leading-none";
  const row = "group/row flex items-center gap-2 rounded-md px-2 py-1.5 text-sm no-underline text-foreground hover:bg-accent/50";

  return (
    <div className="flex flex-col text-foreground">
      <div className={sectionHeader}>
        <span className={sectionLabel}>Chat</span>
        <a {...nav.linkProps(base)} title="새 메시지" className={plusBtn}>
          +
        </a>
      </div>
      <div className="flex flex-col gap-0.5 px-2">
        {threads.map((a) => {
          const isSel = a.id === selected;
          return (
            <a
              key={a.id}
              {...nav.linkProps(`${base}?agent=${a.id}`)}
              onMouseEnter={() => setHovered(a.id)}
              onMouseLeave={() => setHovered((h) => (h === a.id ? null : h))}
              className={cn(row, isSel && "bg-accent")}
            >
              <Avatar size="sm">{initial(a.name)}</Avatar>
              <span className="flex-1 truncate">{a.name}</span>
              {hovered === a.id && (
                <button
                  type="button"
                  title="채팅 닫기"
                  aria-label="채팅 닫기"
                  onClick={(e) => void onClose(a.id, e)}
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              )}
            </a>
          );
        })}
        {threads.length === 0 && (
          <a {...nav.linkProps(base)} className="px-2 py-1.5 text-xs text-muted-foreground no-underline">
            + 새 메시지
          </a>
        )}
      </div>

      <div className={sectionHeader}>
        <span className={sectionLabel}>Rooms</span>
        <a {...nav.linkProps(roomBase)} title="새 룸" className={plusBtn}>
          +
        </a>
      </div>
      <div className="flex flex-col gap-0.5 px-2">
        {rooms.map((r) => {
          const hoverKey = `room:${r.slug}`;
          return (
            <a
              key={r.slug}
              {...nav.linkProps(`${roomBase}?room=${r.slug}`)}
              onMouseEnter={() => setHovered(hoverKey)}
              onMouseLeave={() => setHovered((h) => (h === hoverKey ? null : h))}
              className={cn(row, r.slug === selectedRoom && "bg-accent")}
            >
              <span className="text-muted-foreground">#</span>
              <span className="flex-1 truncate">{r.displayName}</span>
              {hovered === hoverKey && (
                <button
                  type="button"
                  title="룸 닫기"
                  aria-label="룸 닫기"
                  onClick={(e) => void onCloseRoom(r.slug, e)}
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              )}
            </a>
          );
        })}
        {rooms.length === 0 && (
          <a {...nav.linkProps(roomBase)} className="px-2 py-1.5 text-xs text-muted-foreground no-underline">
            + 새 룸
          </a>
        )}
      </div>
    </div>
  );
}
