// 플러그인 전역 계약: DB namespace, 테이블, 데이터/액션/스트림 키, 분석 JSON 타입, 입력/레코드 타입.
// worker / ui / template / analysis 가 모두 이 파일을 기준으로 통신한다.

// manifest.id = "paperclip-plugin-quote-issuer", namespaceSlug = "quotes"
// derivePluginDatabaseNamespace = plugin_${slug}_${sha256(id).slice(0,10)}
// = plugin_quotes_c16f8cb52b  (server/src/services/plugin-database.ts:31 와 일치 검증됨)
export const DB_NAMESPACE = "plugin_quotes_c16f8cb52b";
export const T_QUOTES = `${DB_NAMESPACE}.quotes`;
export const T_RATES = `${DB_NAMESPACE}.reference_rates`;
export const T_RATE_SHEET = `${DB_NAMESPACE}.rate_sheet`;
export const T_COMMENTS = `${DB_NAMESPACE}.quote_comments`;

// manifest.id. 세션 taskKey 는 반드시 `plugin:${PLUGIN_ID}:session:...` 패턴이어야
// host 의 sendMessage 조회(taskKey LIKE 'plugin:<id>:session:%')에 매칭된다.
export const PLUGIN_ID = "paperclip-plugin-quote-issuer";
export const sessionTaskKey = (suffix: string) => `plugin:${PLUGIN_ID}:session:${suffix}`;

// managed analyzer agent
export const ANALYZER_AGENT_KEY = "quote-analyzer";

// === 회사 게이트 ===
// host 는 플러그인을 instance-wide 로만 설치(회사별 설치 불가, plugin-host-services.ts:579).
// 이 플러그인은 BBR 전용이므로 플러그인 레벨에서 회사를 게이트한다(사이드바/페이지/worker).
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
  listQuotes: "listQuotes", // 견적 목록(사례)
  getQuote: "getQuote", // 단건 + 분석 + html
  rates: "rates", // 참고 단가표
  rateSheet: "rateSheet", // 기능별 단가 산정표(편집 가능 데이터 시트)
  supplier: "supplier", // 공급자 정보(instanceConfig)
  listComments: "listComments", // 견적별 댓글 스레드
} as const;

export const ACTION = {
  createQuote: "createQuote", // draft 생성
  triggerAnalysis: "triggerAnalysis", // analyzer 세션 위임
  publish: "publish", // HTML 렌더 + status=published (+ PDF 지시)
  deleteQuote: "deleteQuote",
  addComment: "addComment", // 댓글 추가(+옵션: AI 재산정)
  deleteComment: "deleteComment", // 댓글 삭제
  upsertRate: "upsertRate", // 단가 산정표 행 추가/수정
  deleteRate: "deleteRate", // 단가 산정표 행 삭제
  resetRateSheet: "resetRateSheet", // 단가 산정표 기본값으로 초기화
  editQuote: "editQuote", // 견적 내용 직접 수정(LLM 없이 항목/할인/요약/범위/유형 편집)
} as const;

// stream channel: 분석 진행 로그 (per quote)
export const analysisChannel = (quoteId: string) => `analysis:${quoteId}`;
// stream channel: 댓글 실시간 푸시 (per quote)
export const commentsChannel = (quoteId: string) => `comments:${quoteId}`;

export type QuoteStatus = "draft" | "analyzing" | "analyzed" | "published" | "error";

// 고객이 전달한 참고 자료(요구사항 문서). 업로드 시 클라이언트에서 텍스트로 추출해 저장한다.
// md/txt 는 그대로, PDF 는 브라우저에서 unpdf 로 텍스트 추출. 분석/보완 프롬프트에 첨부된다.
export interface ReferenceDoc {
  filename: string;
  text: string; // 추출된 텍스트(원본 파일은 보관하지 않음)
}

// 사람이 입력하는 견적 요청
export interface QuoteInput {
  clientName: string; // 고객사
  requirements: string; // 고객 요구사항 (스토리보드/요건)
  workScope: string; // 업무 내용
  expectedPrice?: number | null; // 예상 가격(앵커, 참고용. 끼워맞추기 금지)
  platform?: string | null; // 대상 플랫폼 (예: iOS/Android, PWA)
  vatMode?: "별도" | "포함"; // 기본 별도
  quoteType?: "development" | "maintenance"; // 견적 유형(개발=일회성/유지보수=월). 기본 development
  enableWebResearch?: boolean; // 웹 리서치 on/off
  referenceDocs?: ReferenceDoc[]; // 업로드한 참고 자료(요구사항 문서) 텍스트
}

