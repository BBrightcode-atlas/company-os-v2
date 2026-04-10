import { api } from "./client";

export interface SubAgentRun {
  id: string;
  companyId: string;
  leaderAgentId: string;
  subAgentId: string;
  issueId: string | null;
  status: "started" | "completed" | "failed";
  task: string;
  result: string | null;
  rating: "thumbs_up" | "thumbs_down" | null;
  ratedByUserId: string | null;
  ratedAt: string | null;
  durationMs: number | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const subAgentRunsApi = {
  list: (companyId: string, filter?: { subAgentId?: string; leaderAgentId?: string }) => {
    const params = new URLSearchParams();
    if (filter?.subAgentId) params.set("subAgentId", filter.subAgentId);
    if (filter?.leaderAgentId) params.set("leaderAgentId", filter.leaderAgentId);
    const qs = params.toString();
    return api.get<SubAgentRun[]>(`/companies/${companyId}/sub-agent-runs${qs ? `?${qs}` : ""}`);
  },
  listForAgent: (agentId: string) =>
    api.get<SubAgentRun[]>(`/agents/${agentId}/sub-agent-runs`),
  listByLeader: (agentId: string) =>
    api.get<SubAgentRun[]>(`/agents/${agentId}/delegated-runs`),
  rate: (id: string, rating: "thumbs_up" | "thumbs_down") =>
    api.patch<SubAgentRun>(`/sub-agent-runs/${id}/rate`, { rating }),
};
