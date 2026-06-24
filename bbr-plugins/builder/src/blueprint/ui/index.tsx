import {
  useHostContext,
  useHostNavigation,
  type PluginPageProps,
  type PluginSidebarProps,
} from "@paperclipai/plugin-sdk/ui";
import {
  ALLOWED_COMPANY_PREFIX,
  PAGE_ROUTE,
  isAllowedCompany,
} from "../contract.js";
import { cn } from "../../ui/primitives.js";

const sidebarItemBase =
  "flex items-center gap-2.5 px-3 py-2 pointer-coarse:py-1.5 text-[13px] font-medium transition-colors";

export function CosBlueprintPage(_props: PluginPageProps) {
  const context = useHostContext();
  if (!isAllowedCompany(context?.companyId, context?.companyPrefix ?? ALLOWED_COMPANY_PREFIX)) {
    return null;
  }
  return <div data-testid="cos-blueprint-empty" />;
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
