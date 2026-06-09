import { forwardRef, useCallback, useLayoutEffect, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

/**
 * Bound a page-slot root to fill from its own top down to the viewport bottom.
 *
 * The host mounts plugin `page` slots inline inside an auto-height, page-scrolling
 * container (no bounded scroll ancestor). A chat composer pinned with `sticky bottom-0`
 * therefore floats over the message list instead of sitting below it. Giving the root a
 * fixed height (measured = viewport height − the root's offset) turns it into a self-
 * contained flex column: the message list scrolls internally and the composer stays a
 * non-overlapping flex sibling. Height is an inline style so Tailwind's JIT can't purge it.
 */
export function useFillHeight(pad = 16) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    setHeight(Math.max(320, Math.round(window.innerHeight - top - pad)));
  }, [pad]);
  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  return { ref, height };
}

/** Inline styles for the fill-height chat layout (purge-proof). */
export const fillCol = (height: number | undefined) =>
  ({ height: height ? `${height}px` : undefined, display: "flex", flexDirection: "column", minHeight: 0 }) as const;
export const fillScroll = { flex: "1 1 0%", minHeight: 0, overflowY: "auto" } as const;
export const fillFixed = { flex: "0 0 auto" } as const;

/**
 * shadcn-faithful primitives for the plugin UI. The plugin renders inline (createRoot) into the
 * host document, so the host's compiled Tailwind + shadcn design tokens apply to these className
 * strings (verified). Class strings mirror the host's @/components/ui so the plugin matches the
 * rest of Paperclip. No cva/clsx/radix deps — a tiny cn() + literal variant maps keep the bundle lean.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium " +
  "transition-colors disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none " +
  "focus-visible:ring-ring/50 focus-visible:ring-[3px] [&_svg]:pointer-events-none [&_svg]:shrink-0";
const BTN_VARIANT = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
} as const;
const BTN_SIZE = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md gap-1.5 px-3",
  xs: "h-6 gap-1 rounded-md px-2 text-xs",
  icon: "size-9",
  "icon-sm": "size-8",
  "icon-xs": "size-6 rounded-md",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BTN_VARIANT;
  size?: keyof typeof BTN_SIZE;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)}
      {...props}
    />
  );
});

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "border-input placeholder:text-muted-foreground h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "placeholder:text-muted-foreground w-full resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

const BADGE_VARIANT = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border-border text-foreground",
} as const;
export function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: keyof typeof BADGE_VARIANT;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2 py-0.5 text-xs font-medium",
        BADGE_VARIANT[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Circular avatar fallback (initials). Override colors via className (e.g. human bubbles). */
export function Avatar({
  children,
  size = "default",
  className,
}: {
  children: ReactNode;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const s = size === "lg" ? "size-10 text-sm" : size === "sm" ? "size-6 text-xs" : "size-8 text-xs";
  return (
    <span
      className={cn(
        "bg-primary text-primary-foreground flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        s,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-card text-card-foreground rounded-md border shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}
