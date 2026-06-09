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
  { category: "기획/설계", item: "요건정의·정보구조(IA) 설계", scopeBasis: "요구사항 정리, 메뉴/화면 흐름 정의", standardPrice: 1_500_000, note: "착수 전 범위 확정" },
  { category: "기획/설계", item: "화면설계(와이어프레임·스토리보드)", scopeBasis: "주요 화면 와이어/사용자 흐름", standardPrice: 2_000_000, note: null },
  { category: "디자인", item: "UI 디자인 시스템·공통 컴포넌트", scopeBasis: "색/타이포/버튼/폼 등 공통 요소", standardPrice: 2_000_000, note: null },
  { category: "디자인", item: "메인·핵심 화면 디자인 시안", scopeBasis: "메인 + 핵심 3~5종", standardPrice: 1_800_000, note: "화면 수 따라 가감" },
  { category: "퍼블리싱", item: "반응형 퍼블리싱(공통 레이아웃)", scopeBasis: "모바일/태블릿/PC", standardPrice: 2_500_000, note: "네이티브 패키징 제외" },
  { category: "인증/계정", item: "회원가입·로그인(이메일/비밀번호)", scopeBasis: "가입/로그인/세션 관리", standardPrice: 1_500_000, note: null },
  { category: "인증/계정", item: "소셜 로그인(카카오/네이버/구글)", scopeBasis: "OAuth 연동", standardPrice: 1_200_000, note: null },
  { category: "인증/계정", item: "본인인증·비밀번호 재설정", scopeBasis: "휴대폰/이메일 OTP", standardPrice: 1_000_000, note: null },
  { category: "인증/계정", item: "약관·개인정보 동의 관리", scopeBasis: "동의 화면/이력", standardPrice: 700_000, note: null },
  { category: "인증/계정", item: "마이페이지·프로필 관리", scopeBasis: "내 정보 조회/수정", standardPrice: 1_500_000, note: null },
  { category: "인증/계정", item: "권한·역할 관리(RBAC)", scopeBasis: "역할별 접근제어", standardPrice: 1_800_000, note: null },
  { category: "결제", item: "PG 결제 연동(단건)", scopeBasis: "이니시스/토스 등", standardPrice: 2_000_000, note: "PG 심사/수수료 별도" },
  { category: "결제", item: "구독·정기결제", scopeBasis: "정기 빌링/요금제", standardPrice: 2_500_000, note: null },
  { category: "결제", item: "환불·취소·결제내역", scopeBasis: "부분환불/내역 조회", standardPrice: 1_500_000, note: null },
  { category: "콘텐츠/커머스", item: "목록·상세(피드/카탈로그)", scopeBasis: "리스트/상세 화면", standardPrice: 2_000_000, note: null },
  { category: "콘텐츠/커머스", item: "검색·필터·정렬", scopeBasis: "키워드/카테고리/정렬", standardPrice: 1_800_000, note: null },
  { category: "콘텐츠/커머스", item: "장바구니·주문", scopeBasis: "담기/주문서/결제 연계", standardPrice: 2_500_000, note: null },
  { category: "콘텐츠/커머스", item: "쿠폰·프로모션", scopeBasis: "발급/적용/관리", standardPrice: 1_500_000, note: null },
  { category: "콘텐츠/커머스", item: "리뷰·평점·스크랩", scopeBasis: "작성/집계/저장", standardPrice: 1_500_000, note: null },
  { category: "미디어/게시", item: "파일 업로드·이미지 처리", scopeBasis: "업로드/리사이즈/미리보기", standardPrice: 1_200_000, note: null },
  { category: "미디어/게시", item: "영상 플레이어·수강", scopeBasis: "재생/진도/이어보기", standardPrice: 2_500_000, note: "영상 제작/호스팅 별도" },
  { category: "미디어/게시", item: "게시판·댓글·대댓글", scopeBasis: "CRUD/좋아요", standardPrice: 1_800_000, note: "UGC 신고 별도" },
  { category: "알림", item: "푸시 알림(FCM/웹푸시)", scopeBasis: "발송/타게팅", standardPrice: 1_500_000, note: null },
  { category: "알림", item: "이메일·SMS 발송", scopeBasis: "템플릿/발송 연동", standardPrice: 1_200_000, note: "발송 사용료 별도" },
  { category: "알림", item: "인앱 알림센터", scopeBasis: "알림 목록/읽음 처리", standardPrice: 1_000_000, note: null },
  { category: "예약/스케줄", item: "캘린더·예약·스케줄", scopeBasis: "달력/예약/인원 제한", standardPrice: 2_500_000, note: null },
  { category: "데이터", item: "복합 입력 폼(도메인 핵심)", scopeBasis: "도메인 데이터 입력 UI", standardPrice: 3_500_000, note: "실사용 안정성 중요" },
  { category: "데이터", item: "대시보드·통계", scopeBasis: "지표 집계/요약", standardPrice: 2_500_000, note: null },
  { category: "데이터", item: "차트·그래프 시각화", scopeBasis: "기간/타입별 그래프", standardPrice: 2_000_000, note: null },
  { category: "데이터", item: "리포트·PDF 출력", scopeBasis: "보고서 화면/PDF 저장", standardPrice: 2_000_000, note: null },
  { category: "지도/위치", item: "지도·위치 기반", scopeBasis: "지도/검색/마커", standardPrice: 1_800_000, note: null },
  { category: "운영/공통", item: "다국어(i18n)", scopeBasis: "번역 리소스/언어 전환", standardPrice: 1_200_000, note: null },
  { category: "운영/공통", item: "SEO·메타·소셜 공유", scopeBasis: "메타/OG/사이트맵", standardPrice: 800_000, note: null },
  { category: "운영/공통", item: "FAQ·공지·1:1 문의", scopeBasis: "운영 콘텐츠/문의", standardPrice: 1_000_000, note: null },
  { category: "운영/공통", item: "온보딩·튜토리얼", scopeBasis: "첫 사용 안내", standardPrice: 800_000, note: null },
  { category: "관리자", item: "회원·콘텐츠 운영(CMS)", scopeBasis: "백오피스 관리 화면", standardPrice: 3_000_000, note: "세부 화면 추가 협의" },
  { category: "관리자", item: "통계·정산 대시보드", scopeBasis: "매출/정산 집계", standardPrice: 2_500_000, note: null },
  { category: "연동", item: "외부 API 연동(1종)", scopeBasis: "3rd-party 단일 연동", standardPrice: 1_500_000, note: "연동처별 추가" },
  { category: "인프라", item: "배포·CI/CD·환경구성", scopeBasis: "빌드/배포 파이프라인", standardPrice: 2_000_000, note: null },
  { category: "인프라", item: "DB·스토리지 설계", scopeBasis: "스키마/스토리지 구성", standardPrice: 1_500_000, note: "서버/스토리지 사용료 별도" },
  { category: "보안", item: "보안·권한·로깅/감사", scopeBasis: "접근로그/보안 처리", standardPrice: 1_800_000, note: null },
  { category: "QA", item: "통합 QA·다기기 테스트", scopeBasis: "주요 플로우 회귀/다기기", standardPrice: 2_500_000, note: null },
  { category: "QA", item: "안정화·버그픽스", scopeBasis: "출시 전 안정화", standardPrice: 1_500_000, note: "일정 내 포함" },
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
