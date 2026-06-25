import {
  MarkdownBlock,
  useHostContext,
  useHostNavigation,
  usePluginAction,
  usePluginData,
  usePluginStream,
  usePluginToast,
  type PluginHostContext,
  type PluginPageProps,
  type PluginSidebarProps,
} from "@paperclipai/plugin-sdk/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircleIcon,
  BotIcon,
  ChevronDownIcon,
  CheckCircle2Icon,
  CircleIcon,
  FileTextIcon,
  FolderOpenIcon,
  LinkIcon,
  Loader2Icon,
  PaperclipIcon,
  PlusIcon,
  SendIcon,
  XIcon,
} from "lucide-react";
import {
  ALLOWED_COMPANY_PREFIX,
  ACTION,
  DATA,
  PAGE_ROUTE,
  buildBlueprintWorkflowPanel,
  blueprintWorkflowLabel,
  blueprintPmChatChannel,
  isAllowedCompany,
  type BlueprintWorkflowStepStatus,
  type BlueprintPmChatStreamEvent,
  type CosBlueprintOverview,
  type ProjectDocumentSlotStatus,
  type ProjectDocumentSlotViewerRow,
  type ProjectDocumentSlotsView,
  type ProjectSummary,
} from "../contract.js";
import {
  Badge,
  Button,
  Input,
  cn,
} from "../../ui/primitives.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select.js";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  Message,
  MessageContent,
  PromptInput,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
  type PromptInputMessage,
} from "../../ui/ai.js";
import { Markdown } from "./Markdown.js";
import { FILE_ACCEPT, parseFile } from "./parse.js";
import type { ChangeEvent, DragEvent } from "react";

const sidebarItemBase =
  "flex items-center gap-2.5 px-3 py-2 pointer-coarse:py-1.5 text-[13px] font-medium transition-colors";

type WorkspaceTab = "deliverables" | "sources";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "error";
};

