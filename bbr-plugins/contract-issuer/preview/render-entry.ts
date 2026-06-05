// 템플릿 검증용: 모든 빈칸을 마커값으로 채워 렌더 → docx 대조.
import { renderContractHtml } from "../src/template/contract-template.js";
import { DEFAULT_EUL, type ContractData, type ContractRecord } from "../src/contract.js";

const data: ContractData = {
  gabCompany: "〈갑회사〉",
  gabCeo: "〈갑대표〉",
  gabBizNo: "〈갑사업자〉",
  gabAddress: "〈갑주소〉",
  projectName: "〈프로젝트〉",
  scopeItems: [],
  periodStart: "2099-01-02",
  periodEnd: "완료시까지",
  monthlyAmount: 1230000,
  totalAmount: 4560000,
  vatMode: "별도",
  jurisdiction: null,
  contractDate: "2099-05-06",
  summary: "",
};
const rec = { projectName: "〈프로젝트〉", gabCompany: "〈갑회사〉" } as unknown as ContractRecord;
process.stdout.write(renderContractHtml(rec, data, DEFAULT_EUL));
