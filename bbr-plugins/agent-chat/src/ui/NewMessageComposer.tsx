import { useMemo, useState } from "react";
import { useHostContext, useHostNavigation, usePluginData } from "@paperclipai/plugin-sdk/ui";
import { Avatar, Input } from "./ui.js";

interface AgentRow {
  id: string;
  name: string;
  role: string | null;
}

function initial(name: string): string {
  return (name?.trim()?.[0] ?? "?").toUpperCase();
}

/** Slack-style "new message" composer: pick a target agent to open a DM. */
export function NewMessageComposer() {
  const { companyId, companyPrefix } = useHostContext();
  const nav = useHostNavigation();
  const base = `/${companyPrefix ?? ""}/chat`;
  const [query, setQuery] = useState("");
  const { data, loading } = usePluginData<{ agents: AgentRow[] }>("listAgents", {
    companyId: companyId ?? "",
  });
  const agents = data?.agents ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) => a.name.toLowerCase().includes(q) || (a.role ?? "").toLowerCase().includes(q));
  }, [agents, query]);

  return (
    <div className="flex h-full flex-col text-foreground">
      <div className="px-1 pb-2 pt-2">
        <div className="mb-3 text-base font-semibold">새 메시지</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">대상:</span>
          <Input value={query} autoFocus placeholder="에이전트 이름 검색…" onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 overflow-auto px-1 pb-3">
        {loading && <div className="px-2 py-2 text-xs text-muted-foreground">Loading…</div>}
        {filtered.map((a) => (
          <a
            key={a.id}
            {...nav.linkProps(`${base}?agent=${a.id}`)}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm no-underline text-foreground hover:bg-accent/50"
          >
            <Avatar size="default">{initial(a.name)}</Avatar>
            <span className="flex-1 truncate">{a.name}</span>
            {a.role && <span className="text-xs text-muted-foreground">{a.role}</span>}
          </a>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="px-2 py-2 text-xs text-muted-foreground">결과 없음</div>
        )}
      </div>
    </div>
  );
}