type SourceListItem = {
  id: string;
  row: ProjectDocumentSlotViewerRow;
  title: string;
  subtitle: string;
  documentRef: string | null;
  metadata: Record<string, unknown>;
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function objectList(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    : [];
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "업데이트 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: ProjectDocumentSlotStatus): string {
  switch (status) {
    case "ready":
      return "준비됨";
    case "approved":
      return "확정";
    case "draft":
      return "초안";
    case "n/a":
      return "제외";
    case "empty":
    default:
      return "비어 있음";
  }
}

function statusClass(status: ProjectDocumentSlotStatus): string {
  switch (status) {
    case "approved":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "ready":
      return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "draft":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "n/a":
      return "border-muted bg-muted text-muted-foreground";
    case "empty":
    default:
      return "border-border bg-background text-muted-foreground";
  }
}

function statusIcon(status: ProjectDocumentSlotStatus) {
  if (status === "approved" || status === "ready") return <CheckCircle2Icon className="h-4 w-4 text-emerald-600" />;
  if (status === "draft") return <Loader2Icon className="h-4 w-4 text-amber-600" />;
  return <CircleIcon className="h-4 w-4 text-muted-foreground" />;
}

function workflowStatusIcon(status: BlueprintWorkflowStepStatus) {
  if (status === "done") return <CheckCircle2Icon className="h-4 w-4 text-emerald-600" />;
  if (status === "active") return <Loader2Icon className="h-4 w-4 text-sky-600" />;
  if (status === "blocked") return <AlertCircleIcon className="h-4 w-4 text-amber-600" />;
  return <CircleIcon className="h-4 w-4 text-muted-foreground" />;
}

function workflowStatusLabel(status: BlueprintWorkflowStepStatus): string {
  switch (status) {
    case "done":
      return "완료";
    case "active":
      return "진행";
    case "blocked":
      return "대기";
    case "pending":
    default:
      return "예정";
  }
}

function workflowStatusClass(status: BlueprintWorkflowStepStatus): string {
  switch (status) {
    case "done":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "active":
      return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "blocked":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "pending":
    default:
      return "border-border bg-background text-muted-foreground";
  }
}

function messageId(): string {
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeSourceItems(rows: ProjectDocumentSlotViewerRow[]): SourceListItem[] {
  return rows.flatMap((row) => {
    const rowMetadata = metadataRecord(row.metadata);
    const sources = objectList(rowMetadata.sources);
    if (sources.length === 0) {
      const hasDocument = Boolean(row.document?.body?.trim());
      const hasArtifact = Boolean(row.artifact);
      const hasDocumentRefs = stringList(rowMetadata.documentRefs).length > 0;
      const hasRegisteredSlot = row.status !== "empty" && row.status !== "n/a";
      if (!hasDocument && !hasArtifact && !hasDocumentRefs && !hasRegisteredSlot) return [];
      return [{
        id: row.slotKey,
        row,
        title: row.title,
        subtitle: row.slotKey,
        documentRef: null,
        metadata: rowMetadata,
      }];
    }
    return sources.map((source, index) => {
      const title = stringValue(source.sourceTitle)
        ?? stringValue(source.fileName)
        ?? stringValue(source.documentRef)
        ?? `${row.title} #${index + 1}`;
      const documentRef = stringValue(source.documentRef);
      const type = stringValue(source.sourceType) ?? "source";
      const format = stringValue(source.sourceFormat) ?? "text";
      return {
        id: `${row.slotKey}:${documentRef ?? index}`,
        row,
        title,
        subtitle: `${type} / ${format}`,
        documentRef,
        metadata: source,
      };
    });
  });
}

function sourceBodyForItem(item: SourceListItem): string | null {
  const body = item.row.document?.body;
  if (!body) return null;
  const blocks = body.split(/\n\n---\n\n/g);
  const exact = blocks.find((block) => block.includes(`# 기획 자료(Source Material) - ${item.title}`));
  if (exact) return exact;
  const byRef = item.documentRef ? blocks.find((block) => block.includes(item.documentRef as string)) : null;
  return byRef ?? body;
}

function renderAgentText(event: BlueprintPmChatStreamEvent): string | null {
  if (event.type === "agent.event" && event.eventType === "chunk") return event.message ?? "";
  if (event.type === "agent.event" && event.eventType === "error") return event.message ?? "PM Agent 응답 중 오류가 발생했습니다.";
  if (event.type === "pm-chat.error") return event.message ?? "PM Agent 채팅을 시작하지 못했습니다.";
  return null;
}

function appendAssistantText(messages: ChatMessage[], assistantId: string, text: string, status?: ChatMessage["status"]): ChatMessage[] {
  return messages.map((message) => (
    message.id === assistantId
      ? { ...message, content: `${message.content}${text}`, status: status ?? message.status }
      : message
  ));
}

function replaceAssistantText(messages: ChatMessage[], assistantId: string, text: string, status?: ChatMessage["status"]): ChatMessage[] {
  return messages.map((message) => (
    message.id === assistantId
      ? { ...message, content: text, status }
      : message
  ));
}

function actionFailureMessage(value: unknown): string | null {
  const result = metadataRecord(value);
  if (result.ok !== false) return null;
  return stringValue(result.error) ?? "PM Agent 채팅 요청이 실패했습니다.";
}

function actionSuccessMessage(value: unknown): string | null {
  const result = metadataRecord(value);
  if (result.ok !== true) return null;
  if (stringValue(result.mode) !== "deliverable-command") return null;
  return stringValue(result.message);
}

function sourceTitleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").trim() || fileName;
}

function normalizeSourceUrlInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function sourceTitleFromUrl(value: string): string {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    const pathSegment = url.pathname.split("/").filter(Boolean).at(-1);
    const pathTitle = pathSegment
      ? decodeURIComponent(pathSegment).replace(/[-_]+/g, " ").trim()
      : "";
    return pathTitle ? `${host} - ${pathTitle}` : host;
  } catch {
    return value;
  }
}

function isFileDrag(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes("Files");
}

function shouldReanalyzeDeliverable(row: ProjectDocumentSlotViewerRow | null): boolean {
  if (!row) return false;
  if (row.status === "draft" || row.status === "ready" || row.status === "approved") return true;
  return Boolean(row.document?.body?.trim() || row.artifact);
}

export function CosBlueprintPage({ context: pageContext }: PluginPageProps) {
  const hostContext = useHostContext();
  const context = pageContext ?? hostContext;
  if (!isAllowedCompany(context?.companyId, context?.companyPrefix ?? ALLOWED_COMPANY_PREFIX)) {
    return null;
  }
  return <CosBlueprintWorkspace context={context} />;
}

