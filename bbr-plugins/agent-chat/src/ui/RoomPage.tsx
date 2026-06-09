import { useEffect, useMemo, useRef, useState } from "react";
import {
  useHostContext,
  useHostLocation,
  useHostNavigation,
  usePluginAction,
  usePluginData,
} from "@paperclipai/plugin-sdk/ui";
import { Markdown } from "./Markdown.js";
import { Avatar, Button, cn, fillCol, fillFixed, fillScroll, Input, Textarea, useFillHeight } from "./ui.js";
import { ProposalCard, type Proposal } from "./ProposalCard.js";

interface RoomMsg {
  id: string;
  authorKind: "human" | "agent" | "system";
  authorName: string;
  body: string;
  status: string;
}
interface Member {
  id: string;
  name: string;
  role: string | null;
}
interface RoomData {
  roomId: string | null;
  displayName?: string;
  kind?: string;
  members?: Member[];
  messages?: RoomMsg[];
  proposals?: Proposal[];
}
interface AgentRow {
  id: string;
  name: string;
  role: string | null;
}

function genId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `cm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function initial(name: string): string {
  return (name?.trim()?.[0] ?? "?").toUpperCase();
}
function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
    </svg>
  );
}

/** Page slot for routePath "room". No ?room= → a create form; otherwise the multi-agent room view. */
export function RoomPage() {
  const { companyId, userId } = useHostContext();
  const location = useHostLocation();
  const roomSlug = new URLSearchParams(location.search).get("room") ?? "";
  if (!roomSlug) return <CreateRoom />;
  return <RoomView key={roomSlug} roomSlug={roomSlug} companyId={companyId ?? ""} userId={userId ?? ""} />;
}

function CreateRoom() {
  const { companyId, companyPrefix } = useHostContext();
  const nav = useHostNavigation();
  const base = `/${companyPrefix ?? ""}/room`;
  const { data } = usePluginData<{ agents: AgentRow[] }>("listAgents", { companyId: companyId ?? "" });
  const createRoom = usePluginAction("createRoom");
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const agents = data?.agents ?? [];

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  async function create() {
    if (!name.trim() || picked.length === 0 || busy) return;
    setBusy(true);
    try {
      const res = (await createRoom({ companyId: companyId ?? "", displayName: name.trim(), kind: "group", memberAgentIds: picked })) as { slug?: string };
      if (res?.slug) nav.navigate(`${base}?room=${res.slug}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl text-foreground">
      <div className="mb-3 mt-2 text-base font-semibold">새 룸 만들기</div>
      <Input value={name} autoFocus placeholder="룸 이름 (예: 로드맵, 주간회의)" className="mb-4" onChange={(e) => setName(e.target.value)} />
      <div className="mb-2 text-xs text-muted-foreground">참여 에이전트 ({picked.length})</div>
      <div className="mb-4 flex flex-wrap gap-2">
        {agents.map((a) => {
          const on = picked.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-accent",
              )}
            >
              {a.name}
            </button>
          );
        })}
      </div>
      <Button size="sm" disabled={!name.trim() || picked.length === 0 || busy} onClick={() => void create()}>
        {busy ? "만드는 중…" : "룸 만들기"}
      </Button>
    </div>
  );
}

