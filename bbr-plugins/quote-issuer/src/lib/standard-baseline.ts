// 기능별 단가 산정표(데이터 시트)의 기본 시드 + analyzer 프롬프트 포맷터.
//
// rate_sheet 테이블(편집 가능)이 견적 산출의 표준 단가 기준선이다. 운영자가 UI 에서 편집한다.
// 빈 테이블일 때 worker(ensureRateSheetSeeded)가 아래 DEFAULT_RATE_SHEET 로 1회 시드한다.
// analyzer 는 rate_sheet 행을 buildRateSheetMd 로 직렬화해 "단가 산정 기준표" 로 참고한다.

export interface RateSheetSeed {
  category: string; // 대분류
  item: string; // 산정 항목
  scopeBasis: string; // 범위 근거
  standardPrice: number; // 표준 단가(원, VAT 별도)
  note: string | null; // 비고
}

// 중소형 PWA 1차 출시 기준 모듈별 표준 단가(회사 표준). 프로젝트 범위/복잡도에 따라 가감.
export const DEFAULT_RATE_SHEET: RateSheetSeed[] = [
  { category: "기획/설계", item: "스토리보드 기반 기능정의·개발범위 확정", scopeBasis: "요건/스토리보드 분석, 도메인 용어·예외 정의", standardPrice: 2_500_000, note: "초기 착수 전 범위 확정" },
  { category: "PWA/UX", item: "공통 화면구조 및 반응형 UX", scopeBasis: "모바일/태블릿/PC 호환", standardPrice: 3_000_000, note: "네이티브 앱 패키징 제외" },
  { category: "인증/계정", item: "로그인·소셜로그인·계정 관리", scopeBasis: "카카오/네이버/구글, 휴대폰/이메일 인증", standardPrice: 2_400_000, note: "약관 동의 화면 포함" },
  { category: "결제/구독", item: "요금제·PG 결제·구독", scopeBasis: "이니시스/토스 등, 월/연 요금제", standardPrice: 3_000_000, note: "PG 심사/수수료 별도" },
  { category: "메인/알림", item: "메인 화면·알림·내 정보", scopeBasis: "알림 유형, 회원 정보 운영", standardPrice: 1_800_000, note: "운영자 입력 항목 일부" },
  { category: "콘텐츠(강의/영상)", item: "커리큘럼/목록·플레이어·수강", scopeBasis: "강의 수강 화면, 최근 수강", standardPrice: 3_200_000, note: "영상 제작/호스팅 별도" },
  { category: "정보모음/게시", item: "게시글·검색·스크랩·글읽기", scopeBasis: "운영자 큐레이션, 스크랩", standardPrice: 2_400_000, note: "UGC/신고 제외" },
  { category: "예약/스케줄", item: "등록·달력·세션 예약·인원 제한", scopeBasis: "달력 팝업, 세션 예약", standardPrice: 3_200_000, note: "구독 인원 제한 연동" },
  { category: "핵심 도메인 데이터 저장소", item: "데이터 타입별 설정·핵심 로직", scopeBasis: "도메인 핵심 데이터 모델", standardPrice: 4_800_000, note: "도메인 핵심" },
  { category: "데이터 입력 화면", item: "실시간 입력·임시저장·타입별 UI", scopeBasis: "입력 UI, 임시저장", standardPrice: 5_800_000, note: "실사용 안정성 중요" },
  { category: "신규 추가범위(증분)", item: "기존 버전 대비 신규 기능", scopeBasis: "버전 증분 범위", standardPrice: 2_400_000, note: "이전 버전 대비 신규" },
  { category: "보고서/PDF", item: "기록·보고서 화면·PDF 저장", scopeBasis: "보고서 표/메모 표시", standardPrice: 2_800_000, note: "서명 기능 별도" },
  { category: "그래프/시각화", item: "데이터 타입별 그래프·기간 조절", scopeBasis: "확대/상세 포함", standardPrice: 3_200_000, note: null },
  { category: "관리자/운영", item: "관리자 기본 및 콘텐츠 운영", scopeBasis: "프로모션/공지, 콘텐츠 운영", standardPrice: 2_800_000, note: "세부 관리자 화면 추가 협의" },
  { category: "인프라/보안", item: "배포·DB/스토리지·권한·로깅", scopeBasis: "개인정보/데이터 보관 전제", standardPrice: 2_200_000, note: "서버/문자/메일 사용료 별도" },
  { category: "QA/안정화", item: "주요 플로우·다기기 회귀 테스트", scopeBasis: "복합 입력/결제/보고서 회귀", standardPrice: 2_700_000, note: "일정 내 포함" },
];

const won = (n: number): string =>
  Number.isFinite(n) ? `${Math.round(n).toLocaleString("ko-KR")}원` : "(미정)";

// rate_sheet 행을 analyzer 프롬프트용 마크다운 표로 직렬화한다.
export function buildRateSheetMd(
  rows: ReadonlyArray<Pick<RateSheetSeed, "category" | "item" | "scopeBasis" | "standardPrice" | "note">>,
): string {
  if (!rows || rows.length === 0) return "(단가 산정표 없음)";
  const head = [
    "회사 표준 단가 산정표(기능별 표준 단가, VAT 별도). 표준가를 먼저 산정한 뒤 할인은 별도로 분리한다.",
    "",
    "| 대분류 | 산정 항목 | 범위 근거 | 표준 단가 | 비고 |",
    "|---|---|---|---:|---|",
  ];
  const body = rows.map((r) => {
    const note = (r.note ?? "").trim();
    return `| ${r.category} | ${r.item} | ${r.scopeBasis} | ${won(r.standardPrice)} | ${note} |`;
  });
  const tail = [
    "",
    "주의: 위 표는 기준선(anchor)이다. 요청한 프로젝트에 없는 모듈은 빼고, 더 무겁거나 가벼우면 범위 근거를 들어 조정한다.",
  ];
  return [...head, ...body, ...tail].join("\n");
}

// 시트가 비었을 때 fallback 으로 쓰는 기본 기준표 마크다운.
export const STANDARD_BASELINE_MD = buildRateSheetMd(DEFAULT_RATE_SHEET);
