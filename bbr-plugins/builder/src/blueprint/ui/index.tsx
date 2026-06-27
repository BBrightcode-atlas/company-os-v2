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
  BookOpenIcon,
  BotIcon,
  ChevronDownIcon,
  CheckCircle2Icon,
  CircleIcon,
  EyeIcon,
  FileTextIcon,
  FigmaIcon,
  FolderOpenIcon,
  LinkIcon,
  Loader2Icon,
  Maximize2Icon,
  Minimize2Icon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  SendIcon,
  SettingsIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import {
  ALLOWED_COMPANY_PREFIX,
  ACTION,
  DATA,
  PAGE_ROUTE,
  PRODUCT_BUILDER_BASE_PACKAGE_OPTIONS,
  buildBlueprintWorkflowPanel,
  buildGraphFromState,
  blueprintWorkflowLabel,
  blueprintPmChatChannel,
  isAllowedCompany,
  normalizeProductBuilderBasePackageKeys,
  type BlueprintWorkflowStepStatus,
  type BlueprintPmChatStreamEvent,
  type CosBlueprintOverview,
  type ProductBuilderBasePackageKey,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog.js";
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
import { BUILDER_MARKDOWN_CONTENT_CLASS, MarkdownEditor } from "./MarkdownEditor.js";
import { FILE_ACCEPT, parseFile, sourceBodyForRenderedSourceItem } from "./parse.js";
import { BlueprintGraphView } from "./BlueprintGraphView.js";
import type { ChangeEvent, DragEvent, ReactNode } from "react";

const sidebarItemBase =
  "flex items-center gap-2.5 px-3 py-2 pointer-coarse:py-1.5 text-[13px] font-medium transition-colors";

type WorkspaceTab = "settings" | "deliverables" | "sources" | "graph";
type SourceUrlPanelMode = "url" | "notion";

// Figma mcp:connect 토큰은 OS별로 다른 곳에 저장된다(Claude Code 기준):
//   macOS=키체인, Linux=~/.claude/.credentials.json, Windows=%USERPROFILE%\.claude\.credentials.json.
// 각 OS에서 access 토큰을 출력하는 복붙용 명령.
const FIGMA_TOKEN_CMDS: Array<{ os: string; cmd: string }> = [
  {
    os: "macOS",
    cmd: `security find-generic-password -s "Claude Code-credentials" -w | python3 -c 'import sys,json;d=json.load(sys.stdin)["mcpOAuth"];print(next(v["accessToken"] for k,v in d.items() if k.startswith("figma")))'`,
  },
  {
    os: "Linux",
    cmd: `python3 -c 'import json,os;d=json.load(open(os.path.expanduser("~/.claude/.credentials.json")))["mcpOAuth"];print(next(v["accessToken"] for k,v in d.items() if k.startswith("figma")))'`,
  },
  {
    os: "Windows (PowerShell)",
    cmd: `(Get-Content "$env:USERPROFILE\\.claude\\.credentials.json" | ConvertFrom-Json).mcpOAuth.PSObject.Properties | ? {$_.Name -like "figma*"} | % {$_.Value.accessToken}`,
  },
];

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

type PmChatTargetOverride = Partial<{
  activeWorkspaceTab: "deliverables" | "sources" | "unknown";
  targetDeliverableSlotKey: string;
  targetDeliverableTitle: string;
  targetSourceId: string;
  targetSourceTitle: string;
  targetSourceSlotKey: string;
  targetSourceDocumentRef: string;
}>;

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
  return sourceBodyForRenderedSourceItem(body, item.title, item.documentRef ?? undefined, {
    format: stringValue(item.metadata.sourceFormat) ?? stringValue(item.row.metadata?.sourceFormat),
    intakeWorkflow: stringValue(item.metadata.sourceIntakeWorkflow) ?? stringValue(item.row.metadata?.sourceIntakeWorkflow),
  });
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

function deliverableAnalysisLabel(row: ProjectDocumentSlotViewerRow | null): string {
  return shouldReanalyzeDeliverable(row) ? "재분석" : "분석";
}

function documentSaveKey(row: ProjectDocumentSlotViewerRow, source?: SourceListItem | null): string {
  return source ? `${row.slotKey}:${source.documentRef ?? source.id}` : row.slotKey;
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
  const reanalyzeSourceDocument = usePluginAction(ACTION.reanalyzeSourceDocument);
  const deleteSourceDocument = usePluginAction(ACTION.deleteSourceDocument);
  const purgeProject = usePluginAction(ACTION.purgeProject);
  const purgeProjectDeliverables = usePluginAction(ACTION.purgeProjectDeliverables);
  const saveProjectDocumentSlot = usePluginAction(ACTION.saveProjectDocumentSlot);
  const updateProjectDocumentSlotStatus = usePluginAction(ACTION.updateProjectDocumentSlotStatus);
  const setProductBuilderBasePackages = usePluginAction(ACTION.setProductBuilderBasePackages);
  const setAgentGuidelines = usePluginAction(ACTION.setAgentGuidelines);
  const writeScreenDocs = usePluginAction(ACTION.writeScreenDocs);
  const runPrd = usePluginAction(ACTION.runPrd);
  const confirmPrd = usePluginAction(ACTION.confirmPrd);
  const runScreens = usePluginAction(ACTION.runScreens);
  const registerFigmaSource = usePluginAction(ACTION.registerFigmaSource);
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
    () => (slotView?.slots ?? []).filter(
      (row) => row.slotGroup === "deliverable",
    ),
    [slotView?.slots],
  );
  const sourceRows = useMemo(
    () => (slotView?.slots ?? []).filter((row) => row.slotGroup === "source"),
    [slotView?.slots],
  );
  const sourceItems = useMemo(() => makeSourceItems(sourceRows), [sourceRows]);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("settings");
  const [documentFocusMode, setDocumentFocusMode] = useState(false);
  const [selectedDeliverableKey, setSelectedDeliverableKey] = useState("");
  const [selectedSourceKey, setSelectedSourceKey] = useState("");
  const currentBasePackageKeys = useMemo(
    () => normalizeProductBuilderBasePackageKeys(overview?.state.productBuilderBasePackageKeys),
    [overview?.state.productBuilderBasePackageKeys],
  );
  const currentBasePackageKeyValue = currentBasePackageKeys.join("|");
  const [draftBasePackageKeys, setDraftBasePackageKeys] = useState<ProductBuilderBasePackageKey[]>(() => (
    normalizeProductBuilderBasePackageKeys(undefined)
  ));
  const draftBasePackageKeyValue = draftBasePackageKeys.join("|");
  const basePackageScopeDirty = draftBasePackageKeyValue !== currentBasePackageKeyValue;
  const currentAgentGuidelinesMarkdown = overview?.state.agentGuidelinesMarkdown ?? "";
  const [draftAgentGuidelinesMarkdown, setDraftAgentGuidelinesMarkdown] = useState("");
  const agentGuidelinesDirty = draftAgentGuidelinesMarkdown !== currentAgentGuidelinesMarkdown;

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
  useEffect(function syncDraftBasePackageKeys() {
    setDraftBasePackageKeys(currentBasePackageKeys);
  }, [currentBasePackageKeyValue]);
  useEffect(function syncDraftAgentGuidelines() {
    setDraftAgentGuidelinesMarkdown(currentAgentGuidelinesMarkdown);
  }, [currentAgentGuidelinesMarkdown]);
  useEffect(function closeDocumentFocusOutsideDocuments() {
    if (activeTab === "deliverables" || activeTab === "sources") return;
    setDocumentFocusMode(false);
  }, [activeTab]);

  const selectedDeliverable = deliverableRows.find((row) => row.slotKey === selectedDeliverableKey) ?? deliverableRows[0] ?? null;
  const selectedSource = sourceItems.find((item) => item.id === selectedSourceKey) ?? sourceItems[0] ?? null;
  const documentFocusModeActive = documentFocusMode && (activeTab === "deliverables" || activeTab === "sources");
  const graphNodeCount = useMemo(() => (overview?.state ? buildGraphFromState(overview.state, slotView?.slots ?? []).nodes.length : 0), [overview?.state, slotView?.slots]);
  const activeRowsCount =
    activeTab === "settings" ? PRODUCT_BUILDER_BASE_PACKAGE_OPTIONS.length + 1 :
    activeTab === "deliverables" ? deliverableRows.length :
    activeTab === "graph" ? graphNodeCount :
    sourceItems.length;
  const sourceCount = sourceItems.length || overview?.state.sources.length || 0;
  const readyDeliverables = deliverableRows.filter((row) => row.status === "ready" || row.status === "approved").length;
  const missingDeliverables = deliverableRows.filter((row) => row.required && row.status === "empty").length;
  const nonEmptySlotCount = (slotView?.slots ?? []).filter((row) =>
    row.status !== "empty" || Boolean(row.document) || Boolean(row.artifact)
  ).length;
  const hasBlueprintData = sourceCount > 0
    || Boolean(currentAgentGuidelinesMarkdown.trim())
    || readyDeliverables > 0
    || nonEmptySlotCount > 0
    || Boolean(overview?.state.requirementInventory)
    || Boolean(overview?.state.prd)
    || Boolean(overview?.state.screenPlan)
    || Boolean(overview?.state.job);
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
  const streamChannel = blueprintPmChatChannel(companyId || "company", projectId || null);
  const pmStream = usePluginStream<BlueprintPmChatStreamEvent>(
    streamChannel,
    companyId ? { companyId } : undefined,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [savingBasePackageScope, setSavingBasePackageScope] = useState(false);
  const [savingAgentGuidelines, setSavingAgentGuidelines] = useState(false);
  const [sourceUploadCount, setSourceUploadCount] = useState(0);
  const [sourceUrlPanelMode, setSourceUrlPanelMode] = useState<SourceUrlPanelMode | null>(null);
  const [sourceUrlValue, setSourceUrlValue] = useState("");
  const [deletingSourceKey, setDeletingSourceKey] = useState<string | null>(null);
  const [reanalyzingSourceKey, setReanalyzingSourceKey] = useState<string | null>(null);
  const [sourceDeleteCandidate, setSourceDeleteCandidate] = useState<SourceListItem | null>(null);
  const [projectPurgeOpen, setProjectPurgeOpen] = useState(false);
  const [purgingProject, setPurgingProject] = useState(false);
  const [deliverablePurgeOpen, setDeliverablePurgeOpen] = useState(false);
  const [purgingDeliverables, setPurgingDeliverables] = useState(false);
  const [regenAllOpen, setRegenAllOpen] = useState(false);
  const [regenAllStep, setRegenAllStep] = useState<null | "prd" | "screens">(null);
  const [savingDocumentKey, setSavingDocumentKey] = useState<string | null>(null);
  const [updatingDocumentStatusKey, setUpdatingDocumentStatusKey] = useState<string | null>(null);
  const [figmaPanelOpen, setFigmaPanelOpen] = useState(false);
  const [figmaUrlValue, setFigmaUrlValue] = useState("");
  const [figmaTokenValue, setFigmaTokenValue] = useState("");
  const figmaUrlInputRef = useRef<HTMLInputElement | null>(null);
  const [draggingSourceFiles, setDraggingSourceFiles] = useState(false);
  const sourceFileInputRef = useRef<HTMLInputElement | null>(null);
  const sourceUrlInputRef = useRef<HTMLInputElement | null>(null);
  const processedEventCountRef = useRef(0);
  const activeAssistantIdRef = useRef<string | null>(null);
  const screenSlotSyncJobRef = useRef<string | null>(null);
  // 전체 재생성 step machine 가드: 기존 산출물을 새 생성으로 오인하지 않도록
  // 각 단계 job이 running→완료된 것을 실제로 관측한 뒤에만 다음 단계로 넘어간다.
  const regenAllBusyRef = useRef(false);
  const regenAllPrdJobSeenRef = useRef(false);
  const regenAllScreensJobSeenRef = useRef(false);
  const sourceUploadBusy = sourceUploadCount > 0;
  const sourceUrlPanelOpen = sourceUrlPanelMode !== null;
  const sourceUrlPanel = sourceUrlPanelMode === "notion"
    ? {
      ariaLabel: "노션공유페이지 등록",
      submitLabel: "등록",
      placeholder: "https://workspace.notion.site/...",
    }
    : {
      ariaLabel: "URL 등록",
      submitLabel: "등록",
      placeholder: "https://...",
    };

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
      setSourceUrlPanelMode(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sourceUrlPanelOpen]);

  useEffect(function focusSourceUrlInput() {
    if (sourceUrlPanelOpen) sourceUrlInputRef.current?.focus();
  }, [sourceUrlPanelOpen]);

  useEffect(function focusFigmaUrlInput() {
    if (figmaPanelOpen) figmaUrlInputRef.current?.focus();
  }, [figmaPanelOpen]);

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

  // 전체 재생성 오케스트레이터: PRD(개발 요구사항 브리프) 생성 → 기준선 자동 확정 →
  // 화면정의서 생성을 순차로 진행한다. 각 단계는 fire-and-forget job이라
  // overview 폴링으로 완료를 감지하고 다음 단계로 넘어간다.
  useEffect(function advanceRegenerateAll() {
    if (!regenAllStep || !companyId || !projectId) return;
    if (regenAllBusyRef.current) return;
    const job = overview?.state.job;
    const jobRunning = job?.status === "running";

    if (regenAllStep === "prd") {
      // PRD job이 도는 것을 먼저 관측해야 한다. 그래야 재생성 직전의 기존 prd를
      // "완료"로 오인하지 않는다.
      if (jobRunning && job?.kind === "prd") {
        regenAllPrdJobSeenRef.current = true;
        return;
      }
      if (jobRunning) return;
      if (!regenAllPrdJobSeenRef.current) return;
      if (job?.status === "error") {
        setRegenAllStep(null);
        toast({ tone: "error", title: "전체 재생성 중단", body: stringValue(job?.message) ?? "개발 요구사항 브리프 생성에 실패했습니다." });
        return;
      }
      if (!overview?.state.prd) return;
      // PRD 완료 → 기준선 자동 확정 후 화면정의서 생성 시작
      regenAllBusyRef.current = true;
      void (async () => {
        try {
          await confirmPrd({ companyId, projectId });
          const result = await runScreens({ companyId, projectId });
          const record = metadataRecord(result);
          if (record.started === false) {
            throw new Error(stringValue(record.reason) ?? "화면정의서 생성을 시작하지 못했습니다.");
          }
          regenAllScreensJobSeenRef.current = false;
          setRegenAllStep("screens");
          await refreshOverview();
        } catch (error) {
          setRegenAllStep(null);
          toast({ tone: "error", title: "전체 재생성 중단", body: error instanceof Error ? error.message : String(error) });
        } finally {
          regenAllBusyRef.current = false;
        }
      })();
      return;
    }

    if (regenAllStep === "screens") {
      if (jobRunning && job?.kind === "screens") {
        regenAllScreensJobSeenRef.current = true;
        return;
      }
      if (jobRunning) return;
      if (!regenAllScreensJobSeenRef.current) return;
      if (job?.status === "error") {
        setRegenAllStep(null);
        toast({ tone: "error", title: "전체 재생성 중단", body: stringValue(job?.message) ?? "화면정의서 생성에 실패했습니다." });
        return;
      }
      if (!overview?.state.screenPlan) return;
      // 화면정의서까지 완료(slot 기록은 syncGeneratedScreenDocsToSlot가 처리)
      setRegenAllStep(null);
      toast({ tone: "success", title: "전체 재생성 완료", body: "개발 요구사항 브리프부터 화면정의서까지 모두 재생성했습니다." });
      void Promise.all([refreshOverview(), refreshSlots()]);
    }
  }, [regenAllStep, overview?.state.job, overview?.state.prd, overview?.state.screenPlan, companyId, projectId, confirmPrd, runScreens, refreshOverview, refreshSlots, toast]);

  async function sendPmText(rawText: string, targetOverride?: PmChatTargetOverride) {
    if (!companyId || sending) return;
    const text = rawText.trim();
    if (!text) return;
    const targetWorkspaceTab = targetOverride?.activeWorkspaceTab
      ?? (activeTab === "deliverables" || activeTab === "sources" ? activeTab : "unknown");
    const targetDeliverableSlotKey = targetOverride?.targetDeliverableSlotKey
      ?? (targetWorkspaceTab === "deliverables" ? selectedDeliverable?.slotKey : undefined);
    const targetDeliverableTitle = targetOverride?.targetDeliverableTitle
      ?? (targetWorkspaceTab === "deliverables" ? selectedDeliverable?.title : undefined);
    const targetSourceId = targetOverride?.targetSourceId
      ?? (targetWorkspaceTab === "sources" ? selectedSource?.id : undefined);
    const targetSourceTitle = targetOverride?.targetSourceTitle
      ?? (targetWorkspaceTab === "sources" ? selectedSource?.title : undefined);
    const targetSourceSlotKey = targetOverride?.targetSourceSlotKey
      ?? (targetWorkspaceTab === "sources" ? selectedSource?.row.slotKey : undefined);
    const targetSourceDocumentRef = targetOverride?.targetSourceDocumentRef
      ?? (targetWorkspaceTab === "sources" ? selectedSource?.documentRef ?? undefined : undefined);
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
        activeWorkspaceTab: targetWorkspaceTab,
        targetDeliverableSlotKey,
        targetDeliverableTitle,
        targetSourceId,
        targetSourceTitle,
        targetSourceSlotKey,
        targetSourceDocumentRef,
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

  async function registerSourceUrl(rawUrl: string, mode: SourceUrlPanelMode = sourceUrlPanelMode ?? "url") {
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
        title: mode === "notion" ? "노션공유페이지 등록 실패" : "URL 등록 실패",
        body: "http 또는 https URL을 입력하세요.",
      });
      return;
    }

    const userMessageId = messageId();
    const assistantId = messageId();
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content: `${mode === "notion" ? "노션공유페이지 등록" : "URL 등록"}\n- ${url}` },
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
        format: mode === "notion" ? "notion" : "url",
        intakeWorkflow: mode === "notion" ? "notion_shared_page" : "url",
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
          ? (mode === "notion" ? "이미 등록된 노션 공유페이지입니다. 등록한 자료 목록에서 기존 항목을 확인하세요." : "이미 등록된 URL입니다. 등록한 자료 목록에서 기존 항목을 확인하세요.")
          : (mode === "notion" ? "노션 공유페이지를 등록한 자료에 반영했습니다." : "URL을 등록한 자료에 반영했습니다.");
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
      body: assistantStatus === "error"
        ? (mode === "notion" ? "노션 공유페이지 등록에 실패했습니다." : "URL 등록에 실패했습니다.")
        : (mode === "notion" ? "노션 공유페이지를 등록했습니다." : "URL을 등록했습니다."),
    });
    if (assistantStatus !== "error") {
      setSourceUrlValue("");
      setSourceUrlPanelMode(null);
    }
  }

  async function deleteSelectedSource(item: SourceListItem) {
    if (deletingSourceKey) return;
    if (!companyId || !projectId) {
      toast({
        tone: "error",
        title: "자료 삭제 실패",
        body: "프로젝트를 먼저 선택하세요.",
      });
      return;
    }
    const sourceId = stringValue(item.metadata.sourceId);
    const sourceFingerprint = stringValue(item.metadata.sourceFingerprint);
    const documentRef = item.documentRef;
    if (!sourceId && !sourceFingerprint && !documentRef) {
      toast({
        tone: "error",
        title: "자료 삭제 실패",
        body: "삭제할 자료 식별자를 찾을 수 없습니다.",
      });
      return;
    }
    setDeletingSourceKey(item.id);
    try {
      const result = await deleteSourceDocument({
        companyId,
        projectId,
        sourceId: sourceId ?? undefined,
        documentRef: documentRef ?? undefined,
        sourceFingerprint: sourceFingerprint ?? undefined,
        sourceTitle: item.title,
        slotKey: item.row.slotKey,
      });
      const record = metadataRecord(result);
      if (record.ok !== true) {
        throw new Error(stringValue(record.message) ?? stringValue(record.error) ?? "삭제할 등록 자료를 찾을 수 없습니다.");
      }
      setSelectedSourceKey("");
      setSourceDeleteCandidate(null);
      await Promise.all([refreshOverview(), refreshSlots()]);
      toast({
        tone: "success",
        title: "자료 삭제",
        body: stringValue(record.message) ?? "등록한 자료를 삭제했습니다.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "자료 삭제 실패",
        body: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDeletingSourceKey(null);
    }
  }

  async function purgeSelectedProjectData() {
    if (purgingProject) return;
    if (!companyId || !projectId) {
      toast({
        tone: "error",
        title: "초기화 실패",
        body: "프로젝트를 먼저 선택하세요.",
      });
      return;
    }
    setPurgingProject(true);
    try {
      const result = await purgeProject({ companyId, projectId });
      const record = metadataRecord(result);
      if (record.ok !== true) {
        throw new Error(stringValue(record.message) ?? stringValue(record.error) ?? "초기화에 실패했습니다.");
      }
      setSelectedDeliverableKey("");
      setSelectedSourceKey("");
      setSourceDeleteCandidate(null);
      setProjectPurgeOpen(false);
      await Promise.all([refreshOverview(), refreshSlots()]);
      toast({
        tone: "success",
        title: "전체 초기화",
        body: stringValue(record.message) ?? "등록 자료와 분석 산출물을 모두 초기화했습니다.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "초기화 실패",
        body: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPurgingProject(false);
    }
  }

  async function purgeSelectedProjectDeliverables() {
    if (purgingDeliverables) return;
    if (!companyId || !projectId) {
      toast({
        tone: "error",
        title: "초기화 실패",
        body: "프로젝트를 먼저 선택하세요.",
      });
      return;
    }
    setPurgingDeliverables(true);
    try {
      const result = await purgeProjectDeliverables({ companyId, projectId });
      const record = metadataRecord(result);
      if (record.ok !== true) {
        throw new Error(stringValue(record.message) ?? stringValue(record.error) ?? "초기화에 실패했습니다.");
      }
      // 등록 자료는 유지되므로 source 선택은 보존하고, 산출물 선택만 초기화한다.
      setSelectedDeliverableKey("");
      setDeliverablePurgeOpen(false);
      await Promise.all([refreshOverview(), refreshSlots()]);
      toast({
        tone: "success",
        title: "산출물 초기화",
        body: stringValue(record.message) ?? "분석 산출물을 모두 초기화했습니다. 등록 자료는 유지됩니다.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "초기화 실패",
        body: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPurgingDeliverables(false);
    }
  }

  async function startRegenerateAll() {
    if (!companyId || !projectId) {
      toast({ tone: "error", title: "전체 재생성 실패", body: "프로젝트를 먼저 선택하세요." });
      return;
    }
    if (overview?.state.job?.status === "running") {
      toast({ tone: "error", title: "전체 재생성 실패", body: "이미 진행 중인 생성 작업이 있습니다." });
      return;
    }
    setRegenAllOpen(false);
    regenAllBusyRef.current = false;
    regenAllPrdJobSeenRef.current = false;
    regenAllScreensJobSeenRef.current = false;
    setRegenAllStep("prd");
    try {
      const result = await runPrd({ companyId, projectId, title: selectedProject?.name ?? "" });
      const record = metadataRecord(result);
      if (record.started === false) {
        throw new Error(stringValue(record.reason) ?? "개발 요구사항 브리프 생성을 시작하지 못했습니다.");
      }
      await refreshOverview();
      toast({ tone: "success", title: "전체 재생성 시작", body: "개발 요구사항 브리프부터 화면정의서까지 순차로 재생성합니다. 몇 분 걸릴 수 있습니다." });
    } catch (error) {
      setRegenAllStep(null);
      toast({ tone: "error", title: "전체 재생성 실패", body: error instanceof Error ? error.message : String(error) });
    }
  }

  async function saveDocumentMarkdown(
    row: ProjectDocumentSlotViewerRow,
    markdown: string,
    source?: SourceListItem | null,
  ): Promise<boolean> {
    if (!companyId || !projectId) {
      toast({
        tone: "error",
        title: "저장 실패",
        body: "프로젝트를 먼저 선택하세요.",
      });
      return false;
    }
    const key = documentSaveKey(row, source);
    if (savingDocumentKey === key) return false;
    const params: Record<string, unknown> = {
      companyId,
      projectId,
      slotKey: row.slotKey,
      title: row.title,
      body: markdown,
    };
    if (source) {
      const sourceId = stringValue(source.metadata.sourceId);
      const sourceFingerprint = stringValue(source.metadata.sourceFingerprint);
      params.sourceId = sourceId ?? undefined;
      params.documentRef = source.documentRef ?? undefined;
      params.sourceFingerprint = sourceFingerprint ?? undefined;
    }

    setSavingDocumentKey(key);
    try {
      const result = await saveProjectDocumentSlot(params);
      const record = metadataRecord(result);
      if (record.ok !== true) {
        throw new Error(stringValue(record.message) ?? stringValue(record.error) ?? "문서 저장에 실패했습니다.");
      }
      await Promise.all([refreshOverview(), refreshSlots()]);
      toast({
        tone: "success",
        title: "문서 저장",
        body: stringValue(record.message) ?? "Markdown 문서를 저장했습니다.",
      });
      return true;
    } catch (error) {
      toast({
        tone: "error",
        title: "저장 실패",
        body: error instanceof Error ? error.message : String(error),
      });
      return false;
    } finally {
      setSavingDocumentKey(null);
    }
  }

  // "Figma 등록": URL 등록과 동일 흐름이되, 추출은 MCP read-path(REST export 차단 우회).
  // 토큰이 없으면 인증 링크를 채팅에 띄우고(4단계), 인증 완료 후 자동 재시도한다(5단계).
  async function registerFigmaSourceUrl(rawUrl: string) {
    if (sourceUploadBusy) return;
    if (!companyId || !projectId) {
      toast({ tone: "error", title: "Figma 등록 실패", body: "프로젝트를 먼저 선택하세요." });
      return;
    }
    const url = rawUrl.trim();
    if (!url) {
      toast({ tone: "error", title: "Figma 등록 실패", body: "Figma 파일 링크를 입력하세요." });
      return;
    }

    const userMessageId = messageId();
    const assistantId = messageId();
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content: `Figma 등록\n- ${url}` },
      { id: assistantId, role: "assistant", content: "", status: "streaming" },
    ]);
    setActiveTab("sources");
    setSourceUploadCount(1);

    let assistantText = "";
    let assistantStatus: ChatMessage["status"];
    try {
      const result = metadataRecord(await registerFigmaSource({
        companyId,
        projectId,
        url,
        token: figmaTokenValue.trim() || undefined,
      }));
      if (result.ok === true) {
        assistantText = stringValue(result.message) ?? "Figma 레이아웃을 등록했습니다.";
        setFigmaUrlValue("");
        setFigmaPanelOpen(false);
        refreshOverview();
        refreshSlots();
      } else {
        // ok:false(invalid_url·auth_required·not_found 등) → Toast 로 사유 안내 + 채팅에도 기록.
        const failMessage = stringValue(result.message) ?? "Figma 등록에 실패했습니다.";
        assistantStatus = "error";
        assistantText = failMessage;
        toast({ tone: "error", title: "Figma 등록 실패", body: failMessage });
      }
    } catch (error) {
      assistantStatus = "error";
      assistantText = error instanceof Error ? error.message : String(error);
    } finally {
      setSourceUploadCount((current) => Math.max(0, current - 1));
    }
    setMessages((current) => replaceAssistantText(current, assistantId, assistantText, assistantStatus));
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

  function toggleBasePackageScope(key: ProductBuilderBasePackageKey, checked: boolean) {
    const option = PRODUCT_BUILDER_BASE_PACKAGE_OPTIONS.find((entry) => entry.key === key);
    if (option?.required) return;
    setDraftBasePackageKeys((current) => normalizeProductBuilderBasePackageKeys(
      checked
        ? [...current, key]
        : current.filter((entry) => entry !== key),
    ));
  }

  async function saveBasePackageScope() {
    if (!companyId || !projectId) {
      toast({ tone: "error", title: "설정 저장 실패", body: "프로젝트를 먼저 선택하세요." });
      return;
    }
    if (savingBasePackageScope) return;
    const packageKeys = normalizeProductBuilderBasePackageKeys(draftBasePackageKeys);
    setSavingBasePackageScope(true);
    try {
      const result = await setProductBuilderBasePackages({
        companyId,
        projectId,
        packageKeys,
      });
      const record = metadataRecord(result);
      if (record.ok !== true) {
        throw new Error(stringValue(record.message) ?? stringValue(record.error) ?? "설정 저장에 실패했습니다.");
      }
      const savedKeys = normalizeProductBuilderBasePackageKeys(record.packageKeys ?? packageKeys);
      setDraftBasePackageKeys(savedKeys);
      await Promise.all([refreshOverview(), refreshSlots()]);
      toast({
        tone: "success",
        title: "설정 저장",
        body: stringValue(record.message) ?? "Product Builder Base 구성 범위를 저장했습니다.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "설정 저장 실패",
        body: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSavingBasePackageScope(false);
    }
  }

  async function saveAgentGuidelines() {
    if (!companyId || !projectId) {
      toast({ tone: "error", title: "가이드라인 저장 실패", body: "프로젝트를 먼저 선택하세요." });
      return;
    }
    if (savingAgentGuidelines) return;
    setSavingAgentGuidelines(true);
    try {
      const result = await setAgentGuidelines({
        companyId,
        projectId,
        guidelinesMarkdown: draftAgentGuidelinesMarkdown,
      });
      const record = metadataRecord(result);
      if (record.ok !== true) {
        throw new Error(stringValue(record.message) ?? stringValue(record.error) ?? "가이드라인 저장에 실패했습니다.");
      }
      setDraftAgentGuidelinesMarkdown(typeof record.guidelinesMarkdown === "string" ? record.guidelinesMarkdown : draftAgentGuidelinesMarkdown.trim());
      await refreshOverview();
      toast({
        tone: "success",
        title: "가이드라인 저장",
        body: stringValue(record.message) ?? "에이전트 필수 가이드라인을 저장했습니다.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "가이드라인 저장 실패",
        body: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSavingAgentGuidelines(false);
    }
  }

  async function runDeliverableAnalysis(row: ProjectDocumentSlotViewerRow | null = selectedDeliverable) {
    if (!row) return;
    const instruction = shouldReanalyzeDeliverable(row)
      ? `${row.title}을 재분석하고 다시 생성해줘.`
      : `${row.title}을 분석하고 생성해줘.`;
    await sendPmText(instruction, {
      activeWorkspaceTab: "deliverables",
      targetDeliverableSlotKey: row.slotKey,
      targetDeliverableTitle: row.title,
    });
  }

  async function updateDeliverableStatus(row: ProjectDocumentSlotViewerRow, status: "draft" | "approved") {
    if (!companyId || !projectId) {
      toast({ tone: "error", title: "상태 변경 실패", body: "프로젝트를 먼저 선택하세요." });
      return;
    }
    if (updatingDocumentStatusKey) return;
    setUpdatingDocumentStatusKey(row.slotKey);
    try {
      const result = await updateProjectDocumentSlotStatus({
        companyId,
        projectId,
        slotKey: row.slotKey,
        status,
      });
      const record = metadataRecord(result);
      if (record.ok !== true) {
        throw new Error(stringValue(record.message) ?? stringValue(record.error) ?? "상태 변경에 실패했습니다.");
      }
      await Promise.all([refreshOverview(), refreshSlots()]);
      toast({
        tone: "success",
        title: status === "approved" ? "산출물 확정" : "산출물 초안",
        body: stringValue(record.message) ?? (status === "approved" ? "산출물을 확정했습니다." : "산출물을 초안으로 변경했습니다."),
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "상태 변경 실패",
        body: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setUpdatingDocumentStatusKey(null);
    }
  }

  async function runSelectedSourceAnalysis() {
    if (!selectedSource) return;
    if (!companyId || !projectId) {
      toast({
        tone: "error",
        title: "자료 재분석 실패",
        body: "프로젝트를 먼저 선택하세요.",
      });
      return;
    }
    if (reanalyzingSourceKey) return;

    const sourceId = stringValue(selectedSource.metadata.sourceId);
    const sourceFingerprint = stringValue(selectedSource.metadata.sourceFingerprint);
    const documentRef = selectedSource.documentRef;
    if (!sourceId && !sourceFingerprint && !documentRef) {
      toast({
        tone: "error",
        title: "자료 재분석 실패",
        body: "재분석할 자료 식별자를 찾을 수 없습니다.",
      });
      return;
    }

    setReanalyzingSourceKey(selectedSource.id);
    try {
      const result = await reanalyzeSourceDocument({
        companyId,
        projectId,
        sourceId: sourceId ?? undefined,
        sourceFingerprint: sourceFingerprint ?? undefined,
        documentRef: documentRef ?? undefined,
        sourceTitle: selectedSource.title,
        slotKey: selectedSource.row.slotKey,
      });
      const record = metadataRecord(result);
      if (record.ok !== true) {
        throw new Error(stringValue(record.message) ?? stringValue(record.error) ?? "등록 자료 재분석에 실패했습니다.");
      }
      const slot = metadataRecord(record.slot);
      const slotKey = stringValue(slot.slotKey);
      const nextDocumentRef = stringValue(record.file);
      if (slotKey && nextDocumentRef) setSelectedSourceKey(`${slotKey}:${nextDocumentRef}`);
      await Promise.all([refreshOverview(), refreshSlots()]);
      toast({
        tone: "success",
        title: "자료 재분석",
        body: stringValue(record.message) ?? "등록 자료를 같은 workflow로 다시 분석했습니다.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "자료 재분석 실패",
        body: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setReanalyzingSourceKey(null);
    }
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
          documentFocusModeActive && "hidden",
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
                  aria-label={sourceUrlPanel.ariaLabel}
                  className="h-8 min-w-0 flex-1"
                  disabled={sourceUploadBusy || !companyId || !projectId}
                  onChange={(event) => setSourceUrlValue(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    void registerSourceUrl(sourceUrlValue, sourceUrlPanelMode ?? "url");
                  }}
                  placeholder={sourceUrlPanel.placeholder}
                  ref={sourceUrlInputRef}
                  type="url"
                  value={sourceUrlValue}
                />
                <Button
                  className="h-8 shrink-0 px-2 text-xs"
                  disabled={sourceUploadBusy || !sourceUrlValue.trim() || !companyId || !projectId}
                  onClick={() => void registerSourceUrl(sourceUrlValue, sourceUrlPanelMode ?? "url")}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {sourceUrlPanel.submitLabel}
                </Button>
                <Button
                  aria-label={`${sourceUrlPanel.ariaLabel} 닫기`}
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    setSourceUrlPanelMode(null);
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
            {figmaPanelOpen ? (
              <div className="flex flex-col gap-2 border-t border-border px-2 py-2">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Figma 파일 링크"
                    className="h-8 min-w-0 flex-1"
                    disabled={sourceUploadBusy || !companyId || !projectId}
                    onChange={(event) => setFigmaUrlValue(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      void registerFigmaSourceUrl(figmaUrlValue);
                    }}
                    placeholder="Figma 파일 링크"
                    ref={figmaUrlInputRef}
                    type="url"
                    value={figmaUrlValue}
                  />
                  <Button
                    className="h-8 shrink-0 px-2 text-xs"
                    disabled={sourceUploadBusy || !figmaUrlValue.trim() || !companyId || !projectId}
                    onClick={() => void registerFigmaSourceUrl(figmaUrlValue)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    등록
                  </Button>
                  <Button
                    aria-label="Figma 등록 닫기"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                      setFigmaPanelOpen(false);
                      setFigmaUrlValue("");
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  aria-label="Figma 토큰"
                  className="h-8 min-w-0"
                  disabled={sourceUploadBusy || !companyId || !projectId}
                  onChange={(event) => setFigmaTokenValue(event.currentTarget.value)}
                  placeholder="mcp:connect access 토큰 (한 번만 입력, 세션 동안 재사용)"
                  type="password"
                  value={figmaTokenValue}
                />
                <div className="px-1 text-[11px] leading-4 text-muted-foreground">
                  OS에 맞게 토큰을 추출하세요.
                  {FIGMA_TOKEN_CMDS.map((c) => (
                    <div key={c.os} className="mt-1">
                      <span className="font-medium text-foreground">{c.os}</span>
                      <code className="mt-0.5 block select-all break-all rounded bg-muted px-1.5 py-1 text-[10px] text-foreground">{c.cmd}</code>
                    </div>
                  ))}
                </div>
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
                  <PromptInputActionMenuContent side="top" className="w-48">
                    <PromptInputActionMenuItem
                      onSelect={() => sourceFileInputRef.current?.click()}
                    >
                      <PaperclipIcon className="h-4 w-4 text-muted-foreground" />
                      파일 첨부
                    </PromptInputActionMenuItem>
                    <PromptInputActionMenuItem
                      onSelect={() => {
                        setSourceUrlPanelMode("url");
                        setSourceUrlValue("");
                        setFigmaPanelOpen(false);
                      }}
                    >
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      URL 등록
                    </PromptInputActionMenuItem>
                    <PromptInputActionMenuItem
                      onSelect={() => {
                        setSourceUrlPanelMode("notion");
                        setSourceUrlValue("");
                        setFigmaPanelOpen(false);
                      }}
                    >
                      <BookOpenIcon className="h-4 w-4 text-muted-foreground" />
                      노션공유페이지
                    </PromptInputActionMenuItem>
                    <PromptInputActionMenuItem
                      onSelect={() => {
                        setFigmaPanelOpen(true);
                        setSourceUrlPanelMode(null);
                      }}
                    >
                      <FigmaIcon className="h-4 w-4 text-muted-foreground" />
                      Figma 등록
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
          <div className="flex shrink-0 items-center gap-2">
            <ProjectSelector
              loading={projectsLoading}
              onProjectIdChange={setSelectedProjectId}
              projectId={projectId}
              projects={projectList}
            />
            <Button
              className="h-9 shrink-0 gap-1.5 px-3"
              disabled={regenAllStep !== null || purgingProject || purgingDeliverables || !companyId || !projectId || !hasBlueprintData || overview?.state.job?.status === "running"}
              onClick={() => setRegenAllOpen(true)}
              size="sm"
              title="개발 요구사항 브리프부터 화면정의서까지 전체 산출물을 순차로 다시 생성합니다"
              variant="default"
            >
              {regenAllStep !== null ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <SparklesIcon className="h-3.5 w-3.5" />}
              {regenAllStep === "prd" ? "브리프 생성 중" : regenAllStep === "screens" ? "화면 생성 중" : "전체 재생성"}
            </Button>
            <Button
              className="h-9 shrink-0 gap-1.5 px-3"
              disabled={purgingDeliverables || purgingProject || regenAllStep !== null || !companyId || !projectId || deliverableRows.length === 0}
              onClick={() => setDeliverablePurgeOpen(true)}
              size="sm"
              title="등록 자료는 유지하고 분석 산출물만 초기화합니다"
              variant="outline"
            >
              {purgingDeliverables ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <RefreshCwIcon className="h-3.5 w-3.5" />}
              산출물 초기화
            </Button>
            <Button
              className="h-9 shrink-0 gap-1.5 px-3"
              disabled={purgingProject || purgingDeliverables || regenAllStep !== null || !companyId || !projectId || !hasBlueprintData}
              onClick={() => setProjectPurgeOpen(true)}
              size="sm"
              title="등록 자료와 분석 산출물을 모두 초기화합니다"
              variant="destructive"
            >
              {purgingProject ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <Trash2Icon className="h-3.5 w-3.5" />}
              전체 초기화
            </Button>
          </div>
        </header>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-2">
          <div className="inline-flex rounded-md border border-border bg-muted/40 p-1">
            <Button
              className={cn("h-8 px-3", activeTab === "settings" && "bg-background shadow-sm")}
              onClick={() => setActiveTab("settings")}
              variant={activeTab === "settings" ? "secondary" : "ghost"}
            >
              설정
            </Button>
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
              등록한자료
            </Button>
            <Button
              className={cn("h-8 px-3", activeTab === "graph" && "bg-background shadow-sm")}
              onClick={() => setActiveTab("graph")}
              variant={activeTab === "graph" ? "secondary" : "ghost"}
            >
              그래프
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

        {activeTab === "graph" ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            {overview?.state ? (
              <BlueprintGraphView
                graph={buildGraphFromState(overview.state, slotView?.slots ?? [])}
                onSourceClick={(sourceId) => {
                  setActiveTab("sources");
                  // 그래프 source 노드 id = SourceMaterial.id. sources 탭 item.id 는 `${slotKey}:${documentRef}`
                  // 형태라 직접 안 맞는다 → slot 메타의 sourceId 로 매칭해 올바른 item 을 선택한다.
                  const match = sourceItems.find((item) => stringValue(item.metadata.sourceId) === sourceId);
                  setSelectedSourceKey(match?.id ?? sourceId);
                }}
                onDeliverableClick={(slotKey) => { setActiveTab("deliverables"); setSelectedDeliverableKey(slotKey); }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">프로젝트를 선택하세요.</div>
            )}
          </div>
        ) : activeTab === "settings" ? (
          <SettingsPanel
            agentGuidelinesDirty={agentGuidelinesDirty}
            agentGuidelinesMarkdown={draftAgentGuidelinesMarkdown}
            currentPackageKeys={currentBasePackageKeys}
            dirty={basePackageScopeDirty}
            disabled={!companyId || !projectId}
            draftPackageKeys={draftBasePackageKeys}
            onAgentGuidelinesChange={setDraftAgentGuidelinesMarkdown}
            onAgentGuidelinesReset={() => setDraftAgentGuidelinesMarkdown(currentAgentGuidelinesMarkdown)}
            onAgentGuidelinesSave={() => void saveAgentGuidelines()}
            onReset={() => setDraftBasePackageKeys(currentBasePackageKeys)}
            onSave={() => void saveBasePackageScope()}
            onToggle={toggleBasePackageScope}
            savingAgentGuidelines={savingAgentGuidelines}
            saving={savingBasePackageScope}
          />
        ) : (
          <div
            className="grid min-h-0 flex-1 overflow-hidden"
            style={{ gridTemplateColumns: documentFocusModeActive ? "minmax(0, 1fr)" : "320px minmax(0, 1fr)" }}
          >
          {documentFocusModeActive ? null : (
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
          )}

          <section className="min-h-0 overflow-y-auto">
            {activeTab === "deliverables" ? (
              selectedDeliverable ? (
                <DocumentPanel
                  body={selectedDeliverable.document?.body ?? null}
                  fallbackTitle="아직 생성된 산출물이 없습니다."
                  onSave={(markdown) => saveDocumentMarkdown(selectedDeliverable, markdown)}
                  onFocusModeChange={setDocumentFocusMode}
                  row={selectedDeliverable}
                  focusMode={documentFocusModeActive}
                  saving={savingDocumentKey === documentSaveKey(selectedDeliverable)}
                  statusControl={{
                    disabled: !companyId || !projectId || (
                      !selectedDeliverable.document?.body?.trim() &&
                      !selectedDeliverable.artifact &&
                      selectedDeliverable.status !== "approved"
                    ),
                    onChange: (status) => updateDeliverableStatus(selectedDeliverable, status),
                    updating: updatingDocumentStatusKey === selectedDeliverable.slotKey,
                    value: selectedDeliverable.status === "approved" ? "approved" : "draft",
                  }}
                  title={selectedDeliverable.title}
                  trailingActions={(
                    <Button
                      className="h-8 shrink-0 gap-1.5 px-2 text-xs"
                      disabled={sending || !companyId || !projectId}
                      onClick={() => void runDeliverableAnalysis(selectedDeliverable)}
                      size="sm"
                      title={`${selectedDeliverable.title} ${deliverableAnalysisLabel(selectedDeliverable)} — LLM으로 다시 분석/생성`}
                      variant="secondary"
                    >
                      {sending ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <RefreshCwIcon className="h-3.5 w-3.5" />}
                      {deliverableAnalysisLabel(selectedDeliverable)}
                    </Button>
                  )}
                />
              ) : (
                <EmptyWorkspace title="산출물이 없습니다." />
              )
            ) : selectedSource ? (
              <DocumentPanel
                actions={(
                  <Button
                    aria-label="등록 자료 삭제"
                    className="h-8 w-8"
                    disabled={deletingSourceKey === selectedSource.id}
                    onClick={() => setSourceDeleteCandidate(selectedSource)}
                    size="icon"
                    title="등록 자료 삭제"
                    variant="ghost"
                  >
                    {deletingSourceKey === selectedSource.id
                      ? <Loader2Icon className="h-4 w-4 animate-spin" />
                      : <Trash2Icon className="h-4 w-4" />}
                  </Button>
                )}
                trailingActions={(
                  <Button
                    className="h-8 shrink-0 gap-1.5 px-2 text-xs"
                    disabled={Boolean(reanalyzingSourceKey) || !companyId || !projectId}
                    onClick={() => void runSelectedSourceAnalysis()}
                    size="sm"
                    title={`${selectedSource.title} 재분석`}
                    variant="secondary"
                  >
                    {reanalyzingSourceKey === selectedSource.id
                      ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                      : <RefreshCwIcon className="h-3.5 w-3.5" />}
                    재분석
                  </Button>
                )}
                body={sourceBodyForItem(selectedSource)}
                fallbackTitle="자료 본문을 찾을 수 없습니다."
                onSave={(markdown) => saveDocumentMarkdown(selectedSource.row, markdown, selectedSource)}
                onFocusModeChange={setDocumentFocusMode}
                row={selectedSource.row}
                focusMode={documentFocusModeActive}
                saving={savingDocumentKey === documentSaveKey(selectedSource.row, selectedSource)}
                title={selectedSource.title}
              />
            ) : (
              <EmptyWorkspace title="등록한 자료가 없습니다." />
            )}
          </section>
          </div>
        )}
      </main>
      <AlertDialog
        open={projectPurgeOpen}
        onOpenChange={(open) => {
          if (!open && !purgingProject) setProjectPurgeOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>등록 자료와 분석 산출물 전체 초기화</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedProject
                ? `"${selectedProject.name}" 프로젝트의 등록 자료, 개발 요구사항 브리프, 기능 정의서, 스키마/API/아키텍처, 화면정의서 slot을 모두 비웁니다. 이 작업은 되돌릴 수 없습니다.`
                : "선택한 프로젝트의 등록 자료와 분석 산출물을 모두 비웁니다. 이 작업은 되돌릴 수 없습니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purgingProject}>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={purgingProject}
              onClick={(event) => {
                event.preventDefault();
                void purgeSelectedProjectData();
              }}
            >
              {purgingProject ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  초기화 중
                </>
              ) : "전체 초기화"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={regenAllOpen}
        onOpenChange={(open) => {
          if (!open) setRegenAllOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>전체 산출물 재생성</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedProject
                ? `"${selectedProject.name}" 프로젝트의 등록 자료를 기준으로 개발 요구사항 브리프 → 기능정의서/스키마/API/아키텍처 → 화면정의서를 순차로 다시 생성합니다. 기존 분석 산출물은 새 결과로 덮어쓰며, PM Agent 호출과 화면 생성으로 몇 분 걸릴 수 있습니다.`
                : "선택한 프로젝트의 전체 산출물을 등록 자료 기준으로 순차 재생성합니다. 기존 산출물은 덮어쓰며 몇 분 걸릴 수 있습니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void startRegenerateAll();
              }}
            >
              전체 재생성
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={deliverablePurgeOpen}
        onOpenChange={(open) => {
          if (!open && !purgingDeliverables) setDeliverablePurgeOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>분석 산출물 초기화</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedProject
                ? `"${selectedProject.name}" 프로젝트의 개발 요구사항 브리프, 기능 정의서, 스키마/API/아키텍처, 화면정의서 slot을 비웁니다. 등록 자료는 유지됩니다. 이 작업은 되돌릴 수 없습니다.`
                : "선택한 프로젝트의 분석 산출물만 비웁니다. 등록 자료는 유지됩니다. 이 작업은 되돌릴 수 없습니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purgingDeliverables}>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={purgingDeliverables}
              onClick={(event) => {
                event.preventDefault();
                void purgeSelectedProjectDeliverables();
              }}
            >
              {purgingDeliverables ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  초기화 중
                </>
              ) : "산출물 초기화"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(sourceDeleteCandidate)}
        onOpenChange={(open) => {
          if (!open && !deletingSourceKey) setSourceDeleteCandidate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>등록 자료 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {sourceDeleteCandidate
                ? `"${sourceDeleteCandidate.title}" 자료를 삭제합니다. 자료 기준이 바뀌어 기존 분석 산출물 상태도 초기화됩니다.`
                : "선택한 등록 자료를 삭제합니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingSourceKey)}>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={Boolean(deletingSourceKey)}
              onClick={(event) => {
                event.preventDefault();
                if (sourceDeleteCandidate) void deleteSelectedSource(sourceDeleteCandidate);
              }}
            >
              {deletingSourceKey ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  삭제 중
                </>
              ) : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function SettingsPanel({
  agentGuidelinesDirty,
  agentGuidelinesMarkdown,
  currentPackageKeys,
  dirty,
  disabled,
  draftPackageKeys,
  onAgentGuidelinesChange,
  onAgentGuidelinesReset,
  onAgentGuidelinesSave,
  onReset,
  onSave,
  onToggle,
  savingAgentGuidelines,
  saving,
}: {
  agentGuidelinesDirty: boolean;
  agentGuidelinesMarkdown: string;
  currentPackageKeys: readonly ProductBuilderBasePackageKey[];
  dirty: boolean;
  disabled?: boolean;
  draftPackageKeys: readonly ProductBuilderBasePackageKey[];
  onAgentGuidelinesChange: (markdown: string) => void;
  onAgentGuidelinesReset: () => void;
  onAgentGuidelinesSave: () => void;
  onReset: () => void;
  onSave: () => void;
  onToggle: (key: ProductBuilderBasePackageKey, checked: boolean) => void;
  savingAgentGuidelines?: boolean;
  saving?: boolean;
}) {
  const selectedKeys = new Set(normalizeProductBuilderBasePackageKeys(draftPackageKeys));
  const selectedCount = selectedKeys.size;
  const savedCount = normalizeProductBuilderBasePackageKeys(currentPackageKeys).length;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <SettingsIcon className="h-4 w-4" />
              프로젝트 설정
            </div>
            <h3 className="mt-1 text-lg font-semibold">Product Builder Base 구성</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              product-builder-base 모노레포에서 구현 대상이 되는 구성 범위입니다.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge>{selectedCount}/{PRODUCT_BUILDER_BASE_PACKAGE_OPTIONS.length} 선택</Badge>
            {dirty ? <Badge className="bg-secondary text-secondary-foreground">저장 필요</Badge> : <Badge>저장됨 {savedCount}개</Badge>}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          {PRODUCT_BUILDER_BASE_PACKAGE_OPTIONS.map((option) => {
            const checked = option.required || selectedKeys.has(option.key);
            const checkboxId = `product-builder-base-${option.key}`;
            return (
              <label
                className={cn(
                  "flex min-h-20 cursor-pointer items-start gap-3 border-b border-border px-4 py-4 last:border-b-0 hover:bg-accent/40",
                  option.required && "cursor-default bg-muted/20",
                )}
                htmlFor={checkboxId}
                key={option.key}
              >
                <input
                  checked={checked}
                  className="mt-1 h-4 w-4 rounded border-input accent-primary disabled:cursor-not-allowed"
                  disabled={disabled || saving || option.required}
                  id={checkboxId}
                  onChange={(event) => onToggle(option.key, event.currentTarget.checked)}
                  type="checkbox"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{option.title}</span>
                    <Badge>{option.basePath}</Badge>
                    <Badge className={option.required ? "bg-primary text-primary-foreground" : undefined}>
                      {option.required ? "필수" : "선택"}
                    </Badge>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            className="h-9"
            disabled={disabled || saving || !dirty}
            onClick={onReset}
            variant="outline"
          >
            되돌리기
          </Button>
          <Button
            className="h-9 min-w-24"
            disabled={disabled || saving || !dirty}
            onClick={onSave}
          >
            {saving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
            저장
          </Button>
        </div>

        <div className="mt-8 border-t border-border pt-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold">에이전트 필수 가이드라인</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                PM Agent와 산출물 생성/수정 LLM이 실행 전에 읽는 프로젝트 지침입니다.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {agentGuidelinesDirty ? <Badge className="bg-secondary text-secondary-foreground">저장 필요</Badge> : <Badge>저장됨</Badge>}
            </div>
          </div>

          <MarkdownEditor
            disabled={disabled || savingAgentGuidelines}
            onChange={onAgentGuidelinesChange}
            value={agentGuidelinesMarkdown}
          />

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button
              className="h-9"
              disabled={disabled || savingAgentGuidelines || !agentGuidelinesDirty}
              onClick={onAgentGuidelinesReset}
              variant="outline"
            >
              되돌리기
            </Button>
            <Button
              className="h-9 min-w-24"
              disabled={disabled || savingAgentGuidelines || !agentGuidelinesDirty}
              onClick={onAgentGuidelinesSave}
            >
              {savingAgentGuidelines ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
              저장
            </Button>
          </div>
        </div>
      </div>
    </div>
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

type DocumentStatusControlValue = "draft" | "approved";

type DocumentStatusControlProps = {
  disabled?: boolean;
  onChange: (status: DocumentStatusControlValue) => void | Promise<void>;
  updating?: boolean;
  value: DocumentStatusControlValue;
};

function DocumentStatusControl({ disabled, onChange, updating, value }: DocumentStatusControlProps) {
  const options: Array<{ label: string; value: DocumentStatusControlValue }> = [
    { label: "초안", value: "draft" },
    { label: "확정", value: "approved" },
  ];
  return (
    <div
      aria-label="산출물 상태"
      className="inline-flex h-8 shrink-0 overflow-hidden rounded-md border border-input bg-background"
      role="group"
      title={disabled ? "문서를 생성한 뒤 상태를 변경할 수 있습니다" : "산출물 상태 변경"}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            aria-pressed={active}
            className={cn(
              "inline-flex h-full min-w-12 items-center justify-center gap-1 border-r border-border px-2 text-xs font-medium last:border-r-0 disabled:pointer-events-none disabled:opacity-60",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            disabled={disabled || updating || active}
            key={option.value}
            onClick={() => void onChange(option.value)}
            type="button"
          >
            {updating && active ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function DocumentPanel({
  actions,
  body,
  fallbackTitle,
  focusMode = false,
  onFocusModeChange,
  onSave,
  row,
  saving,
  statusControl,
  title,
  trailingActions,
}: {
  actions?: ReactNode;
  body: string | null;
  fallbackTitle: string;
  focusMode?: boolean;
  onFocusModeChange?: (focusMode: boolean) => void;
  onSave?: (markdown: string) => Promise<boolean>;
  row: ProjectDocumentSlotViewerRow;
  saving?: boolean;
  statusControl?: DocumentStatusControlProps;
  title: string;
  trailingActions?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draftBody, setDraftBody] = useState(body ?? "");
  const bodyKey = `${row.slotKey}:${row.documentId ?? "no-document"}:${body ?? ""}`;

  useEffect(() => {
    setEditing(false);
    setDraftBody(body ?? "");
  }, [bodyKey, body]);

  async function saveDraft() {
    if (!onSave || saving) return;
    const saved = await onSave(draftBody);
    if (saved) setEditing(false);
  }

  return (
    <div className={cn("mx-auto px-6 py-5", focusMode ? "max-w-none" : "max-w-5xl")}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{row.slotKey} / {formatDate(row.updatedAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {onFocusModeChange ? (
            <Button
              className="h-8 shrink-0 gap-1.5 px-2 text-xs"
              onClick={() => onFocusModeChange(!focusMode)}
              size="sm"
              title={focusMode ? "목록 보기" : "넓게 보기"}
              variant="ghost"
            >
              {focusMode ? <Minimize2Icon className="h-3.5 w-3.5" /> : <Maximize2Icon className="h-3.5 w-3.5" />}
              {focusMode ? "목록" : "넓게"}
            </Button>
          ) : null}
          {statusControl ? (
            <DocumentStatusControl {...statusControl} />
          ) : (
            <Badge className={statusClass(row.status)}>{statusLabel(row.status)}</Badge>
          )}
          {onSave ? (
            editing ? (
              <>
                <Button
                  className="h-8 shrink-0 gap-1.5 px-2 text-xs"
                  disabled={saving}
                  onClick={() => {
                    setDraftBody(body ?? "");
                    setEditing(false);
                  }}
                  size="sm"
                  title="미리보기"
                  variant="ghost"
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  미리보기
                </Button>
                <Button
                  className="h-8 shrink-0 gap-1.5 px-2 text-xs"
                  disabled={saving}
                  onClick={() => void saveDraft()}
                  size="sm"
                  title="저장"
                  variant="default"
                >
                  {saving ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="h-3.5 w-3.5" />}
                  저장
                </Button>
              </>
            ) : (
              <Button
                className="h-8 shrink-0 gap-1.5 px-2 text-xs"
                onClick={() => {
                  setDraftBody(body ?? "");
                  setEditing(true);
                }}
                size="sm"
                title="편집"
                variant="secondary"
              >
                <PencilIcon className="h-3.5 w-3.5" />
                편집
              </Button>
            )
          ) : null}
          {trailingActions}
        </div>
      </div>
      {editing ? (
        <MarkdownEditor
          disabled={saving}
          onChange={setDraftBody}
          value={draftBody}
        />
      ) : body ? (
        <div className={BUILDER_MARKDOWN_CONTENT_CLASS}>
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
