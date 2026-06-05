// 플러그인 전역 계약: DB namespace, 테이블, 데이터/액션/스트림 키, 계약 데이터 타입, 입력/레코드 타입.
// worker / ui / template / generation 이 모두 이 파일을 기준으로 통신한다.
//
// (견적서 발행 플러그인을 복제해 "계약서 발행"으로 전환. 도급계약서(표준) 양식 기반.)

// manifest.id = "paperclip-plugin-contract-issuer", namespaceSlug = "contracts"
// derivePluginDatabaseNamespace = plugin_${slug}_${sha256(id).slice(0,10)}
// = plugin_contracts_1cc0dc1bb2  (node crypto 로 검증됨)
export const DB_NAMESPACE = "plugin_contracts_1cc0dc1bb2";
export const T_CONTRACTS = `${DB_NAMESPACE}.contracts`;
export const T_COMMENTS = `${DB_NAMESPACE}.contract_comments`;

export const PLUGIN_ID = "paperclip-plugin-contract-issuer";
export const sessionTaskKey = (suffix: string) => `plugin:${PLUGIN_ID}:session:${suffix}`;

export const GENERATOR_AGENT_KEY = "contract-generator";

// === 회사 게이트 ===
// host 는 플러그인을 instance-wide 로만 설치 → BBR 전용을 플러그인 레벨에서 게이트.
export const ALLOWED_COMPANY_PREFIX = "BBR";
export const ALLOWED_COMPANY_ID = "96fcd977-1d55-4697-a464-abb656dd57c2";
export const isAllowedCompany = (
  companyId?: string | null,
  companyPrefix?: string | null,
): boolean =>
  companyId === ALLOWED_COMPANY_ID ||
  (companyPrefix ?? "").toUpperCase() === ALLOWED_COMPANY_PREFIX;

// UI ↔ worker bridge keys
export const DATA = {
  listContracts: "listContracts",
  getContract: "getContract",
  eul: "eul", // 을(공급자=비브라이트코드) 정보
  listComments: "listComments",
} as const;

export const ACTION = {
  createContract: "createContract",
  updateContract: "updateContract", // 폼 수정(입력 컬럼 갱신 + 직접필드 data 반영 + html 재렌더)
  generate: "generate", // LLM 으로 계약 데이터 생성/채움
  publish: "publish",
  deleteContract: "deleteContract",
  setSeal: "setSeal", // 직인 사용여부 토글 + html 재렌더
  addComment: "addComment",
  deleteComment: "deleteComment",
} as const;

// stream channel: 생성 진행 로그 (per contract)
export const generationChannel = (contractId: string) => `generation:${contractId}`;
// stream channel: 댓글 실시간 푸시 (per contract)
export const commentsChannel = (contractId: string) => `comments:${contractId}`;

// 내부 상태값은 견적 플러그인과 동일하게 유지(worker 로직 재사용). UI 에서만 계약용으로 라벨링.
// draft=초안, analyzing=생성중, analyzed=생성완료, published=발행됨, error=오류
export type ContractStatus = "draft" | "analyzing" | "analyzed" | "published" | "error";

// 계약 유형: 개발건 / 유지보수건 (서로 별개 계약).
export type ContractType = "development" | "maintenance";
export const contractTypeLabel = (t: ContractType | null | undefined): string =>
  t === "maintenance" ? "유지보수" : "개발";

// 갑(고객) 주체 유형: 사업자(법인/개인사업자) / 개인(사업자 없음).
// 본문 조항은 동일, 서명란·표시만 분기. (사업자=회사명/대표자/사업자등록번호, 개인=성명/생년월일)
export type GabKind = "business" | "individual";
export const gabKindLabel = (k: GabKind | null | undefined): string =>
  k === "individual" ? "개인" : "사업자";

// 지급방법(제3조): split=착수금+잔금, on_completion=완료시 전액, monthly=매월 정기.
export type PayMethod = "split" | "on_completion" | "monthly";
export const payMethodLabel = (m: PayMethod | null | undefined): string =>
  m === "on_completion" ? "완료 시 전액" : m === "monthly" ? "매월 정기" : "착수금+잔금";

