import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { agentsApi } from "../api/agents";
import { heartbeatsApi } from "../api/heartbeats";
import { leaderProcessesApi } from "../api/leader-processes";
import { queryKeys } from "../lib/queryKeys";
import { SidebarSection } from "./SidebarSection";
import { SidebarNavItem } from "./SidebarNavItem";
import type { Agent } from "@paperclipai/shared";

export function SidebarAgents() {
  const { selectedCompanyId } = useCompany();

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 10_000,
  });

  const { data: leaderProcesses } = useQuery({
    queryKey: queryKeys.leaderProcesses.list(selectedCompanyId!),
    queryFn: () => leaderProcessesApi.listForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 15_000,
  });

  const liveRunCount = liveRuns?.length ?? 0;

  const cliOnlineCount = useMemo(() => {
    return (leaderProcesses ?? []).filter((p) => p.status === "running").length;
  }, [leaderProcesses]);

  return (
    <SidebarSection label="Workers">
      <SidebarNavItem
        to="/agents"
        label="Agents"
        icon={Bot}
        liveCount={liveRunCount > 0 ? liveRunCount : undefined}
        textBadge={liveRunCount === 0 && cliOnlineCount > 0 ? `${cliOnlineCount} online` : undefined}
      />
    </SidebarSection>
  );
}
