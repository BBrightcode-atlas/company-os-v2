import { api } from "./client";

export interface Team {
  id: string;
  companyId: string;
  name: string;
  identifier: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  leadAgentId: string | null;
  leadUserId: string | null;
  status: string;
  issueCounter: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  agentId: string | null;
  userId: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStatus {
  id: string;
  teamId: string;
  name: string;
  slug: string;
  category: string;
  color: string | null;
  description: string | null;
  position: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTeamMembership {
  team: Team;
  role: string;
  memberCreatedAt: string;
}

/** Flat row from `/companies/:cid/agent-team-memberships`. */
export interface AgentTeamMembershipRow {
  agentId: string;
  role: string;
  teamId: string;
  name: string;
  identifier: string;
  color: string | null;
}

export interface LeaderTeamInstructionsSubAgent {
  id: string;
  name: string;
  title: string | null;
  capabilities: string | null;
}

export interface LeaderTeamInstructionsTeam {
  id: string;
  name: string;
  identifier: string;
  subAgents: LeaderTeamInstructionsSubAgent[];
}

export interface LeaderTeamInstructions {
  teams: LeaderTeamInstructionsTeam[];
  markdown: string;
}

export const teamsApi = {
  list: (companyId: string) => api.get<Team[]>(`/companies/${companyId}/teams`),
  listForAgent: (companyId: string, agentId: string) =>
    api.get<AgentTeamMembership[]>(
      `/companies/${companyId}/agents/${agentId}/teams`,
    ),
  leaderInstructions: (companyId: string, agentId: string) =>
    api.get<LeaderTeamInstructions>(
      `/companies/${companyId}/agents/${agentId}/team-instructions`,
    ),
  agentMemberships: (companyId: string) =>
    api.get<AgentTeamMembershipRow[]>(
      `/companies/${companyId}/agent-team-memberships`,
    ),
  get: (companyId: string, teamId: string) =>
    api.get<Team>(`/companies/${companyId}/teams/${teamId}`),
  create: (companyId: string, data: Partial<Team>) =>
    api.post<Team>(`/companies/${companyId}/teams`, data),
  update: (companyId: string, teamId: string, data: Partial<Team>) =>
    api.patch<Team>(`/companies/${companyId}/teams/${teamId}`, data),
  remove: (companyId: string, teamId: string) =>
    api.delete<Team>(`/companies/${companyId}/teams/${teamId}`),

  // Members
  listMembers: (companyId: string, teamId: string) =>
    api.get<TeamMember[]>(`/companies/${companyId}/teams/${teamId}/members`),
  addMember: (companyId: string, teamId: string, data: { agentId?: string; userId?: string; role?: string }) =>
    api.post<TeamMember>(`/companies/${companyId}/teams/${teamId}/members`, data),
  removeMember: (companyId: string, teamId: string, memberId: string) =>
    api.delete<TeamMember>(`/companies/${companyId}/teams/${teamId}/members/${memberId}`),

  // Workflow statuses
  listWorkflowStatuses: (companyId: string, teamId: string) =>
    api.get<WorkflowStatus[]>(`/companies/${companyId}/teams/${teamId}/workflow-statuses`),
  createWorkflowStatus: (companyId: string, teamId: string, data: Partial<WorkflowStatus>) =>
    api.post<WorkflowStatus>(`/companies/${companyId}/teams/${teamId}/workflow-statuses`, data),
  updateWorkflowStatus: (
    companyId: string,
    teamId: string,
    statusId: string,
    data: Partial<WorkflowStatus>,
  ) =>
    api.patch<WorkflowStatus>(
      `/companies/${companyId}/teams/${teamId}/workflow-statuses/${statusId}`,
      data,
    ),
  removeWorkflowStatus: (companyId: string, teamId: string, statusId: string) =>
    api.delete<WorkflowStatus>(
      `/companies/${companyId}/teams/${teamId}/workflow-statuses/${statusId}`,
    ),
};
