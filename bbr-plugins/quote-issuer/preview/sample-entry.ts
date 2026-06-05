// 프리뷰 하니스: 채슬리투자자문 견적(엑셀 ground truth)과 동일 데이터로 HTML 렌더해
// 표준 엑셀 견적서와 시각 일치를 비교한다. esbuild 로 번들 후 node 실행 → stdout 에 HTML.
import { renderQuoteHtml } from "../src/template/quote-template.js";
import { DEFAULT_SUPPLIER, type AnalysisResult, type QuoteRecord } from "../src/contract.js";

const quote: QuoteRecord = {
  id: "preview",
  companyId: "BBR",
  clientName: "채슬리투자자문(주)",
  requirements: "",
  workScope: "매매데이터 ETL 및 금융 인터페이스 연동 구축",
  expectedPrice: null,
  platform: null,
  vatMode: "별도",
  status: "analyzed",
  analysis: null,
  html: null,
  errorMessage: null,
  createdAt: "2026-06-02",
  updatedAt: "2026-06-02",
};

const analysis: AnalysisResult = {
  summary: "",
  groupTitle: "매매데이터 ETL 및 금융 인터페이스 연동 구축",
  period: "금융사 완료\n후 2~4주",
  standardItems: [
    { no: 1, category: "금융 데이터 연동 구축", item: "매매데이터 ETL 및 DB/신한/삼성증권·하나펀드 HINTS 연동 자동화", scopeBasis: "", evidence: "", standardPrice: 0 },
    { no: 2, category: "인터페이스 협의", item: "DB증권, 신한증권, 삼성증권 인터페이스 협의 및 연동 방식 검증", scopeBasis: "", evidence: "", standardPrice: 0 },
    { no: 3, category: "데이터 ETL", item: "고객 매매데이터 수집, 가공, 적재 프로세스 구축", scopeBasis: "", evidence: "", standardPrice: 0 },
    { no: 4, category: "금융 보안", item: "금융 데이터 보안을 고려한 시스템 아키텍처 구성", scopeBasis: "", evidence: "", standardPrice: 0 },
    { no: 5, category: "HINTS 연동", item: "하나펀드 HINTS 인터페이스 협의 및 검증", scopeBasis: "", evidence: "", standardPrice: 0 },
    { no: 6, category: "HINTS 자동화", item: "하나펀드 HINTS 데이터 등록 자동화", scopeBasis: "", evidence: "", standardPrice: 0 },
    { no: 7, category: "검증/안정화", item: "연동 데이터 정합성 확인 및 운영 전 검증", scopeBasis: "", evidence: "", standardPrice: 0 },
  ],
  discounts: [],
  pricing: { standardSupply: 26000000, proposedSupply: 26000000, vat: 2600000, total: 28600000, vatMode: "별도" },
  risks: [],
  research: [],
  scope: {
    included: [],
    excluded: [],
    assumptions: [
      "본 견적은 채슬리투자자문(주)의 고객 매매데이터 처리와 외부 금융 인터페이스 협의·검증, 하나펀드 HINTS 데이터 등록 자동화를 포함한 구축 범위 기준입니다.",
      "증권사 인터페이스 대상은 DB증권, 신한증권, 삼성증권 3개사입니다. 다만 실제 구축/검증 포함 범위는 기간 내 인터페이스 자료 제공, 테스트 계정/망 접근, 기술지원이 가능한 증권사에 한합니다.",
      "주요 범위는 증권사 인터페이스 협의 및 검증, 고객 매매데이터 ETL(수집·가공·적재) 프로세스 구축, 금융 보안을 고려한 아키텍처 구성, 하나펀드 HINTS 인터페이스 협의 및 검증, 하나펀드 HINTS 데이터 등록 자동화입니다.",
      "구축/검증 기간은 금융사 측 인터페이스 협의가 완료된 이후 2~4주 기준입니다. 금융사 자료 제공, 테스트 계정/망 접근, 보안 검토 일정은 외부 변수이므로 전체 일정은 조정될 수 있습니다.",
      "내부 테스트 기간은 구축/검증 이후 별도로 2주 이상 확보하는 것을 전제로 합니다.",
      "본 견적 금액은 기간 자체에 대한 비용이 아니라, 정해진 연동 범위의 완료 검증에 대한 비용입니다.",
    ],
    externalCosts: [
      "증권사/하나펀드/외부 기관의 계약·심사·수수료, 운영 서버 비용, 클라우드 사용료, 고객사 내부 보안 심사 대응 범위 확대, 추가 데이터 소스 연동, 리포트/대시보드 고도화는 별도 협의입니다.",
    ],
  },
  cases: [],
};

process.stdout.write(renderQuoteHtml(quote, analysis, DEFAULT_SUPPLIER));
