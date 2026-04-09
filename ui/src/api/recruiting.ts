import { api } from "./client";

export interface ProposeHireRequest {
  name: string;
  role: string;
  title?: string | null;
  capabilities?: string | null;
  adapterType: "claude_local" | "process" | "none";
  reportsTo?: string | null;
  budgetMonthlyCents?: number;
  reason?: string | null;
}

export interface ProposeHireResponse {
  agent: { id: string; name: string; status: string };
  approval: { id: string; status: string };
}

export const recruitingApi = {
  propose: (companyId: string, data: ProposeHireRequest) =>
    api.post<ProposeHireResponse>(
      `/companies/${companyId}/recruiting/propose`,
      data,
    ),
};
