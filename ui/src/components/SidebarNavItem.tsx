import type * as React from "react";
import { NavLink } from "@/lib/router";
import { SIDEBAR_SCROLL_RESET_STATE } from "../lib/navigation-scroll";
import { cn } from "../lib/utils";
import { useSidebar } from "../context/SidebarContext";
import type { LucideIcon } from "lucide-react";

const NAV_ITEM_BASE =
  "flex items-center gap-2.5 px-3 py-2 pointer-coarse:py-1.5 text-[13px] font-medium transition-colors";
const NAV_ITEM_ACTIVE = "bg-accent text-foreground";
const NAV_ITEM_INACTIVE = "text-foreground/80 hover:bg-accent/50 hover:text-foreground";

/** Any component that accepts a `className` (lucide icons or inline SVG). */
type IconLike = React.ComponentType<{ className?: string }>;

interface SidebarNavItemInnerProps {
  icon: IconLike;
  label: string;
  badge?: number;
  badgeTone?: "default" | "danger";
  textBadge?: string;
  textBadgeTone?: "default" | "amber";
  alert?: boolean;
  liveCount?: number;
}

/** Shared inner content (icon + label + badges) — no anchor, no routing. */
function SidebarNavItemInner({
  icon: Icon,
  label,
  badge,
  badgeTone = "default",
  textBadge,
  textBadgeTone = "default",
  alert = false,
  liveCount,
}: SidebarNavItemInnerProps) {
  return (
    <>
      <span className="relative shrink-0">
        <Icon className="h-4 w-4" />
        {alert && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_0_2px_hsl(var(--background))]" />
        )}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {textBadge && (
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
            textBadgeTone === "amber"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {textBadge}
        </span>
      )}
      {liveCount != null && liveCount > 0 && (
        <span className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">{liveCount} live</span>
        </span>
      )}
      {badge != null && badge > 0 && (
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-0.5 text-xs leading-none",
            badgeTone === "danger" ? "bg-red-600/90 text-red-50" : "bg-primary text-primary-foreground",
          )}
        >
          {badge}
        </span>
      )}
    </>
  );
}

export interface SidebarNavItemViewProps extends SidebarNavItemInnerProps {
  /** Pre-resolved href (already company-scoped). Use with `onClick` for SPA navigation. */
  href?: string;
  /** Whether this item is the active route. Caller computes this. */
  active?: boolean;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}

/**
 * Presentational sidebar nav item — renders the exact host nav-item markup but
 * takes an explicit `href`/`active`/`onClick` instead of depending on the host
 * router/company context. Safe to render outside a `<Router>` (e.g. inside a
 * plugin UI mounted through the bridge), where the host `SidebarNavItem` cannot
 * resolve company-scoped routes or active state.
 */
export function SidebarNavItemView({
  href,
  active = false,
  onClick,
  className,
  ...inner
}: SidebarNavItemViewProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(NAV_ITEM_BASE, active ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE, className)}
    >
      <SidebarNavItemInner {...inner} />
    </a>
  );
}

interface SidebarNavItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  className?: string;
  badge?: number;
  badgeTone?: "default" | "danger";
  textBadge?: string;
  textBadgeTone?: "default" | "amber";
  alert?: boolean;
  liveCount?: number;
}

export function SidebarNavItem({ to, end, className, ...inner }: SidebarNavItemProps) {
  const { isMobile, setSidebarOpen } = useSidebar();

  return (
    <NavLink
      to={to}
      state={SIDEBAR_SCROLL_RESET_STATE}
      end={end}
      onClick={() => {
        if (isMobile) setSidebarOpen(false);
      }}
      className={({ isActive }) =>
        cn(NAV_ITEM_BASE, isActive ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE, className)
      }
    >
      <SidebarNavItemInner {...inner} />
    </NavLink>
  );
}
