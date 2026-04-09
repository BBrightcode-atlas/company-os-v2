/**
 * Compact "Work Products" card for the issue detail page.
 * Phase 5.2d — surfaces GitHub PRs (and any other work products
 * registered via `POST /issues/:id/work-products`) attached to the
 * current issue. Each row shows the provider icon, status badge, PR
 * title, and a click-through link.
 *
 * Kept intentionally small and read-only: creation/edit happens
 * elsewhere (webhooks, manual POST). Falls back to rendering nothing
 * when the issue has no work products so it does not clutter the page.
 */

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, GitPullRequest } from "lucide-react";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import { useT } from "../i18n";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-600",
  merged: "bg-purple-500/15 text-purple-600",
  closed: "bg-muted text-muted-foreground",
};

export function IssueWorkProductsSection({ issueId }: { issueId: string }) {
  const { t } = useT();
  const { data } = useQuery({
    queryKey: queryKeys.issues.workProducts(issueId),
    queryFn: () => issuesApi.listWorkProducts(issueId),
    enabled: !!issueId,
    refetchInterval: 15000,
  });

  const rows = data ?? [];
  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <GitPullRequest className="h-4 w-4" /> {t("issue.workProducts")}
        </h3>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {rows.length} linked
        </span>
      </div>
      <div className="border border-border rounded-lg divide-y divide-border">
        {rows.map((wp) => (
          <a
            key={wp.id}
            href={wp.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-accent/30 transition-colors"
          >
            <GitPullRequest className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                STATUS_STYLES[wp.status] ?? "bg-muted",
              )}
            >
              {wp.status}
            </span>
            <span className="flex-1 truncate">{wp.title || wp.externalId || wp.url}</span>
            <span className="text-muted-foreground shrink-0">{wp.provider}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}
