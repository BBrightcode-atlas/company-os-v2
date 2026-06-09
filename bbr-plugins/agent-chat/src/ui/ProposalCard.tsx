import { Badge, Button, Card } from "./ui.js";

export interface Proposal {
  id: string;
  messageId: string | null;
  kind: "issue" | "goal" | "roadmap";
  title: string;
  status: "pending" | "applied" | "discarded" | "failed";
  payload: {
    title?: string;
    description?: string;
    projectName?: string | null;
    assigneeName?: string | null;
    priority?: string;
    level?: string;
    ownerName?: string | null;
    // roadmap
    goalTitle?: string;
    goalDescription?: string;
    goalLevel?: string;
    issues?: { title: string; assigneeName?: string | null; priority?: string; blockedByIndexes?: number[] }[];
  };
  appliedResult?: { identifier?: string | null; count?: number } | null;
}

/** Confirm card for a conversation-derived issue / goal / roadmap proposal. Used by DM + room. */
export function ProposalCard({
  p,
  busy,
  onApply,
  onDiscard,
}: {
  p: Proposal;
  busy: boolean;
  onApply: (start: boolean) => void;
  onDiscard: () => void;
}) {
  const kindLabel = p.kind === "issue" ? "이슈 초안" : p.kind === "goal" ? "목표 초안" : "로드맵 초안";
  const isRoadmap = p.kind === "roadmap";

  if (p.status === "applied") {
    const extra = isRoadmap
      ? p.appliedResult?.count != null
        ? ` (이슈 ${p.appliedResult.count}개)`
        : ""
      : p.appliedResult?.identifier
        ? `: ${p.appliedResult.identifier}`
        : "";
    return <div className="pl-9 text-xs text-muted-foreground">✅ {kindLabel} 생성됨{extra}</div>;
  }
  if (p.status === "discarded" || p.status === "failed") {
    return (
      <div className="pl-9 text-xs text-muted-foreground">
        {p.status === "failed" ? "⚠ 생성 실패" : "취소됨"}: {p.title}
      </div>
    );
  }

  const willStart =
    (p.kind === "issue" && Boolean(p.payload.assigneeName)) ||
    (isRoadmap && (p.payload.issues ?? []).some((i) => i.assigneeName));

  return (
    <div className="flex gap-2.5">
      <span className="w-6 shrink-0" />
      <Card className="min-w-0 flex-1 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="border-primary uppercase tracking-wide text-primary">
            {kindLabel}
          </Badge>
          <span className="truncate text-sm font-semibold">{isRoadmap ? p.payload.goalTitle ?? p.title : p.title}</span>
        </div>

        {!isRoadmap && (
          <>
            {p.payload.description && (
              <div className="mb-2 whitespace-pre-wrap text-sm text-foreground">{p.payload.description}</div>
            )}
            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {p.payload.projectName && <span>프로젝트: <b className="text-foreground">{p.payload.projectName}</b></span>}
              {p.payload.assigneeName && <span>담당: <b className="text-foreground">{p.payload.assigneeName}</b></span>}
              {p.payload.priority && <span>우선순위: {p.payload.priority}</span>}
              {p.payload.level && <span>레벨: {p.payload.level}</span>}
              {p.payload.ownerName && <span>오너: <b className="text-foreground">{p.payload.ownerName}</b></span>}
            </div>
          </>
        )}

        {isRoadmap && (
          <>
            {p.payload.goalDescription && (
              <div className="mb-2 whitespace-pre-wrap text-sm text-foreground">{p.payload.goalDescription}</div>
            )}
            <div className="mb-2 flex flex-col gap-1">
              {(p.payload.issues ?? []).map((iss, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{iss.title}</span>
                  {iss.assigneeName && <span className="shrink-0 text-muted-foreground">{iss.assigneeName}</span>}
                  {iss.priority && <span className="shrink-0 text-muted-foreground">·{iss.priority}</span>}
                  {iss.blockedByIndexes && iss.blockedByIndexes.length > 0 && (
                    <span className="shrink-0 text-muted-foreground" title="의존(blockedBy)">
                      ⛓{iss.blockedByIndexes.map((j) => j + 1).join(",")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {willStart && (
          <div className="mb-2 text-xs text-muted-foreground">⚠ 확인 시 담당 에이전트가 지금 작업을 시작합니다.</div>
        )}
        <div className="flex gap-2">
          <Button size="sm" disabled={busy} onClick={() => onApply(true)}>
            {willStart ? "생성 + 시작" : "생성"}
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onApply(false)}>
            백로그로 생성
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={onDiscard}>
            취소
          </Button>
        </div>
      </Card>
    </div>
  );
}