// 사람이 입력하는 계약 요청 폼
export interface ContractInput {
  contractType?: ContractType; // 개발 | 유지보수 (기본 개발)
  gabKind?: GabKind; // 사업자 | 개인 (기본 사업자)
  gabCompany: string; // 갑 회사명 또는 개인 성명 (필수)
  gabCeo?: string | null;
  gabBizNo?: string | null;
  gabAddress?: string | null;
  gabBirth?: string | null; // 개인일 때 생년월일(선택)
  projectName: string; // 프로젝트/서비스명
  projectDesc?: string | null; // 자유서술(LLM 이 도급업무 범위 초안)
  periodStart?: string | null; // YYYY-MM-DD
  periodEnd?: string | null;
  monthlyAmount?: number | null;
  totalAmount?: number | null;
  payMethod?: PayMethod; // 지급방법 (기본 split)
  vatMode?: "별도" | "포함";
  jurisdiction?: string | null;
  contractDate?: string | null;
}

// === LLM 이 생성/정규화해 반환하는 구조화 계약 데이터 ===
export interface ContractData {
  gabCompany: string;
  gabCeo: string; // 없으면 ""
  gabBizNo: string;
  gabAddress: string;
  projectName: string;
  scopeItems: string[]; // 제2조 ① 도급업무 범위 항목. 보통 3~5개.
  periodStart: string; // YYYY-MM-DD, 미정 ""
  periodEnd: string;
  monthlyAmount: number; // 미정 0
  totalAmount: number;
  vatMode: "별도" | "포함";
  jurisdiction: string | null; // null 이면 "갑 본점 소재지 관할"
  contractDate: string; // YYYY-MM-DD
  summary: string; // 생성 관점 1~2줄
}

// DB 레코드(직렬화 형태)
export interface ContractRecord {
  id: string;
  companyId: string;
  contractType: ContractType;
  gabKind: GabKind;
  projectName: string;
  gabCompany: string;
  gabCeo: string | null;
  gabBizNo: string | null;
  gabAddress: string | null;
  gabBirth: string | null; // 개인 갑 생년월일(선택)
  projectDesc: string;
  periodStart: string | null;
  periodEnd: string | null;
  monthlyAmount: number | null;
  totalAmount: number | null;
  payMethod: PayMethod;
  vatMode: "별도" | "포함";
  jurisdiction: string | null;
  contractDate: string | null;
  useSeal: boolean; // 을 직인(법인인감) 표시 여부
  status: ContractStatus;
  data: ContractData | null;
  html: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// 을(공급자=비브라이트코드) 정보. instanceConfig 로 덮어쓸 수 있는 기본값.
// 도급계약서의 을 주소는 견적서(마포)와 다른 김포 주소(원본 docx 기준).
export interface EulInfo {
  companyName: string;
  ceo: string;
  bizNo: string;
  address: string;
}
export const DEFAULT_EUL: EulInfo = {
  companyName: "(주)비브라이트코드",
  ceo: "김대환",
  bizNo: "111-87-03249",
  address: "경기 김포시 김포한강8로 386 센트럴프라자2차 901호 오피스맨",
};

// 댓글 (스레드 + AI 보완). UI/worker 호환 위해 키 이름은 quote* 그대로 유지.
export type QuoteCommentAuthor = "user" | "assistant" | "system";
export type QuoteCommentKind = "comment" | "revision";
export interface QuoteComment {
  id: string;
  quoteId: string; // = contractId
  authorType: QuoteCommentAuthor;
  authorUserId: string | null;
  body: string;
  kind: QuoteCommentKind;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
export type QuoteCommentEvent = QuoteComment & { _deleted?: boolean };

// 생성 진행 스트림 이벤트(generationChannel).
export interface GenerationProgressEvent {
  phase: string;
  message: string;
  at: string;
}