function CosBlueprintWorkspace({ context }: { context: PluginHostContext }) {
  const companyId = context?.companyId ?? "";
  const hostProjectId = context?.projectId ?? "";
  const toast = usePluginToast();
  const chatWithPmAgent = usePluginAction(ACTION.chatWithPmAgent);
  const registerSourceDocument = usePluginAction(ACTION.registerSourceDocument);
  const writeScreenDocs = usePluginAction(ACTION.writeScreenDocs);
  const { data: projects, loading: projectsLoading } = usePluginData<ProjectSummary[]>(
    DATA.projects,
    companyId ? { companyId } : undefined,
  );
  const projectList = projects ?? [];
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const projectId = selectedProjectId || hostProjectId || projectList[0]?.id || "";
  const selectedProject = projectList.find((project) => project.id === projectId) ?? null;

  const { data: overview, refresh: refreshOverview } = usePluginData<CosBlueprintOverview>(
    DATA.overview,
    companyId ? (projectId ? { companyId, projectId } : { companyId }) : undefined,
  );
  const { data: slotView, loading: slotsLoading, error: slotsError, refresh: refreshSlots } = usePluginData<ProjectDocumentSlotsView>(
    DATA.projectDocumentSlots,
    companyId && projectId ? { companyId, projectId } : undefined,
  );

  useEffect(function selectInitialProject() {
    if (selectedProjectId || hostProjectId || !projectList[0]?.id) return;
    setSelectedProjectId(projectList[0].id);
  }, [hostProjectId, projectList, selectedProjectId]);

  const deliverableRows = useMemo(
    () => (slotView?.slots ?? []).filter((row) => row.slotGroup === "deliverable"),
    [slotView?.slots],
  );
  const sourceRows = useMemo(
    () => (slotView?.slots ?? []).filter((row) => row.slotGroup === "source"),
    [slotView?.slots],
  );
  const sourceItems = useMemo(() => makeSourceItems(sourceRows), [sourceRows]);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("deliverables");
  const [selectedDeliverableKey, setSelectedDeliverableKey] = useState("");
  const [selectedSourceKey, setSelectedSourceKey] = useState("");

  const firstDeliverableKey = deliverableRows[0]?.slotKey ?? "";
  const firstSourceKey = sourceItems[0]?.id ?? "";
  useEffect(function keepSelectedDeliverableValid() {
    if (selectedDeliverableKey && deliverableRows.some((row) => row.slotKey === selectedDeliverableKey)) return;
    setSelectedDeliverableKey(firstDeliverableKey);
  }, [deliverableRows, firstDeliverableKey, selectedDeliverableKey]);
  useEffect(function keepSelectedSourceValid() {
    if (selectedSourceKey && sourceItems.some((item) => item.id === selectedSourceKey)) return;
    setSelectedSourceKey(firstSourceKey);
  }, [firstSourceKey, selectedSourceKey, sourceItems]);

  const selectedDeliverable = deliverableRows.find((row) => row.slotKey === selectedDeliverableKey) ?? deliverableRows[0] ?? null;
  const selectedSource = sourceItems.find((item) => item.id === selectedSourceKey) ?? sourceItems[0] ?? null;
  const activeRowsCount = activeTab === "deliverables" ? deliverableRows.length : sourceItems.length;
  const sourceCount = sourceItems.length || overview?.state.sources.length || 0;
  const readyDeliverables = deliverableRows.filter((row) => row.status === "ready" || row.status === "approved").length;
  const missingDeliverables = deliverableRows.filter((row) => row.required && row.status === "empty").length;
  const fallbackWorkflowPanel = useMemo(
    () => buildBlueprintWorkflowPanel({
      slotKey: activeTab === "deliverables" ? selectedDeliverable?.slotKey : null,
      slotTitle: activeTab === "deliverables" ? selectedDeliverable?.title : null,
      rows: deliverableRows,
      sourceCount,
      state: overview?.state,
    }),
    [activeTab, deliverableRows, overview?.state, selectedDeliverable, sourceCount],
  );
  const workflowPanel = activeTab === "deliverables" && selectedDeliverable?.workflow
    ? selectedDeliverable.workflow
    : fallbackWorkflowPanel;
  const workflowDoneCount = workflowPanel.doneCount;
  const selectedDeliverableActionLabel = shouldReanalyzeDeliverable(selectedDeliverable) ? "재분석" : "분석";

  const streamChannel = blueprintPmChatChannel(companyId || "company", projectId || null);
  const pmStream = usePluginStream<BlueprintPmChatStreamEvent>(
    streamChannel,
    companyId ? { companyId } : undefined,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [sourceUploadCount, setSourceUploadCount] = useState(0);
  const [sourceUrlPanelOpen, setSourceUrlPanelOpen] = useState(false);
  const [sourceUrlValue, setSourceUrlValue] = useState("");
  const [draggingSourceFiles, setDraggingSourceFiles] = useState(false);
  const sourceFileInputRef = useRef<HTMLInputElement | null>(null);
  const sourceUrlInputRef = useRef<HTMLInputElement | null>(null);
  const processedEventCountRef = useRef(0);
  const activeAssistantIdRef = useRef<string | null>(null);
  const screenSlotSyncJobRef = useRef<string | null>(null);
  const sourceUploadBusy = sourceUploadCount > 0;

  useEffect(function resetChatForProject() {
    processedEventCountRef.current = 0;
    activeAssistantIdRef.current = null;
    setMessages([]);
    setSending(false);
  }, [streamChannel]);

  useEffect(function consumePmStreamEvents() {
    const nextEvents = pmStream.events.slice(processedEventCountRef.current);
    if (nextEvents.length === 0) return;
    processedEventCountRef.current = pmStream.events.length;

    for (const event of nextEvents) {
      if (event.type === "pm-chat.started" && !activeAssistantIdRef.current) {
        const assistantId = messageId();
        activeAssistantIdRef.current = assistantId;
        setMessages((current) => [...current, { id: assistantId, role: "assistant", content: "", status: "streaming" }]);
        continue;
      }
      const assistantId = activeAssistantIdRef.current;
      const text = renderAgentText(event);
      if (assistantId && text) {
        setMessages((current) => {
          if (event.type === "pm-chat.error" || event.eventType === "error") {
            return replaceAssistantText(current, assistantId, text, "error");
          }
          return appendAssistantText(current, assistantId, text, "streaming");
        });
      }
      if (event.type === "pm-chat.done" || event.type === "pm-chat.error") {
        setSending(false);
        if (assistantId) {
          setMessages((current) => current.map((message) => (
            message.id === assistantId ? { ...message, status: event.type === "pm-chat.error" ? "error" : undefined } : message
          )));
        }
        activeAssistantIdRef.current = null;
      }
    }
  }, [pmStream.events]);

  useEffect(function closeSourceUrlPanelOnEscape() {
    if (!sourceUrlPanelOpen) return undefined;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSourceUrlPanelOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sourceUrlPanelOpen]);

  useEffect(function focusSourceUrlInput() {
    if (sourceUrlPanelOpen) sourceUrlInputRef.current?.focus();
  }, [sourceUrlPanelOpen]);

  useEffect(function refreshWhileJobIsRunning() {
    if (overview?.state.job?.status !== "running") return undefined;
    const timer = window.setInterval(() => {
      refreshOverview();
      refreshSlots();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [overview?.state.job?.status, refreshOverview, refreshSlots]);

  useEffect(function syncGeneratedScreenDocsToSlot() {
    const job = overview?.state.job;
    if (!companyId || !projectId || !job || job.status !== "running" || job.kind !== "screens") return;
    if (!overview?.state.screenPlan) return;
    const jobKey = job.jobId || `${projectId}:${job.startedAt}`;
    if (screenSlotSyncJobRef.current === jobKey) return;
    screenSlotSyncJobRef.current = jobKey;
    void (async () => {
      try {
        await writeScreenDocs({ companyId, projectId });
        await Promise.all([refreshOverview(), refreshSlots()]);
      } catch (error) {
        screenSlotSyncJobRef.current = null;
        toast({
          tone: "error",
          title: "화면정의서 기록 실패",
          body: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, [companyId, overview?.state.job, overview?.state.screenPlan, projectId, refreshOverview, refreshSlots, toast, writeScreenDocs]);

  async function sendPmText(rawText: string) {
    if (!companyId || sending) return;
    const text = rawText.trim();
    if (!text) return;
    const assistantId = messageId();
    activeAssistantIdRef.current = assistantId;
    setMessages((current) => [
      ...current,
      { id: messageId(), role: "user", content: text },
      { id: assistantId, role: "assistant", content: "", status: "streaming" },
    ]);
    setSending(true);
    try {
      const result = await chatWithPmAgent({
        companyId,
        projectId: projectId || undefined,
        message: text,
        activeWorkspaceTab: activeTab,
        targetDeliverableSlotKey: activeTab === "deliverables" ? selectedDeliverable?.slotKey : undefined,
        targetDeliverableTitle: activeTab === "deliverables" ? selectedDeliverable?.title : undefined,
        targetSourceId: activeTab === "sources" ? selectedSource?.id : undefined,
        targetSourceTitle: activeTab === "sources" ? selectedSource?.title : undefined,
        targetSourceSlotKey: activeTab === "sources" ? selectedSource?.row.slotKey : undefined,
        targetSourceDocumentRef: activeTab === "sources" ? selectedSource?.documentRef ?? undefined : undefined,
      });
      const failureMessage = actionFailureMessage(result);
      if (failureMessage) {
        setSending(false);
        setMessages((current) => replaceAssistantText(current, assistantId, failureMessage, "error"));
        activeAssistantIdRef.current = null;
        return;
      }
      const successMessage = actionSuccessMessage(result);
      if (successMessage) {
        refreshOverview();
        refreshSlots();
        setSending(false);
        setMessages((current) => {
          const assistant = current.find((message) => message.id === assistantId);
          if (assistant?.content.trim()) {
            return current.map((message) => (
              message.id === assistantId ? { ...message, status: undefined } : message
            ));
          }
          return replaceAssistantText(current, assistantId, successMessage, undefined);
        });
        activeAssistantIdRef.current = null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setSending(false);
      setMessages((current) => replaceAssistantText(current, assistantId, errorMessage, "error"));
      toast({
        tone: "error",
        title: "PM Agent 채팅 실패",
        body: errorMessage,
      });
    }
  }

  async function submitPmMessage(message: PromptInputMessage) {
    await sendPmText(message.text);
  }

  async function registerSourceFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0 || sourceUploadBusy) return;
    if (!companyId || !projectId) {
      toast({
        tone: "error",
        title: "자료 등록 실패",
        body: "프로젝트를 먼저 선택하세요.",
      });
      return;
    }

    const userMessageId = messageId();
    const assistantId = messageId();
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content: `첨부파일 등록\n${files.map((file) => `- ${file.name}`).join("\n")}` },
      { id: assistantId, role: "assistant", content: "", status: "streaming" },
    ]);
    setActiveTab("sources");
    setSourceUploadCount(files.length);

    const failures: string[] = [];
    let registered = 0;
    let duplicate = 0;
    let lastSelectionKey: string | null = null;
    try {
      for (const file of files) {
        try {
          const parsed = await parseFile(file);
          const result = await registerSourceDocument({
            companyId,
            projectId,
            title: sourceTitleFromFileName(parsed.fileName),
            type: "external-plan",
            body: parsed.text,
            fileName: parsed.fileName,
            format: parsed.format,
          });
          const record = metadataRecord(result);
          if (record.ok !== true) {
            failures.push(`${file.name}: ${stringValue(record.message) ?? stringValue(record.error) ?? "등록 실패"}`);
            continue;
          }
          if (record.duplicate === true) duplicate += 1;
          else registered += 1;

          const slot = metadataRecord(record.slot);
          const slotKey = stringValue(slot.slotKey);
          const documentRef = stringValue(record.file);
          if (slotKey && documentRef) lastSelectionKey = `${slotKey}:${documentRef}`;
        } catch (error) {
          failures.push(`${file.name}: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          setSourceUploadCount((current) => Math.max(0, current - 1));
        }
      }
    } finally {
      refreshOverview();
      refreshSlots();
      if (lastSelectionKey) setSelectedSourceKey(lastSelectionKey);
    }

    const summary = [
      registered > 0 ? `신규 등록 ${registered}건` : null,
      duplicate > 0 ? `중복 ${duplicate}건` : null,
      failures.length > 0 ? `실패 ${failures.length}건` : null,
    ].filter((line): line is string => line !== null).join(", ");
    const assistantText = failures.length > 0
      ? `등록한 자료 반영 결과: ${summary}\n\n${failures.map((failure) => `- ${failure}`).join("\n")}`
      : `등록한 자료에 반영했습니다. ${summary}`;
    setMessages((current) => replaceAssistantText(
      current,
      assistantId,
      assistantText,
      failures.length > 0 && registered === 0 && duplicate === 0 ? "error" : undefined,
    ));
    toast({
      tone: failures.length > 0 && registered === 0 && duplicate === 0 ? "error" : "success",
      title: "자료 등록",
      body: summary || "처리할 파일이 없습니다.",
    });
  }

  async function registerSourceUrl(rawUrl: string) {
    if (sourceUploadBusy) return;
    if (!companyId || !projectId) {
      toast({
        tone: "error",
        title: "자료 등록 실패",
        body: "프로젝트를 먼저 선택하세요.",
      });
      return;
    }
    const url = normalizeSourceUrlInput(rawUrl);
    if (!url) {
      toast({
        tone: "error",
        title: "URL 등록 실패",
        body: "http 또는 https URL을 입력하세요.",
      });
      return;
    }

    const userMessageId = messageId();
    const assistantId = messageId();
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content: `URL 등록\n- ${url}` },
      { id: assistantId, role: "assistant", content: "", status: "streaming" },
    ]);
    setActiveTab("sources");
    setSourceUploadCount(1);

    let selectionKey: string | null = null;
    let assistantText = "";
    let assistantStatus: ChatMessage["status"];
    try {
      const result = await registerSourceDocument({
        companyId,
        projectId,
        title: sourceTitleFromUrl(url),
        type: "external-plan",
        url,
        format: "url",
        fetchUrl: true,
      });
      const record = metadataRecord(result);
      if (record.ok !== true) {
        assistantStatus = "error";
        assistantText = `등록한 자료 반영 결과: 실패 1건\n\n- ${stringValue(record.message) ?? stringValue(record.error) ?? "등록 실패"}`;
      } else {
        const slot = metadataRecord(record.slot);
        const slotKey = stringValue(slot.slotKey);
        const documentRef = stringValue(record.file);
        if (slotKey && documentRef) selectionKey = `${slotKey}:${documentRef}`;
        assistantText = record.duplicate === true
          ? "이미 등록된 URL입니다. 등록한 자료 목록에서 기존 항목을 확인하세요."
          : "URL을 등록한 자료에 반영했습니다.";
      }
    } catch (error) {
      assistantStatus = "error";
      assistantText = `등록한 자료 반영 결과: 실패 1건\n\n- ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      setSourceUploadCount((current) => Math.max(0, current - 1));
      refreshOverview();
      refreshSlots();
      if (selectionKey) setSelectedSourceKey(selectionKey);
    }

    setMessages((current) => replaceAssistantText(current, assistantId, assistantText, assistantStatus));
    toast({
      tone: assistantStatus === "error" ? "error" : "success",
      title: "자료 등록",
      body: assistantStatus === "error" ? "URL 등록에 실패했습니다." : "URL을 등록했습니다.",
    });
    if (assistantStatus !== "error") {
      setSourceUrlValue("");
      setSourceUrlPanelOpen(false);
    }
  }

  function handleSourceInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.currentTarget.files;
    if (files) void registerSourceFiles(files);
    event.currentTarget.value = "";
  }

  function handleSourceDrag(event: DragEvent<HTMLElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setDraggingSourceFiles(event.type !== "dragleave");
  }

  function handleSourceDrop(event: DragEvent<HTMLElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setDraggingSourceFiles(false);
    void registerSourceFiles(event.dataTransfer.files);
  }

  async function runSelectedDeliverableAnalysis() {
    if (!selectedDeliverable) return;
    const instruction = shouldReanalyzeDeliverable(selectedDeliverable)
      ? `${selectedDeliverable.title}을 재분석하고 다시 생성해줘.`
      : `${selectedDeliverable.title}을 분석하고 생성해줘.`;
    await sendPmText(instruction);
  }

  return (
    <div
      className="flex min-h-0 overflow-hidden bg-background text-foreground"
      data-testid="cos-blueprint-page"
      style={{ height: "calc(100dvh - 168px)", maxHeight: "calc(100dvh - 168px)" }}
    >
      <aside
        className={cn(
          "flex min-h-0 flex-col overflow-hidden border-r border-border bg-muted/20 transition-colors",
          draggingSourceFiles && "bg-accent/20 ring-2 ring-inset ring-primary/40",
        )}
        onDragEnter={handleSourceDrag}
        onDragLeave={handleSourceDrag}
        onDragOver={handleSourceDrag}
        onDrop={handleSourceDrop}
        style={{ width: 380, minWidth: 340, maxWidth: 420 }}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
            <BotIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">PM Agent</h1>
            <p className="truncate text-xs text-muted-foreground">
              {selectedProject?.name ?? "프로젝트 선택 필요"}
            </p>
          </div>
        </div>

        <Conversation>
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState
                className="p-4"
                description="등록 자료와 산출물 상태를 기준으로 다음 분석 작업을 요청할 수 있습니다."
                icon={<BotIcon className="h-6 w-6" />}
                title="PM Agent와 대화"
              />
            ) : messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent className={cn(message.status === "error" && "text-destructive")}>
                  {message.role === "assistant" && message.content ? (
                    <MarkdownBlock content={message.content} />
                  ) : message.content ? (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                      응답 대기 중
                    </span>
                  )}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
        </Conversation>

        <div className="shrink-0 border-t border-border px-4 py-3">
          <Task defaultOpen>
            <TaskTrigger title="작업상황">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <BotIcon className="h-4 w-4" />
                <span className="font-medium">작업상황</span>
                <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
              </span>
              <Button
                className="h-7 shrink-0 gap-1.5 px-2 text-xs"
                disabled={sending || !companyId || activeTab !== "deliverables" || !selectedDeliverable}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void runSelectedDeliverableAnalysis();
                }}
                size="sm"
                title={selectedDeliverable ? `${selectedDeliverable.title} ${selectedDeliverableActionLabel}` : "산출물을 선택하세요"}
                variant="secondary"
              >
                {sending ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <SendIcon className="h-3.5 w-3.5" />}
                {selectedDeliverableActionLabel}
              </Button>
            </TaskTrigger>
            <TaskContent>
              <div className="rounded-md border border-border bg-background/70 p-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{workflowPanel.title}</div>
                    <div className="mt-0.5 text-xs leading-4 text-muted-foreground">{workflowPanel.subtitle}</div>
                  </div>
                  <Badge>{workflowDoneCount}/{workflowPanel.totalCount}</Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{workflowPanel.owner}</span>
                  <span>등록 자료 {sourceCount}개</span>
                  <span>산출물 {readyDeliverables}/{deliverableRows.length}</span>
                  {missingDeliverables > 0 ? <span>누락 {missingDeliverables}개</span> : null}
                </div>
              </div>
              {workflowPanel.steps.map((step) => (
                <TaskItem key={step.key}>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">{workflowStatusIcon(step.status)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{step.title}</span>
                        <Badge className={workflowStatusClass(step.status)}>{workflowStatusLabel(step.status)}</Badge>
                      </span>
                      <span className="mt-0.5 block text-xs leading-4">{step.detail}</span>
                    </span>
                  </div>
                </TaskItem>
              ))}
            </TaskContent>
          </Task>
        </div>

        <div className="shrink-0 border-t border-border px-3 py-2">
          <PromptInput onSubmit={submitPmMessage}>
            <PromptInputBody>
              <PromptInputTextarea
                disabled={sending || !companyId}
                placeholder="PM Agent에게 다음 작업을 요청..."
                style={{ minHeight: 64 }}
              />
            </PromptInputBody>
            {sourceUrlPanelOpen ? (
              <div className="flex items-center gap-2 border-t border-border px-2 py-2">
                <Input
                  aria-label="URL 등록"
                  className="h-8 min-w-0 flex-1"
                  disabled={sourceUploadBusy || !companyId || !projectId}
                  onChange={(event) => setSourceUrlValue(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    void registerSourceUrl(sourceUrlValue);
                  }}
                  placeholder="Notion 공유 URL"
                  ref={sourceUrlInputRef}
                  type="url"
                  value={sourceUrlValue}
                />
                <Button
                  className="h-8 shrink-0 px-2 text-xs"
                  disabled={sourceUploadBusy || !sourceUrlValue.trim() || !companyId || !projectId}
                  onClick={() => void registerSourceUrl(sourceUrlValue)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  등록
                </Button>
                <Button
                  aria-label="URL 등록 닫기"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    setSourceUrlPanelOpen(false);
                    setSourceUrlValue("");
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            <PromptInputToolbar>
              <PromptInputTools>
                <Input
                  accept={FILE_ACCEPT}
                  className="hidden"
                  multiple
                  onChange={handleSourceInputChange}
                  ref={sourceFileInputRef}
                  type="file"
                />
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger
                    aria-label="자료 추가"
                    className="h-8 w-8"
                    disabled={sourceUploadBusy || !companyId || !projectId}
                    title="등록 자료 추가"
                  >
                    {sourceUploadBusy ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
                  </PromptInputActionMenuTrigger>
                  <PromptInputActionMenuContent side="top" className="w-40">
                    <PromptInputActionMenuItem
                      onSelect={() => sourceFileInputRef.current?.click()}
                    >
                      <PaperclipIcon className="h-4 w-4 text-muted-foreground" />
                      파일 첨부
                    </PromptInputActionMenuItem>
                    <PromptInputActionMenuItem
                      onSelect={() => setSourceUrlPanelOpen(true)}
                    >
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      URL 등록
                    </PromptInputActionMenuItem>
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <span className="px-1 text-xs text-muted-foreground">
                  {sourceUploadBusy ? `자료 등록 중 ${sourceUploadCount}건` : pmStream.connected ? "연결됨" : pmStream.connecting ? "연결 중" : "대기"}
                </span>
              </PromptInputTools>
              <PromptInputSubmit disabled={sending || !companyId} status={sending ? "streaming" : "ready"}>
                {sending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
              </PromptInputSubmit>
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FolderOpenIcon className="h-4 w-4" />
              Builder / Blueprint
            </div>
            <h2 className="mt-1 truncate text-base font-semibold">{selectedProject?.name ?? "프로젝트를 선택하세요"}</h2>
          </div>
          <ProjectSelector
            loading={projectsLoading}
            onProjectIdChange={setSelectedProjectId}
            projectId={projectId}
            projects={projectList}
          />
        </header>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-2">
          <div className="inline-flex rounded-md border border-border bg-muted/40 p-1">
            <Button
              className={cn("h-8 px-3", activeTab === "deliverables" && "bg-background shadow-sm")}
              onClick={() => setActiveTab("deliverables")}
              variant={activeTab === "deliverables" ? "secondary" : "ghost"}
            >
              산출물
            </Button>
            <Button
              className={cn("h-8 px-3", activeTab === "sources" && "bg-background shadow-sm")}
              onClick={() => setActiveTab("sources")}
              variant={activeTab === "sources" ? "secondary" : "ghost"}
            >
              등록한 자료
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge>{activeRowsCount}개 항목</Badge>
            {slotsLoading ? (
              <span className="inline-flex items-center gap-1">
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                불러오는 중
              </span>
            ) : null}
            {slotsError ? (
              <span className="inline-flex items-center gap-1 text-destructive">
                <AlertCircleIcon className="h-3.5 w-3.5" />
                슬롯 조회 실패
              </span>
            ) : null}
          </div>
        </div>

        <div
          className="grid min-h-0 flex-1 overflow-hidden"
          style={{ gridTemplateColumns: "320px minmax(0, 1fr)" }}
        >
          <nav className="min-h-0 overflow-y-auto border-r border-border bg-muted/10 p-3">
            {activeTab === "deliverables" ? (
              <div className="space-y-2">
                {deliverableRows.map((row) => (
                  <Button
                    className={cn(
                      "h-auto w-full justify-start rounded-md px-3 py-3 text-left",
                      selectedDeliverable?.slotKey === row.slotKey && "bg-accent text-accent-foreground",
                    )}
                    key={row.slotKey}
                    onClick={() => setSelectedDeliverableKey(row.slotKey)}
                    variant="ghost"
                  >
                    <span className="flex min-w-0 flex-1 items-start gap-2">
                      {statusIcon(row.status)}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{row.title}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">{row.slotKey}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {row.workflow?.label ?? blueprintWorkflowLabel(row.slotKey)}
                        </span>
                      </span>
                      <Badge className={statusClass(row.status)}>{statusLabel(row.status)}</Badge>
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {sourceItems.map((item) => (
                  <Button
                    className={cn(
                      "h-auto w-full justify-start rounded-md px-3 py-3 text-left",
                      selectedSource?.id === item.id && "bg-accent text-accent-foreground",
                    )}
                    key={item.id}
                    onClick={() => setSelectedSourceKey(item.id)}
                    variant="ghost"
                  >
                    <span className="flex min-w-0 flex-1 items-start gap-2">
                      <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">{item.subtitle}</span>
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </nav>

          <section className="min-h-0 overflow-y-auto">
            {activeTab === "deliverables" ? (
              selectedDeliverable ? (
                <DocumentPanel
                  body={selectedDeliverable.document?.body ?? null}
                  fallbackTitle="아직 생성된 산출물이 없습니다."
                  row={selectedDeliverable}
                  title={selectedDeliverable.title}
                />
              ) : (
                <EmptyWorkspace title="산출물이 없습니다." />
              )
            ) : selectedSource ? (
              <DocumentPanel
                body={sourceBodyForItem(selectedSource)}
                fallbackTitle="자료 본문을 찾을 수 없습니다."
                row={selectedSource.row}
                title={selectedSource.title}
              />
            ) : (
              <EmptyWorkspace title="등록한 자료가 없습니다." />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ProjectSelector({
  loading,
  onProjectIdChange,
  projectId,
  projects,
}: {
  loading: boolean;
  onProjectIdChange: (projectId: string) => void;
  projectId: string;
  projects: ProjectSummary[];
}) {
  const selectedProject = projects.find((project) => project.id === projectId) ?? null;
  const disabled = loading || projects.length === 0;

  return (
    <Select
      disabled={disabled}
      onValueChange={onProjectIdChange}
      value={projectId}
    >
      <SelectTrigger
        aria-label="프로젝트 선택"
        className="h-9 w-[min(360px,42vw)] max-w-full justify-between"
      >
        <SelectValue placeholder={loading ? "프로젝트 불러오는 중" : "프로젝트 없음"}>
          <span className="block min-w-0 truncate">
            {selectedProject?.name ?? (loading ? "프로젝트 불러오는 중" : "프로젝트 없음")}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="max-h-80 w-[var(--radix-select-trigger-width)]">
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <span className="block min-w-0 truncate">{project.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EmptyWorkspace({ title }: { title: string }) {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <FileTextIcon className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 text-sm font-medium">{title}</h3>
      </div>
    </div>
  );
}

function DocumentPanel({
  body,
  fallbackTitle,
  row,
  title,
}: {
  body: string | null;
  fallbackTitle: string;
  row: ProjectDocumentSlotViewerRow;
  title: string;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{row.slotKey} / {formatDate(row.updatedAt)}</p>
        </div>
        <Badge className={statusClass(row.status)}>{statusLabel(row.status)}</Badge>
      </div>
      {body ? (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <Markdown text={body} />
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <FileTextIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <h4 className="mt-3 text-sm font-medium">{fallbackTitle}</h4>
          {row.artifact ? (
            <p className="mt-2 text-xs text-muted-foreground">
              artifact: {row.artifact.originalFilename ?? row.artifact.artifactId}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function CosBlueprintSidebarItem({ context }: PluginSidebarProps) {
  const nav = useHostNavigation();
  const companyPrefix = context?.companyPrefix;
  const href = companyPrefix ? `/${companyPrefix}/${PAGE_ROUTE}` : `/${PAGE_ROUTE}`;
  if (!isAllowedCompany(context?.companyId, companyPrefix)) return null;

  return (
    <a
      {...nav.linkProps(href)}
      className={cn(
        sidebarItemBase,
        "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
      )}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-current text-[10px] font-semibold">B</span>
      <span>Blueprint</span>
    </a>
  );
}
