import { useEffect, useRef, useState } from "react";
import {
  useHostContext,
  useHostLocation,
  usePluginAction,
  usePluginData,
  usePluginStream,
} from "@paperclipai/plugin-sdk/ui";
import { Markdown } from "./Markdown.js";
import { NewMessageComposer } from "./NewMessageComposer.js";
import { Avatar, Button, cn, fillCol, fillFixed, fillScroll, Textarea, useFillHeight } from "./ui.js";
import { ProposalCard, type Proposal } from "./ProposalCard.js";

interface Attachment {
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
}
interface Msg {
  id: string;
  role: "human" | "agent";
  body: string;
  status: string;
  attachments?: Attachment[];
  messageType?: string;
}
interface ThreadData {
  threadId: string;
  status: string;
  messages: Msg[];
  proposals?: Proposal[];
}
interface StreamChunk {
  type: "chunk" | "done" | "error" | "timeout";
  runId: string;
}
interface SendResult {
  ok: boolean;
  reason?: string;
  channel?: string;
}

const MAX_FILES = 4;
const MAX_BYTES = 8 * 1024 * 1024;

// crypto.randomUUID() is undefined outside secure contexts (plain-HTTP tailnet hosts) — fall back.
function genId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `cm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
    </svg>
  );
}

function AttachmentView({ a }: { a: Attachment }) {
  if (a.mime?.startsWith("image/")) {
    return <img src={a.dataUrl} alt={a.name} className="block rounded-md border border-border" style={{ maxHeight: 224, maxWidth: 220 }} />;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
      <PaperclipIcon /> {a.name}
    </span>
  );
}

export function ChatPage() {
  const { companyId, userId } = useHostContext();
  const location = useHostLocation();
  const agentId = new URLSearchParams(location.search).get("agent") ?? "";

  const { data, refresh } = usePluginData<ThreadData>("listMessages", {
    companyId: companyId ?? "",
    userId: userId ?? "",
    agentId,
  });
  const { data: agentsData } = usePluginData<{ agents: { id: string; name: string; role: string | null }[] }>(
    "listAgents",
    { companyId: companyId ?? "" },
  );
  const agent = agentsData?.agents.find((a) => a.id === agentId);
  const agentName = agent?.name ?? "Agent";
  const sendMessage = usePluginAction("sendMessage");
  const applyProposal = usePluginAction("applyProposal");
  const discardProposal = usePluginAction("discardProposal");

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [channel, setChannel] = useState("");
  const [sending, setSending] = useState(false);
  const [busyProposal, setBusyProposal] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const messages = data?.messages ?? [];
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

  const awaitingReply = messages.some((m) => m.role === "agent" && m.status === "streaming");
  const streaming = sending || data?.status === "streaming" || awaitingReply;
  const canSend = !streaming && !!agentId && (text.trim().length > 0 || attachments.length > 0);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (!awaitingReply) return;
    const id = setInterval(() => refresh(), 2000);
    return () => clearInterval(id);
  }, [awaitingReply, refresh]);

  const stream = usePluginStream<StreamChunk>(channel);
  useEffect(() => {
    const last = stream.events[stream.events.length - 1];
    if (last && (last.type === "done" || last.type === "error" || last.type === "timeout")) {
      setChannel("");
      refresh();
    }
  }, [stream.events, refresh]);

  async function onPickFiles(list: FileList | null) {
    if (!list) return;
    const room = MAX_FILES - attachments.length;
    const picked = Array.from(list).slice(0, Math.max(0, room));
    const next: Attachment[] = [];
    for (const f of picked) {
      if (f.size > MAX_BYTES) continue;
      try {
        const dataUrl = await readAsDataUrl(f);
        next.push({ name: f.name, mime: f.type || "application/octet-stream", size: f.size, dataUrl });
      } catch {
        /* skip */
      }
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSend() {
    const body = text.trim();
    const atts = attachments;
    if ((!body && atts.length === 0) || streaming || !agentId) return;
    setText("");
    setAttachments([]);
    setSending(true);
    try {
      const res = (await sendMessage({
        companyId: companyId ?? "",
        userId: userId ?? "",
        agentId,
        text: body,
        attachments: atts,
        clientMessageId: genId(),
      })) as SendResult;
      if (res?.ok && res.channel) setChannel(res.channel);
      if (res && res.ok === false) {
        setText(body);
        setAttachments(atts);
      }
      refresh();
    } catch (err) {
      setText(body);
      setAttachments(atts);
      // eslint-disable-next-line no-console
      console.error("agent-chat sendMessage failed", err);
    } finally {
      setSending(false);
      taRef.current?.focus();
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

  const endRef = useRef<HTMLDivElement>(null);
  const { ref: rootRef, height } = useFillHeight();
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, awaitingReply]);

  if (!agentId) return <NewMessageComposer />;

  return (
    <div ref={rootRef} className="text-foreground" style={fillCol(height)}>
      {/* thread header */}
      <div className="mb-1 flex items-center gap-2.5 border-b border-border bg-background px-1 pb-3 pt-2" style={fillFixed}>
        <Avatar size="lg">{(agentName.trim()[0] ?? "?").toUpperCase()}</Avatar>
        <span className="text-sm font-semibold">{agentName}</span>
        {agent?.role && <span className="text-xs text-muted-foreground">{agent.role}</span>}
      </div>

      {/* messages */}
      <div className="flex flex-col gap-3 px-1 pb-3 pt-1" style={fillScroll}>
        {messages.map((m) => {
          if (m.messageType === "system") {
            return (
              <div key={m.id} className="flex justify-center">
                <span className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">{m.body}</span>
              </div>
            );
          }
          const isTyping = m.role === "agent" && m.status === "streaming";
          const atts = m.attachments ?? [];
          const cards = proposalsByMessage.get(m.id) ?? [];
          return (
            <div key={m.id} className="flex flex-col gap-2.5">
              <div className="flex gap-2.5">
                <Avatar size="default" className={m.role === "human" ? "bg-muted text-foreground" : undefined}>
                  {m.role === "human" ? "나" : (agentName.trim()[0] ?? "A").toUpperCase()}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 text-xs text-muted-foreground">{m.role === "human" ? "나" : agentName}</div>
                  {isTyping ? (
                    <div className="text-sm text-muted-foreground">응답 중…</div>
                  ) : m.role === "agent" ? (
                    <div className="text-sm">
                      <Markdown text={m.body} />
                    </div>
                  ) : (
                    m.body && <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                  )}
                  {atts.length > 0 && (
                    <div className={cn("flex flex-wrap gap-2", m.body && "mt-1.5")}>
                      {atts.map((a, i) => (
                        <AttachmentView key={i} a={a} />
                      ))}
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

      {/* composer */}
      <div className="bg-background pt-2" style={fillFixed}>
        <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => void onPickFiles(e.target.files)} />
        <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-2.5">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <span key={i} className={cn("relative inline-flex items-center gap-1.5 rounded-md border border-border text-xs", a.mime.startsWith("image/") ? "" : "px-2 py-1")}>
                  {a.mime.startsWith("image/") ? (
                    <img src={a.dataUrl} alt={a.name} className="block rounded-md object-cover" style={{ width: 56, height: 56 }} />
                  ) : (
                    <>
                      <PaperclipIcon />
                      <span className="truncate" style={{ maxWidth: 140 }}>{a.name}</span>
                    </>
                  )}
                  <button
                    type="button"
                    aria-label="첨부 제거"
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full border border-border bg-background text-xs leading-none text-foreground"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <Textarea
            ref={taRef}
            value={text}
            rows={1}
            placeholder={streaming ? "응답 대기 중…" : "메시지를 입력하세요…"}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
          />
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              title="파일 첨부"
              aria-label="파일 첨부"
              disabled={attachments.length >= MAX_FILES}
              onClick={() => fileRef.current?.click()}
              className="text-muted-foreground"
            >
              <PaperclipIcon />
            </Button>
            <Button size="icon-sm" title="보내기" aria-label="보내기" disabled={!canSend} onClick={() => void onSend()}>
              <ArrowUpIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
