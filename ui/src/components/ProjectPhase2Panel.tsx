import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Props {
  projectId: string;
  companyId: string;
}

interface TeamLink {
  projectId: string;
  teamId: string;
  addedAt: string;
  team: { id: string; name: string; identifier: string; color: string | null; status: string };
}

interface ProjectMember {
  id: string;
  projectId: string;
  agentId: string | null;
  userId: string | null;
  role: string;
}

interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  status: string;
  sortOrder: number;
}

interface ProjectUpdate {
  id: string;
  projectId: string;
  health: string;
  body: string;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  identifier: string;
  color: string | null;
  status: string;
}

interface Agent {
  id: string;
  name: string;
}

const HEALTH_COLORS: Record<string, string> = {
  on_track: "#10B981",
  at_risk: "#F59E0B",
  off_track: "#EF4444",
};

export function ProjectPhase2Panel({ projectId, companyId }: Props) {
  const qc = useQueryClient();

  // Queries
  const teams = useQuery({
    queryKey: ["project-teams", projectId],
    queryFn: () => api.get<TeamLink[]>(`/companies/${companyId}/projects/${projectId}/teams`),
    enabled: !!projectId,
  });

  const members = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => api.get<ProjectMember[]>(`/companies/${companyId}/projects/${projectId}/members`),
    enabled: !!projectId,
  });

  const milestones = useQuery({
    queryKey: ["project-milestones", projectId],
    queryFn: () => api.get<Milestone[]>(`/companies/${companyId}/projects/${projectId}/milestones`),
    enabled: !!projectId,
  });

  const updates = useQuery({
    queryKey: ["project-updates", projectId],
    queryFn: () => api.get<ProjectUpdate[]>(`/companies/${companyId}/projects/${projectId}/updates`),
    enabled: !!projectId,
  });

  const allTeams = useQuery({
    queryKey: ["teams", companyId, "for-project-link"],
    queryFn: () => api.get<Team[]>(`/companies/${companyId}/teams`),
    enabled: !!companyId,
  });

  const allAgents = useQuery({
    queryKey: ["agents-for-project-member", companyId],
    queryFn: () => api.get<Agent[]>(`/companies/${companyId}/agents`),
    enabled: !!companyId,
  });

  // Mutations
  const addTeamMutation = useMutation({
    mutationFn: (teamId: string) =>
      api.post(`/companies/${companyId}/projects/${projectId}/teams`, { teamId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-teams", projectId] }),
  });

  const removeTeamMutation = useMutation({
    mutationFn: (teamId: string) =>
      api.delete(`/companies/${companyId}/projects/${projectId}/teams/${teamId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-teams", projectId] }),
  });

  const addMemberMutation = useMutation({
    mutationFn: (agentId: string) =>
      api.post(`/companies/${companyId}/projects/${projectId}/members`, { agentId, role: "member" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-members", projectId] }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/companies/${companyId}/projects/${projectId}/members/${memberId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-members", projectId] }),
  });

  const [msName, setMsName] = useState("");
  const createMilestoneMutation = useMutation({
    mutationFn: (name: string) =>
      api.post(`/companies/${companyId}/projects/${projectId}/milestones`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-milestones", projectId] });
      setMsName("");
    },
  });

  const removeMilestoneMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/companies/${companyId}/projects/${projectId}/milestones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-milestones", projectId] }),
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/companies/${companyId}/projects/${projectId}/milestones/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-milestones", projectId] }),
  });

  const [updateBody, setUpdateBody] = useState("");
  const [updateHealth, setUpdateHealth] = useState<"on_track" | "at_risk" | "off_track">("on_track");
  const createUpdateMutation = useMutation({
    mutationFn: () =>
      api.post(`/companies/${companyId}/projects/${projectId}/updates`, {
        health: updateHealth,
        body: updateBody,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-updates", projectId] });
      qc.invalidateQueries({ queryKey: queryKeyForProject(companyId) });
      setUpdateBody("");
    },
  });

  const linkedTeamIds = new Set((teams.data ?? []).map((t) => t.teamId));
  const linkableTeams = (allTeams.data ?? []).filter((t) => !linkedTeamIds.has(t.id));

  const linkedAgentIds = new Set(
    (members.data ?? []).map((m) => m.agentId).filter((x): x is string => !!x),
  );
  const linkableAgents = (allAgents.data ?? []).filter((a) => !linkedAgentIds.has(a.id));

  const agentName = (id: string | null) =>
    id ? (allAgents.data ?? []).find((a) => a.id === id)?.name ?? id.slice(0, 8) : "—";

  return (
    <div data-testid="phase2-panel" className="mt-8 space-y-8 border-t border-border pt-6">
      <h2 className="text-lg font-bold uppercase tracking-wide text-muted-foreground">
        Phase 2: Teams • Members • Milestones • Health
      </h2>

      {/* === Teams === */}
      <section data-testid="phase2-teams">
        <h3 className="text-sm font-bold mb-2">Linked Teams ({teams.data?.length ?? 0})</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {(teams.data ?? []).map((link) => (
            <Badge
              key={link.teamId}
              variant="outline"
              className="flex items-center gap-2"
              style={{ borderColor: link.team.color ?? undefined }}
            >
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: link.team.color ?? "#94A3B8" }}
              />
              {link.team.identifier} {link.team.name}
              <button
                onClick={() => removeTeamMutation.mutate(link.teamId)}
                className="hover:text-destructive"
                aria-label={`unlink team ${link.team.identifier}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <select
          data-testid="phase2-team-select"
          className="text-sm border border-border rounded px-2 py-1 bg-background"
          onChange={(e) => {
            if (e.target.value) {
              addTeamMutation.mutate(e.target.value);
              e.target.value = "";
            }
          }}
          defaultValue=""
        >
          <option value="">+ Link team…</option>
          {linkableTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.identifier} — {t.name}
            </option>
          ))}
        </select>
      </section>

      {/* === Members === */}
      <section data-testid="phase2-members">
        <h3 className="text-sm font-bold mb-2">Project Members ({members.data?.length ?? 0})</h3>
        <ul className="space-y-1 mb-3">
          {(members.data ?? []).map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-2 text-sm border border-border rounded px-2 py-1"
            >
              <Badge variant="outline">{m.role}</Badge>
              <span>{agentName(m.agentId)}</span>
              <button
                onClick={() => removeMemberMutation.mutate(m.id)}
                className="ml-auto hover:text-destructive"
                aria-label={`remove member ${m.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
        <select
          data-testid="phase2-member-select"
          className="text-sm border border-border rounded px-2 py-1 bg-background"
          onChange={(e) => {
            if (e.target.value) {
              addMemberMutation.mutate(e.target.value);
              e.target.value = "";
            }
          }}
          defaultValue=""
        >
          <option value="">+ Add agent as member…</option>
          {linkableAgents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </section>

      {/* === Milestones === */}
      <section data-testid="phase2-milestones">
        <h3 className="text-sm font-bold mb-2">Milestones ({milestones.data?.length ?? 0})</h3>
        <ul className="space-y-1 mb-3">
          {(milestones.data ?? []).map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-2 text-sm border border-border rounded px-2 py-1"
            >
              <input
                type="checkbox"
                checked={m.status === "completed"}
                onChange={() =>
                  toggleMilestoneMutation.mutate({
                    id: m.id,
                    status: m.status === "completed" ? "planned" : "completed",
                  })
                }
              />
              <span className={m.status === "completed" ? "line-through text-muted-foreground" : ""}>
                {m.name}
              </span>
              {m.targetDate && (
                <span className="text-xs text-muted-foreground">{m.targetDate}</span>
              )}
              <button
                onClick={() => removeMilestoneMutation.mutate(m.id)}
                className="ml-auto hover:text-destructive"
                aria-label={`delete milestone ${m.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (msName.trim()) createMilestoneMutation.mutate(msName.trim());
          }}
        >
          <Input
            data-testid="phase2-milestone-name"
            value={msName}
            onChange={(e) => setMsName(e.target.value)}
            placeholder="Milestone name"
            className="text-sm h-8"
          />
          <Button type="submit" size="sm" disabled={!msName.trim()}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </form>
      </section>

      {/* === Health updates === */}
      <section data-testid="phase2-health">
        <h3 className="text-sm font-bold mb-2">Health Updates ({updates.data?.length ?? 0})</h3>
        <ul className="space-y-1 mb-3">
          {(updates.data ?? []).slice(0, 5).map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-2 text-sm border border-border rounded px-2 py-1"
            >
              <span
                className="inline-block h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: HEALTH_COLORS[u.health] ?? "#94A3B8" }}
              />
              <Badge variant="outline" className="text-xs">
                {u.health}
              </Badge>
              <span className="truncate">{u.body}</span>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (updateBody.trim()) createUpdateMutation.mutate();
          }}
        >
          <select
            data-testid="phase2-health-select"
            className="text-sm border border-border rounded px-2 py-1 bg-background"
            value={updateHealth}
            onChange={(e) => setUpdateHealth(e.target.value as any)}
          >
            <option value="on_track">on_track</option>
            <option value="at_risk">at_risk</option>
            <option value="off_track">off_track</option>
          </select>
          <Input
            data-testid="phase2-update-body"
            value={updateBody}
            onChange={(e) => setUpdateBody(e.target.value)}
            placeholder="What's the status?"
            className="text-sm h-8 flex-1"
          />
          <Button type="submit" size="sm" disabled={!updateBody.trim()}>
            Post
          </Button>
        </form>
      </section>
    </div>
  );
}

function queryKeyForProject(companyId: string) {
  return ["projects", companyId];
}
