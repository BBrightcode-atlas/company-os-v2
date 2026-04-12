import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, autoAssignmentLog, heartbeatRuns, issues } from "@paperclipai/db";
import { logger } from "../middleware/logger.js";
import { queueIssueAssignmentWakeup, type IssueAssignmentWakeupDeps } from "./issue-assignment-wakeup.js";
import { instanceSettingsService } from "./instance-settings.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CandidateAgent {
  agentId: string;
  name: string;
  score: number;
  reasoning: string;
}

interface MatchResult {
  issueId: string;
  agentId: string;
  score: number;
  reasoning: string;
  candidates: CandidateAgent[];
}

interface AutoAssignmentConfig {
  anthropicApiKey: string;
  scoreThreshold: number;
  maxIssuesPerRun: number;
  model: string;
}

interface AutoAssignmentLogEntry {
  id: string;
  companyId: string;
  issueId: string;
  assignedAgentId: string;
  llmReasoning: string | null;
  llmScore: number | null;
  candidateAgents: CandidateAgent[] | null;
  assignmentSource: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SCORE_THRESHOLD = 0.6;
const DEFAULT_MAX_ISSUES_PER_RUN = 10;
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const EXCLUDED_ROLES = ["ceo", "manager"];
const EXCLUDED_STATUSES = ["backlog", "done", "cancelled"];

// ---------------------------------------------------------------------------
// LLM Matcher
// ---------------------------------------------------------------------------

async function matchWithLLM(
  config: AutoAssignmentConfig,
  issueList: Array<{ id: string; title: string; description: string | null; priority: string }>,
  agentList: Array<{ id: string; name: string; role: string; capabilities: string | null; title: string | null }>,
): Promise<MatchResult[]> {
  const prompt = buildMatchingPrompt(issueList, agentList);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = data.content.find((c) => c.type === "text")?.text ?? "";
  return parseMatchResponse(text, agentList);
}

function buildMatchingPrompt(
  issueList: Array<{ id: string; title: string; description: string | null; priority: string }>,
  agentList: Array<{ id: string; name: string; role: string; capabilities: string | null; title: string | null }>,
): string {
  const issuesText = issueList
    .map(
      (i) =>
        `- Issue ${i.id}: [${i.priority}] "${i.title}"${i.description ? `\n  Description: ${i.description.slice(0, 300)}` : ""}`,
    )
    .join("\n");

  const agentsText = agentList
    .map(
      (a) =>
        `- Agent ${a.id}: "${a.name}" (role: ${a.role}${a.title ? `, title: ${a.title}` : ""})${a.capabilities ? `\n  Capabilities: ${a.capabilities.slice(0, 300)}` : ""}`,
    )
    .join("\n");

  return `You are a task assignment optimizer. Given a list of unassigned issues and available agents, match each issue to the most suitable agent.

Rules:
- Each agent can be assigned at most 1 issue.
- Match based on agent capabilities, role, and issue requirements.
- If no agent is a good fit for an issue, skip it.
- Score each match from 0.0 to 1.0 (1.0 = perfect match).

Issues:
${issuesText}

Available Agents:
${agentsText}

Respond with ONLY a JSON array. Each element:
{"issueId": "<issue-uuid>", "agentId": "<agent-uuid>", "score": 0.85, "reasoning": "Brief reason"}

If no good matches exist, return an empty array [].`;
}

function parseMatchResponse(
  text: string,
  agentList: Array<{ id: string; name: string }>,
): MatchResult[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const raw = JSON.parse(jsonMatch[0]) as Array<{
      issueId: string;
      agentId: string;
      score: number;
      reasoning: string;
    }>;

    const agentMap = new Map(agentList.map((a) => [a.id, a.name]));
    const usedAgents = new Set<string>();

    return raw
      .filter((m) => {
        if (usedAgents.has(m.agentId)) return false;
        usedAgents.add(m.agentId);
        return true;
      })
      .map((m) => ({
        issueId: m.issueId,
        agentId: m.agentId,
        score: m.score,
        reasoning: m.reasoning,
        candidates: [
          {
            agentId: m.agentId,
            name: agentMap.get(m.agentId) ?? "unknown",
            score: m.score,
            reasoning: m.reasoning,
          },
        ],
      }));
  } catch {
    logger.warn({ text: text.slice(0, 200) }, "Failed to parse LLM match response");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export function autoAssignmentService(db: Db) {
  // -----------------------------------------------------------------------
  // 1. Find unassigned issues
  // -----------------------------------------------------------------------
  async function findUnassignedIssues(companyId: string, limit: number) {
    return db
      .select({
        id: issues.id,
        title: issues.title,
        description: issues.description,
        priority: issues.priority,
      })
      .from(issues)
      .where(
        and(
          eq(issues.companyId, companyId),
          inArray(issues.status, ["todo"]),
          isNull(issues.assigneeAgentId),
          isNull(issues.assigneeUserId),
          isNull(issues.parentId),
        ),
      )
      .orderBy(
        sql`CASE ${issues.priority}
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END`,
        issues.createdAt,
      )
      .limit(limit);
  }

  // -----------------------------------------------------------------------
  // 2. Find idle agents
  // -----------------------------------------------------------------------
  async function findIdleAgents(companyId: string) {
    // Agents that are idle/running, not CEO/manager, not over budget
    const eligibleAgents = await db
      .select({
        id: agents.id,
        name: agents.name,
        role: agents.role,
        title: agents.title,
        capabilities: agents.capabilities,
        status: agents.status,
        budgetMonthlyCents: agents.budgetMonthlyCents,
        spentMonthlyCents: agents.spentMonthlyCents,
      })
      .from(agents)
      .where(
        and(
          eq(agents.companyId, companyId),
          inArray(agents.status, ["idle", "running"]),
          notInArray(agents.role, EXCLUDED_ROLES),
        ),
      );

    // Filter out agents with in_progress issues
    const agentsWithActiveWork = await db
      .select({ assigneeAgentId: issues.assigneeAgentId })
      .from(issues)
      .where(
        and(
          eq(issues.companyId, companyId),
          inArray(issues.status, ["in_progress"]),
          sql`${issues.assigneeAgentId} IS NOT NULL`,
        ),
      )
      .then((rows) => new Set(rows.map((r) => r.assigneeAgentId)));

    // Filter out agents with active heartbeat runs
    const agentsWithActiveRuns = await db
      .select({ agentId: heartbeatRuns.agentId })
      .from(heartbeatRuns)
      .where(
        and(
          eq(heartbeatRuns.companyId, companyId),
          inArray(heartbeatRuns.status, ["queued", "running"]),
        ),
      )
      .then((rows) => new Set(rows.map((r) => r.agentId)));

    return eligibleAgents.filter((a) => {
      if (agentsWithActiveWork.has(a.id)) return false;
      if (agentsWithActiveRuns.has(a.id)) return false;
      // Budget check: skip if ≥80% spent
      if (a.budgetMonthlyCents > 0 && a.spentMonthlyCents / a.budgetMonthlyCents >= 0.8) return false;
      return true;
    });
  }

  // -----------------------------------------------------------------------
  // 3. Execute assignment
  // -----------------------------------------------------------------------
  async function executeAssignment(
    companyId: string,
    match: MatchResult,
    heartbeat: IssueAssignmentWakeupDeps,
  ) {
    // Update issue assignee
    const [updated] = await db
      .update(issues)
      .set({
        assigneeAgentId: match.agentId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(issues.id, match.issueId),
          isNull(issues.assigneeAgentId),
          isNull(issues.assigneeUserId),
        ),
      )
      .returning({
        id: issues.id,
        assigneeAgentId: issues.assigneeAgentId,
        status: issues.status,
      });

    if (!updated) {
      logger.info({ issueId: match.issueId }, "Issue already assigned, skipping");
      return null;
    }

    // Log the assignment
    const [logEntry] = await db
      .insert(autoAssignmentLog)
      .values({
        companyId,
        issueId: match.issueId,
        assignedAgentId: match.agentId,
        llmReasoning: match.reasoning,
        llmScore: match.score,
        candidateAgents: match.candidates,
        assignmentSource: "auto_llm",
      })
      .returning();

    // Wake up the assigned agent
    queueIssueAssignmentWakeup({
      heartbeat,
      issue: { id: updated.id, assigneeAgentId: updated.assigneeAgentId, status: updated.status },
      reason: "auto_assignment",
      mutation: "auto_assign",
      contextSource: "auto-assignment-service",
      requestedByActorType: "system",
    });

    return logEntry;
  }

  // -----------------------------------------------------------------------
  // 4. Run auto-assignment tick
  // -----------------------------------------------------------------------
  async function runTick(
    companyId: string,
    heartbeat: IssueAssignmentWakeupDeps,
    config: AutoAssignmentConfig,
  ): Promise<{ assigned: number; skipped: number; errors: number }> {
    const result = { assigned: 0, skipped: 0, errors: 0 };

    const unassigned = await findUnassignedIssues(companyId, config.maxIssuesPerRun);
    if (unassigned.length === 0) {
      return result;
    }

    const idleAgents = await findIdleAgents(companyId);
    if (idleAgents.length === 0) {
      result.skipped = unassigned.length;
      return result;
    }

    let matches: MatchResult[];
    try {
      matches = await matchWithLLM(config, unassigned, idleAgents);
    } catch (err) {
      logger.error({ err, companyId }, "LLM matching failed");
      result.errors = unassigned.length;
      return result;
    }

    for (const match of matches) {
      if (match.score < config.scoreThreshold) {
        result.skipped++;
        continue;
      }

      try {
        const entry = await executeAssignment(companyId, match, heartbeat);
        if (entry) {
          result.assigned++;
          logger.info(
            { issueId: match.issueId, agentId: match.agentId, score: match.score },
            "Auto-assigned issue",
          );
        } else {
          result.skipped++;
        }
      } catch (err) {
        logger.error({ err, issueId: match.issueId }, "Failed to execute auto-assignment");
        result.errors++;
      }
    }

    result.skipped += unassigned.length - matches.length;
    return result;
  }

  // -----------------------------------------------------------------------
  // 5. Get assignment log
  // -----------------------------------------------------------------------
  async function getLog(
    companyId: string,
    limit = 50,
    offset = 0,
  ): Promise<AutoAssignmentLogEntry[]> {

    return db
      .select()
      .from(autoAssignmentLog)
      .where(eq(autoAssignmentLog.companyId, companyId))
      .orderBy(sql`${autoAssignmentLog.createdAt} DESC`)
      .limit(limit)
      .offset(offset);
  }

  return {
    findUnassignedIssues,
    findIdleAgents,
    runTick,
    getLog,
    DEFAULT_SCORE_THRESHOLD,
    DEFAULT_MAX_ISSUES_PER_RUN,
    DEFAULT_MODEL,
  };
}
