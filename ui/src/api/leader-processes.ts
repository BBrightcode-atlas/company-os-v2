import { api } from "./client";

/**
 * Phase 4: leader CLI lifecycle API client.
 * @see server/src/routes/leader-processes.ts
 */

export type LeaderProcessStatus =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "crashed";

export interface LeaderProcessRow {
  id: string;
  companyId: string;
  agentId: string;
  projectId: string | null;
  sessionId: string | null;
  status: LeaderProcessStatus;
  pm2Name: string | null;
  pm2PmId: number | null;
  pid: number | null;
  agentKeyId: string | null;
  startedAt: string | null;
  stoppedAt: string | null;
  lastHeartbeatAt: string | null;
  exitCode: number | null;
  exitReason: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderProcessStatusDetail {
  row: LeaderProcessRow | null;
  alive: boolean;
}

export interface LeaderProcessLogs {
  lines: string[];
}

export const leaderProcessesApi = {
  start: (companyId: string, agentId: string, projectId?: string) =>
    api.post<LeaderProcessRow>(
      `/companies/${companyId}/agents/${agentId}/cli/start`,
      projectId ? { projectId } : {},
    ),
  stop: (companyId: string, agentId: string, opts?: { projectId?: string; timeoutMs?: number }) =>
    api.post<LeaderProcessRow>(
      `/companies/${companyId}/agents/${agentId}/cli/stop`,
      {
        ...(opts?.projectId ? { projectId: opts.projectId } : {}),
        ...(opts?.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
      },
    ),
  restart: (companyId: string, agentId: string, projectId?: string) =>
    api.post<LeaderProcessRow>(
      `/companies/${companyId}/agents/${agentId}/cli/restart`,
      projectId ? { projectId } : {},
    ),
  status: (companyId: string, agentId: string, projectId?: string) =>
    api.get<LeaderProcessStatusDetail>(
      `/companies/${companyId}/agents/${agentId}/cli/status${projectId ? `?projectId=${projectId}` : ""}`,
    ),
  logs: (
    companyId: string,
    agentId: string,
    opts?: { kind?: "out" | "err"; lines?: number; projectId?: string },
  ) => {
    const params = new URLSearchParams();
    if (opts?.kind) params.set("kind", opts.kind);
    if (opts?.lines) params.set("lines", String(opts.lines));
    if (opts?.projectId) params.set("projectId", opts.projectId);
    const qs = params.toString();
    return api.get<LeaderProcessLogs>(
      `/companies/${companyId}/agents/${agentId}/cli/logs${qs ? `?${qs}` : ""}`,
    );
  },
  listForCompany: (companyId: string) =>
    api.get<LeaderProcessRow[]>(`/companies/${companyId}/leader-processes`),
};
