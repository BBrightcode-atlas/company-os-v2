import { createContext, useContext, useMemo, useState, type ComponentProps, type FormEvent, type HTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import {
  ArrowDownIcon,
  ChevronDownIcon,
  CornerDownLeftIcon,
  Loader2Icon,
  SearchIcon,
} from "lucide-react";
import { Button, Textarea, cn } from "./primitives.js";

export type ChatRole = "system" | "user" | "assistant" | "data";

export type ConversationProps = HTMLAttributes<HTMLDivElement>;

export function Conversation({ className, ...props }: ConversationProps) {
  return (
    <div
      className={cn("relative flex min-h-0 flex-1 overflow-hidden", className)}
      role="log"
      {...props}
    />
  );
}

export type ConversationContentProps = HTMLAttributes<HTMLDivElement>;

export function ConversationContent({ className, ...props }: ConversationContentProps) {
  return <div className={cn("flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-4", className)} {...props} />;
}

export type ConversationEmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  icon?: ReactNode;
};

export function ConversationEmptyState({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) {
  return (
    <div className={cn("flex size-full flex-col items-center justify-center gap-3 p-8 text-center", className)} {...props}>
      {children ?? (
        <>
          {icon ? <div className="text-muted-foreground">{icon}</div> : null}
          <div className="space-y-1">
            <h3 className="text-sm font-medium">{title}</h3>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </>
      )}
    </div>
  );
}

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export function ConversationScrollButton({ className, ...props }: ConversationScrollButtonProps) {
  return (
    <Button
      aria-label="Scroll to latest message"
      className={cn("absolute bottom-4 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full", className)}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDownIcon className="h-4 w-4" />
    </Button>
  );
}

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: ChatRole;
};

const MessageRoleContext = createContext<ChatRole | null>(null);

export function Message({ className, from, style, ...props }: MessageProps) {
  return (
    <MessageRoleContext.Provider value={from}>
      <div
        className={cn(
          "group flex w-full flex-col gap-2",
          from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
          className,
        )}
        style={{ maxWidth: "95%", ...style }}
        {...props}
      />
    </MessageRoleContext.Provider>
  );
}

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export function MessageContent({ className, style, ...props }: MessageContentProps) {
  const role = useContext(MessageRoleContext);
  const userStyle = role === "user"
    ? {
      marginLeft: "auto",
      borderRadius: "0.5rem",
      background: "var(--secondary)",
      padding: "0.75rem 1rem",
      color: "var(--foreground)",
    }
    : null;
  return (
    <div
      className={cn(
        "flex w-fit max-w-full min-w-0 flex-col gap-2 overflow-hidden text-sm",
        role === "user"
          ? "ml-auto rounded-lg bg-secondary px-4 py-3 text-foreground"
          : "text-foreground",
        className,
      )}
      style={{ width: "fit-content", ...userStyle, ...style }}
      {...props}
    />
  );
}

export interface PromptInputMessage {
  text: string;
  files: never[];
}

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  onSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function PromptInput({ className, onSubmit, children, ...props }: PromptInputProps) {
  const [value, setValue] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    await onSubmit({ text, files: [] }, event);
    setValue("");
  }

  const context = useMemo(() => ({ value, setValue }), [value]);

  return (
    <PromptInputContext.Provider value={context}>
      <form className={cn("w-full rounded-lg border border-border bg-background shadow-sm", className)} onSubmit={submit} {...props}>
        {children}
      </form>
    </PromptInputContext.Provider>
  );
}

const PromptInputContext = createContext<{
  value: string;
  setValue: (value: string) => void;
} | null>(null);

function usePromptInputContext() {
  const context = useContext(PromptInputContext);
  if (!context) throw new Error("PromptInput components must be used within PromptInput");
  return context;
}

export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputBody({ className, ...props }: PromptInputBodyProps) {
  return <div className={cn("contents", className)} {...props} />;
}

export type PromptInputTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function PromptInputTextarea({ className, placeholder = "PM Agent에게 요청하기...", ...props }: PromptInputTextareaProps) {
  const context = usePromptInputContext();

  return (
    <Textarea
      className={cn("min-h-20 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0", className)}
      name="message"
      onChange={(event) => context.setValue(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }}
      placeholder={placeholder}
      value={context.value}
      {...props}
    />
  );
}

export type PromptInputFooterProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputFooter({ className, ...props }: PromptInputFooterProps) {
  return <div className={cn("flex items-center justify-between gap-2 border-t border-border px-2 py-2", className)} {...props} />;
}

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputTools({ className, ...props }: PromptInputToolsProps) {
  return <div className={cn("flex items-center gap-1", className)} {...props} />;
}

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  status?: "submitted" | "streaming" | "ready" | "error";
};

export function PromptInputSubmit({ className, status, children, ...props }: PromptInputSubmitProps) {
  return (
    <Button
      aria-label="Submit"
      className={cn("h-8 w-8", className)}
      size="icon"
      type="submit"
      {...props}
    >
      {children ?? (status === "submitted" || status === "streaming" ? (
        <Loader2Icon className="h-4 w-4 animate-spin" />
      ) : (
        <CornerDownLeftIcon className="h-4 w-4" />
      ))}
    </Button>
  );
}

export type TaskProps = HTMLAttributes<HTMLDetailsElement> & {
  defaultOpen?: boolean;
};

export function Task({ className, defaultOpen = true, ...props }: TaskProps) {
  return <details className={cn("group", className)} open={defaultOpen} {...props} />;
}

export type TaskTriggerProps = HTMLAttributes<HTMLElement> & {
  title: string;
};

export function TaskTrigger({ className, title, children, ...props }: TaskTriggerProps) {
  return (
    <summary
      className={cn("flex cursor-pointer list-none items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground", className)}
      {...props}
    >
      {children ?? (
        <>
          <SearchIcon className="h-4 w-4" />
          <span className="font-medium">{title}</span>
          <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
        </>
      )}
    </summary>
  );
}

export type TaskContentProps = HTMLAttributes<HTMLDivElement>;

export function TaskContent({ className, ...props }: TaskContentProps) {
  return <div className={cn("mt-3 space-y-2 border-l-2 border-muted pl-4", className)} {...props} />;
}

export type TaskItemProps = HTMLAttributes<HTMLDivElement>;

export function TaskItem({ className, ...props }: TaskItemProps) {
  return <div className={cn("text-sm leading-5 text-muted-foreground", className)} {...props} />;
}
