import { Markdown as TiptapMarkdown } from "@tiptap/markdown";
import { EditorContent, Extension, useEditor, type Editor, type Range } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Suggestion, type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import {
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  PilcrowIcon,
  QuoteIcon,
  RedoIcon,
  UndoIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Button, cn } from "../../ui/primitives.js";

export const BUILDER_MARKDOWN_CONTENT_CLASS = "paperclip-markdown prose prose-sm max-w-none dark:prose-invert";

type SlashCommandItem = {
  id: string;
  label: string;
  description: string;
  search: string[];
  run: (editor: Editor, range: Range) => void;
};

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    id: "paragraph",
    label: "본문",
    description: "일반 문단",
    search: ["paragraph", "text", "body", "p", "본문", "문단"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    id: "heading-1",
    label: "제목 1",
    description: "큰 섹션 제목",
    search: ["h1", "heading", "title", "제목", "헤딩"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run(),
  },
  {
    id: "heading-2",
    label: "제목 2",
    description: "하위 섹션 제목",
    search: ["h2", "heading", "subtitle", "제목", "소제목"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(),
  },
  {
    id: "bullet-list",
    label: "글머리 목록",
    description: "불릿 목록",
    search: ["bullet", "list", "ul", "목록", "글머리"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: "ordered-list",
    label: "번호 목록",
    description: "순서 있는 목록",
    search: ["number", "ordered", "list", "ol", "번호", "순서"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: "blockquote",
    label: "인용",
    description: "인용 블록",
    search: ["quote", "blockquote", "인용"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: "code-block",
    label: "코드 블록",
    description: "고정폭 코드",
    search: ["code", "codeblock", "pre", "코드"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setCodeBlock().run(),
  },
  {
    id: "horizontal-rule",
    label: "구분선",
    description: "수평선",
    search: ["hr", "rule", "line", "divider", "구분선", "수평선"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

function slashCommandItems(query: string): SlashCommandItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((item) =>
    item.search.some((token) => token.toLowerCase().includes(normalized))
    || item.label.toLowerCase().includes(normalized)
    || item.description.toLowerCase().includes(normalized)
  );
}

function createSlashCommandList() {
  let root: HTMLDivElement | null = null;
  let unmount: (() => void) | null = null;
  let selectedIndex = 0;
  let latestProps: SuggestionProps<SlashCommandItem, SlashCommandItem> | null = null;

  const selectItem = (index: number) => {
    const item = latestProps?.items[index];
    if (!item || !latestProps) return;
    latestProps.command(item);
  };

  const render = (props: SuggestionProps<SlashCommandItem, SlashCommandItem>) => {
    if (!root) return;
    latestProps = props;
    selectedIndex = Math.max(0, Math.min(selectedIndex, props.items.length - 1));
    root.innerHTML = "";
    root.setAttribute("role", "listbox");
    root.style.minWidth = "220px";
    root.style.maxWidth = "280px";
    root.style.maxHeight = "280px";
    root.style.overflowY = "auto";
    root.style.border = "1px solid var(--border)";
    root.style.borderRadius = "8px";
    root.style.background = "var(--popover, var(--background))";
    root.style.boxShadow = "0 12px 28px rgba(15, 23, 42, 0.16)";
    root.style.padding = "4px";
    root.style.zIndex = "9999";

    const items = props.items.length ? props.items : [];
    for (const [index, item] of items.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", index === selectedIndex ? "true" : "false");
      button.style.width = "100%";
      button.style.border = "0";
      button.style.borderRadius = "6px";
      button.style.background = index === selectedIndex ? "var(--accent)" : "transparent";
      button.style.color = index === selectedIndex ? "var(--accent-foreground)" : "var(--foreground)";
      button.style.cursor = "pointer";
      button.style.display = "grid";
      button.style.gap = "2px";
      button.style.padding = "8px 10px";
      button.style.textAlign = "left";
      button.addEventListener("mouseenter", () => {
        selectedIndex = index;
        render(props);
      });
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => selectItem(index));

      const label = document.createElement("span");
      label.textContent = item.label;
      label.style.fontSize = "13px";
      label.style.fontWeight = "600";

      const description = document.createElement("span");
      description.textContent = item.description;
      description.style.color = "var(--muted-foreground)";
      description.style.fontSize = "12px";

      button.append(label, description);
      root.append(button);
    }
  };

  return {
    onStart: (props: SuggestionProps<SlashCommandItem, SlashCommandItem>) => {
      root = document.createElement("div");
      selectedIndex = 0;
      unmount = props.mount(root, { autoUpdate: { animationFrame: true } });
      render(props);
    },
    onUpdate: (props: SuggestionProps<SlashCommandItem, SlashCommandItem>) => {
      render(props);
    },
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (!latestProps?.items.length) return false;
      if (event.key === "ArrowDown") {
        selectedIndex = (selectedIndex + 1) % latestProps.items.length;
        render(latestProps);
        return true;
      }
      if (event.key === "ArrowUp") {
        selectedIndex = (selectedIndex + latestProps.items.length - 1) % latestProps.items.length;
        render(latestProps);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
    onExit: () => {
      unmount?.();
      root?.remove();
      root = null;
      unmount = null;
      latestProps = null;
      selectedIndex = 0;
    },
  };
}

const SlashCommand = Extension.create({
  name: "builderSlashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem, SlashCommandItem>({
        editor: this.editor,
        char: "/",
        allowSpaces: true,
        startOfLine: false,
        items: ({ query }) => slashCommandItems(query).slice(0, 8),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: createSlashCommandList,
      }),
    ];
  },
});

const EDITOR_EXTENSIONS = [
  StarterKit,
  TiptapMarkdown.configure({
    indentation: {
      style: "space",
      size: 2,
    },
  }),
  SlashCommand,
];

function ToolbarButton({
  active,
  children,
  disabled,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <Button
      aria-label={title}
      className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}
      disabled={disabled}
      onClick={onClick}
      size="icon"
      title={title}
      variant="ghost"
    >
      {children}
    </Button>
  );
}

function MarkdownEditorToolbar({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  const inactive = disabled || !editor;
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/20 px-2 py-1.5">
      <ToolbarButton disabled={inactive} onClick={() => editor?.chain().focus().undo().run()} title="되돌리기">
        <UndoIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton disabled={inactive} onClick={() => editor?.chain().focus().redo().run()} title="다시 실행">
        <RedoIcon className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton active={editor?.isActive("paragraph")} disabled={inactive} onClick={() => editor?.chain().focus().setParagraph().run()} title="본문">
        <PilcrowIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor?.isActive("heading", { level: 1 })} disabled={inactive} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} title="제목 1">
        <Heading1Icon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor?.isActive("heading", { level: 2 })} disabled={inactive} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="제목 2">
        <Heading2Icon className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton active={editor?.isActive("bold")} disabled={inactive} onClick={() => editor?.chain().focus().toggleBold().run()} title="굵게">
        <BoldIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor?.isActive("italic")} disabled={inactive} onClick={() => editor?.chain().focus().toggleItalic().run()} title="기울임">
        <ItalicIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor?.isActive("code")} disabled={inactive} onClick={() => editor?.chain().focus().toggleCode().run()} title="인라인 코드">
        <CodeIcon className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton active={editor?.isActive("bulletList")} disabled={inactive} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="글머리 목록">
        <ListIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor?.isActive("orderedList")} disabled={inactive} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="번호 목록">
        <ListOrderedIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor?.isActive("blockquote")} disabled={inactive} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="인용">
        <QuoteIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor?.isActive("codeBlock")} disabled={inactive} onClick={() => editor?.chain().focus().setCodeBlock().run()} title="코드 블록">
        <CodeIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton disabled={inactive} onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="구분선">
        <MinusIcon className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

export function MarkdownEditor({
  disabled,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const currentMarkdownRef = useRef(value);
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: value,
    contentType: "markdown",
    editable: !disabled,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: cn(
          BUILDER_MARKDOWN_CONTENT_CLASS,
          "min-h-[520px] w-full bg-background px-5 py-4 text-foreground outline-none focus:outline-none",
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = editor.getMarkdown();
      currentMarkdownRef.current = markdown;
      onChange(markdown);
    },
  }, []);

  const normalizedValue = useMemo(() => value ?? "", [value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    if (normalizedValue === currentMarkdownRef.current) return;
    currentMarkdownRef.current = normalizedValue;
    editor.commands.setContent(normalizedValue, { contentType: "markdown", emitUpdate: false });
  }, [editor, normalizedValue]);

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <MarkdownEditorToolbar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} />
    </div>
  );
}
