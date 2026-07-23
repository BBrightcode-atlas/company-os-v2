import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACTION,
  ALLOWED_COMPANY_ID,
  type ContractData,
  type ContractInput,
  type ContractRecord,
} from "../src/contract.js";
import plugin from "../src/worker.js";

afterEach(() => vi.unstubAllGlobals());

function toRow(contract: ContractRecord): Record<string, unknown> {
  return {
    id: contract.id,
    company_id: contract.companyId,
    contract_type: contract.contractType,
    gab_kind: contract.gabKind,
    project_name: contract.projectName,
    gab_company: contract.gabCompany,
    gab_ceo: contract.gabCeo,
    gab_biz_no: contract.gabBizNo,
    gab_address: contract.gabAddress,
    gab_birth: contract.gabBirth,
    project_desc: contract.projectDesc,
    period_start: contract.periodStart,
    period_end: contract.periodEnd,
    monthly_amount: contract.monthlyAmount,
    total_amount: contract.totalAmount,
    pay_method: contract.payMethod,
    down_payment_pct: contract.downPaymentPct,
    vat_mode: contract.vatMode,
    jurisdiction: contract.jurisdiction,
    contract_date: contract.contractDate,
    use_seal: contract.useSeal,
    status: contract.status,
    data: contract.data,
    html: contract.html,
    error_message: contract.errorMessage,
    created_at: contract.createdAt,
    updated_at: contract.updatedAt,
  };
}

describe("contract update regeneration", () => {
  it("renders the complete updated project description without AI summarization", async () => {
    const oldDescription = "기존 관리자 페이지 개발";
    const newDescription = [
      "고객용 모바일 앱 전체 화면을 개발한다.",
      "푸시 알림 발송, 수신 설정, 발송 이력 기능을 개발한다.",
      "관리자 페이지에서 회원과 알림 발송 상태를 조회할 수 있게 한다.",
    ].join("\n");
    const now = new Date().toISOString();
    const existingData: ContractData = {
      gabCompany: "고객사",
      gabCeo: "홍길동",
      gabBizNo: "123-45-67890",
      gabAddress: "서울시",
      projectName: "앱 구축",
      scopeItems: [oldDescription],
      periodStart: "2026-07-01",
      periodEnd: "2026-08-31",
      monthlyAmount: 0,
      totalAmount: 10_000_000,
      vatMode: "별도",
      jurisdiction: null,
      contractDate: "2026-07-23",
      summary: "기존 계약",
    };
    const state: ContractRecord = {
      id: "contract-1",
      companyId: ALLOWED_COMPANY_ID,
      contractType: "development",
      gabKind: "business",
      projectName: "앱 구축",
      gabCompany: "고객사",
      gabCeo: "홍길동",
      gabBizNo: "123-45-67890",
      gabAddress: "서울시",
      gabBirth: null,
      projectDesc: oldDescription,
      periodStart: "2026-07-01",
      periodEnd: "2026-08-31",
      monthlyAmount: null,
      totalAmount: 10_000_000,
      payMethod: "split",
      downPaymentPct: 30,
      vatMode: "별도",
      jurisdiction: null,
      contractDate: "2026-07-23",
      useSeal: true,
      status: "published",
      data: existingData,
      html: "<html>old</html>",
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    const db = {
      query: vi.fn(async () => [toRow(state)]),
      execute: vi.fn(async (sql: string, params: unknown[]) => {
        if (sql.includes("project_name=$3")) {
          state.projectName = String(params[2]);
          state.gabCompany = String(params[3]);
          state.gabCeo = params[4] == null ? null : String(params[4]);
          state.gabBizNo = params[5] == null ? null : String(params[5]);
          state.gabAddress = params[6] == null ? null : String(params[6]);
          state.projectDesc = String(params[7] ?? "");
          state.periodStart = params[8] == null ? null : String(params[8]);
          state.periodEnd = params[9] == null ? null : String(params[9]);
          state.monthlyAmount = params[10] == null ? null : Number(params[10]);
          state.totalAmount = params[11] == null ? null : Number(params[11]);
          state.vatMode = params[12] as ContractRecord["vatMode"];
          state.jurisdiction = params[13] == null ? null : String(params[13]);
          state.contractDate = params[14] == null ? null : String(params[14]);
          state.contractType = params[15] as ContractRecord["contractType"];
          state.gabKind = params[16] as ContractRecord["gabKind"];
          state.gabBirth = params[17] == null ? null : String(params[17]);
          state.payMethod = params[18] as ContractRecord["payMethod"];
          state.downPaymentPct = Number(params[19]);
          return { rowCount: 1 };
        }
        if (sql.includes("SET data=$3::jsonb, html=$4")) {
          state.data = JSON.parse(String(params[2])) as ContractData;
          state.html = String(params[3]);
          return { rowCount: 1 };
        }
        return { rowCount: 1 };
      }),
    };

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    type ActionHandler = (
      params: Record<string, unknown>,
      context: { companyId?: string | null },
    ) => Promise<unknown>;
    const actions = new Map<string, ActionHandler>();
    const ctx = {
      db,
      data: { register: vi.fn() },
      actions: {
        register: (key: string, handler: ActionHandler) => actions.set(key, handler),
      },
      streams: { open: vi.fn(), emit: vi.fn(), close: vi.fn() },
      config: { get: vi.fn(async () => ({})) },
      logger: { error: vi.fn() },
    };
    await plugin.definition.setup(ctx as never);

    const input: ContractInput = {
      contractType: state.contractType,
      gabKind: state.gabKind,
      gabCompany: state.gabCompany,
      gabCeo: state.gabCeo,
      gabBizNo: state.gabBizNo,
      gabAddress: state.gabAddress,
      projectName: state.projectName,
      projectDesc: newDescription,
      periodStart: state.periodStart,
      periodEnd: state.periodEnd,
      monthlyAmount: state.monthlyAmount,
      totalAmount: state.totalAmount,
      payMethod: state.payMethod,
      downPaymentPct: state.downPaymentPct,
      vatMode: state.vatMode,
      jurisdiction: state.jurisdiction,
      contractDate: state.contractDate,
    };
    const updateContract = actions.get(ACTION.updateContract);
    expect(updateContract).toBeDefined();
    const result = (await updateContract!(
      {
        companyId: ALLOWED_COMPANY_ID,
        id: state.id,
        input,
      },
      { companyId: ALLOWED_COMPANY_ID },
    )) as { hadData: boolean };

    expect(result.hadData).toBe(true);
    expect(state.status).toBe("published");
    expect(fetchMock).not.toHaveBeenCalled();
    for (const line of newDescription.split("\n")) {
      expect(state.html).toContain(line);
    }
    expect(state.html).toContain("<br />");
    expect(state.html).not.toContain(oldDescription);
  });
});