// === analyzer 가 반환하는 구조화 JSON 계약 ===
export interface StandardItem {
  no: number;
  category: string; // 대분류 (기획/설계 등)
  item: string; // 산정 항목
  scopeBasis: string; // 범위 근거
  evidence: string; // 스토리보드/요건 근거
  standardPrice: number; // 표준 단가(원)
}
export interface DiscountItem {
  type: string; // PWA/비네이티브 조정, 재사용, 초기사업자, 선계약 등
  desc: string;
  adjust: number; // 음수(할인)
}
export interface PricingSummary {
  standardSupply: number; // 표준 산정 공급가
  proposedSupply: number; // 할인 반영 제안가
  vat: number;
  total: number;
  vatMode: "별도" | "포함";
  contractTerms?: string | null; // 선계약 조건 제안가 설명(있을 때)
}
export interface RiskItem {
  level: "high" | "med" | "low";
  title: string;
  detail: string;
  mitigation: string;
}
export interface ResearchItem {
  source: string; // 출처 (위시켓/프리모아/원티드긱스 등)
  projectName?: string | null; // 프로젝트명
  url?: string | null; // 링크
  insight: string; // 상세내용 (관련성/요약)
  priceRange?: string | null; // 견적금액
  headcount?: string | null; // 투입인원
  period?: string | null; // 기간
}
export interface ScopeBlock {
  included: string[];
  excluded: string[];
  assumptions: string[];
  externalCosts: string[]; // 외부 서비스/심사/승인 의존
}
export interface CaseItem {
  quoteId?: string | null;
  client: string;
  amount: number;
  similarity: string;
}
export interface AnalysisResult {
  summary: string; // 산정 관점 2~3줄
  groupTitle?: string | null; // 견적서 품목 그룹 밴드 제목(엑셀 A11). 없으면 workScope 에서 유도.
  period?: string | null; // 기간 셀(엑셀 I열). 예: "금융사 완료 후 2~4주". 없으면 "협의".
  notes?: string | null; // 견적서 '일정 / 유의사항' 고객용 문구(편집 가능, 줄바꿈 구분). 없으면 정중한 기본 생성.
  standardItems: StandardItem[];
  discounts: DiscountItem[];
  pricing: PricingSummary;
  risks: RiskItem[];
  research: ResearchItem[];
  scope: ScopeBlock;
  cases: CaseItem[];
}

// DB 레코드(직렬화 형태). analysis/html 은 분석/발행 후 채워짐.
export interface QuoteRecord {
  id: string;
  companyId: string;
  clientName: string;
  requirements: string;
  workScope: string;
  expectedPrice: number | null;
  platform: string | null;
  vatMode: "별도" | "포함";
  quoteType: "development" | "maintenance"; // 견적 유형(개발=일회성/유지보수=월)
  status: QuoteStatus;
  referenceDocs: ReferenceDoc[];
  analysis: AnalysisResult | null;
  html: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// 견적 댓글 (스레드 + AI 재산정 보완)
export type QuoteCommentAuthor = "user" | "assistant" | "system";
export type QuoteCommentKind = "comment" | "revision";
export interface QuoteComment {
  id: string;
  quoteId: string;
  authorType: QuoteCommentAuthor;
  authorUserId: string | null;
  body: string;
  kind: QuoteCommentKind; // comment=일반 댓글, revision=AI 보완 결과 요약
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
// 스트림으로 푸시되는 댓글 이벤트(삭제 tombstone 포함, UI 전용 필드).
export type QuoteCommentEvent = QuoteComment & { _deleted?: boolean };

// 분석 진행 스트림 이벤트(analysisChannel). worker emit ↔ UI 구독 계약을 한 곳에 고정.
export interface AnalysisProgressEvent {
  phase: string;
  message: string;
  at: string;
}

// 기능별 단가 산정표 한 행(편집 가능 데이터 시트). 견적 산출의 표준 단가 기준선.
export interface RateSheetRow {
  id: string;
  category: string; // 대분류
  item: string; // 산정 항목
  scopeBasis: string; // 범위 근거
  standardPrice: number; // BBR 단가(견적 기준가, 원, VAT 별도)
  marketPrice: number | null; // SI 외주 시세(천장, 원, VAT 별도)
  reuseLevel: string | null; // 재사용도(구현완료/일부재사용/신규)
  note: string | null; // 비고
  sortOrder: number; // 정렬 순서
}

// 공급자 정보 (instanceConfig 로 운영자가 덮어쓸 수 있는 기본값)
export interface SupplierInfo {
  companyName: string;
  ceo: string;
  bizNo: string;
  address: string;
  phone: string;
  bizType: string; // 업태 (예: 정보통신업)
  bizItem: string; // 종목 (예: 응용소프트웨어개발및 공급업)
}
export const DEFAULT_SUPPLIER: SupplierInfo = {
  companyName: "(주)비브라이트코드",
  ceo: "김대환",
  bizNo: "111-87-03249",
  address: "서울 마포구 마포대로 12 한신오피스텔 805호",
  phone: "010-6622-5361",
  bizType: "정보통신업",
  bizItem: "응용소프트웨어개발및 공급업",
};