function RoomView({ roomSlug, companyId, userId }: { roomSlug: string; companyId: string; userId: string }) {
  const { data, refresh } = usePluginData<RoomData>("listRoomMessages", { companyId, roomSlug, userId });
  const sendRoomMessage = usePluginAction("sendRoomMessage");
  const applyProposal = usePluginAction("applyProposal");
  const discardProposal = usePluginAction("discardProposal");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busyProposal, setBusyProposal] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { ref: rootRef, height } = useFillHeight();

  const messages = data?.messages ?? [];
  const members = data?.members ?? [];
  const proposals = data?.proposals ?? [];
  const proposalsByMessage = new Map<string, Proposal[]>();
  const orphanProposals: Proposal[] = [];
  for (const p of proposals) {
    if (p.messageId) {
      const arr = proposalsByMessage.get(p.messageId) ?? [];
      arr.push(p);
      proposalsByMessage.set(p.messageId, arr);
    } else {
      orphanProposals.push(p);
    }
  }

  async function onApplyProposal(id: string, start: boolean) {
    setBusyProposal(id);
    try {
      await applyProposal({ proposalId: id, start });
      refresh();
    } catch {
      /* surfaced on next poll */
    } finally {
      setBusyProposal(null);
    }
  }
  async function onDiscardProposal(id: string) {
    setBusyProposal(id);
    try {
      await discardProposal({ proposalId: id });
      refresh();
    } catch {
      /* ignore */
    } finally {
      setBusyProposal(null);
    }
  }
  const awaiting = messages.some((m) => m.authorKind === "agent" && m.status === "streaming");
  const streaming = sending || awaiting;

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (!awaiting) return;
    const id = setInterval(() => refresh(), 2000);
    return () => clearInterval(id);
  }, [awaiting, refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, awaiting]);

  const memberNames = useMemo(() => members.map((m) => m.name).join(", "), [members]);

  async function onSend() {
    const body = text.trim();
    if (!body || streaming) return;
    setText("");
    setSending(true);
    try {
      await sendRoomMessage({ companyId, userId, roomSlug, text: body, clientMessageId: genId() });
      refresh();
    } catch {
      setText(body);
    } finally {
      setSending(false);
      taRef.current?.focus();
    }
  }
  const canSend = !streaming && text.trim().length > 0;

  return (
    <div ref={rootRef} className="text-foreground" style={fillCol(height)}>
      <div className="mb-1 border-b border-border bg-background px-1 pb-3 pt-2" style={fillFixed}>
        <div className="flex items-center gap-2">
          <span className="text-base text-muted-foreground">#</span>
          <span className="text-base font-semibold">{data?.displayName ?? roomSlug}</span>
          <span className="text-xs text-muted-foreground">{data?.kind ?? "group"}</span>
        </div>
        {memberNames && <div className="mt-0.5 text-xs text-muted-foreground">멤버: {memberNames}</div>}
      </div>

      <div className="flex flex-col gap-3 px-1 pb-3 pt-1" style={fillScroll}>
        {messages.map((m) => {
          if (m.authorKind === "system") {
            return (
              <div key={m.id} className="flex justify-center">
                <span className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">{m.body}</span>
              </div>
            );
          }
          const isHuman = m.authorKind === "human";
          const typing = m.authorKind === "agent" && m.status === "streaming";
          const cards = proposalsByMessage.get(m.id) ?? [];
          return (
            <div key={m.id} className="flex flex-col gap-2.5">
              <div className="flex gap-2.5">
                <Avatar size="default" className={isHuman ? "bg-muted text-foreground" : undefined}>
                  {isHuman ? "나" : initial(m.authorName)}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 text-xs text-muted-foreground">{m.authorName}</div>
                  {typing ? (
                    <div className="text-sm text-muted-foreground">응답 중…</div>
                  ) : (
                    <div className="text-sm">
                      <Markdown text={m.body} />
                    </div>
                  )}
                </div>
              </div>
              {cards.map((p) => (
                <ProposalCard
                  key={p.id}
                  p={p}
                  busy={busyProposal === p.id}
                  onApply={(start) => void onApplyProposal(p.id, start)}
                  onDiscard={() => void onDiscardProposal(p.id)}
                />
              ))}
            </div>
          );
        })}
        {orphanProposals.map((p) => (
          <ProposalCard
            key={p.id}
            p={p}
            busy={busyProposal === p.id}
            onApply={(start) => void onApplyProposal(p.id, start)}
            onDiscard={() => void onDiscardProposal(p.id)}
          />
        ))}
        <div ref={endRef} />
      </div>

      <div className="bg-background pt-2" style={fillFixed}>
        <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-2.5">
          <Textarea
            ref={taRef}
            value={text}
            rows={1}
            placeholder={streaming ? "에이전트 응답 대기 중…" : "메시지… (@이름 으로 특정 에이전트 지목)"}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
          />
          <div className="flex justify-end">
            <Button size="icon-sm" title="보내기" aria-label="보내기" disabled={!canSend} onClick={() => void onSend()}>
              <ArrowUpIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
