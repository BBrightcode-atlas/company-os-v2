// 기능별 단가 산정표(데이터 시트)의 기본 시드 + analyzer 프롬프트 포맷터.
//
// rate_sheet 테이블(편집 가능)이 견적 산출의 표준 단가 기준선이다. 운영자가 UI 에서 편집한다.
// 빈 테이블일 때 worker(ensureRateSheetSeeded)가 아래 DEFAULT_RATE_SHEET 로 1회 시드한다.
// analyzer 는 rate_sheet 행을 buildRateSheetMd 로 직렬화해 "단가 산정 기준표" 로 참고한다.
//
// 가격 모델(중요): 우리는 재사용 모듈 + 에이전트로 빠르게 빌드하는 팀이다.
//  - marketPrice = SI 외주 시세(천장). 맨땅에서 다 짜주는 외주사 기준가(고객 설득용 참고).
//  - standardPrice = BBR 단가(견적 기준가). 재사용도에 따라 시세 아래로 책정한다.
//  - reuseLevel = 구현완료(내부 모듈 보유, 통합·커스터마이즈 위주) / 일부재사용 / 신규(도메인 신규).
// 견적은 standardPrice(BBR 단가)를 기준으로 산정하고, marketPrice 는 "시세 대비 절감" 근거로만 쓴다.

export type ReuseLevel = "구현완료" | "일부재사용" | "신규";

export interface RateSheetSeed {
  category: string; // 대분류
  item: string; // 산정 항목
  scopeBasis: string; // 범위 근거
  standardPrice: number; // BBR 단가(견적 기준가, 원, VAT 별도)
  marketPrice: number; // SI 외주 시세(천장, 원, VAT 별도)
  reuseLevel: ReuseLevel; // 재사용도
  note: string | null; // 비고
}

// 기능별 BBR 단가 + 시세 + 재사용도. 시세는 한국 외주시장 리서치(위시켓/프리모아/크몽/KOSA) 기준,
// BBR 단가는 재사용도 계수(구현완료 0.30 / 일부재사용 0.50 / 신규 0.65)를 적용해 산출(10만 단위 반올림).
export const DEFAULT_RATE_SHEET: RateSheetSeed[] = [
  { category: "기획/설계", item: "요건정의·정보구조(IA) 설계", scopeBasis: "요구사항 정리, 메뉴/화면 흐름 정의", standardPrice: 800000, marketPrice: 1600000, reuseLevel: "일부재사용", note: null },
  { category: "기획/설계", item: "화면설계(와이어프레임·스토리보드)", scopeBasis: "주요 화면 와이어/사용자 흐름", standardPrice: 1000000, marketPrice: 2000000, reuseLevel: "일부재사용", note: null },
  { category: "디자인", item: "UI 디자인 시스템·공통 컴포넌트", scopeBasis: "색/타이포/버튼/폼 등 공통 요소", standardPrice: 1100000, marketPrice: 3800000, reuseLevel: "구현완료", note: "packages/ui 재사용" },
  { category: "디자인", item: "메인·핵심 화면 디자인 시안", scopeBasis: "메인 + 핵심 3~5종", standardPrice: 1800000, marketPrice: 3600000, reuseLevel: "일부재사용", note: null },
  { category: "퍼블리싱", item: "반응형 퍼블리싱(공통 레이아웃)", scopeBasis: "모바일/태블릿/PC", standardPrice: 400000, marketPrice: 1200000, reuseLevel: "구현완료", note: null },
  { category: "인증/계정", item: "회원가입·로그인(이메일/비밀번호)", scopeBasis: "가입/로그인/세션 관리", standardPrice: 500000, marketPrice: 1600000, reuseLevel: "구현완료", note: null },
  { category: "인증/계정", item: "소셜 로그인(카카오/네이버/구글)", scopeBasis: "OAuth 연동", standardPrice: 400000, marketPrice: 1200000, reuseLevel: "구현완료", note: null },
  { category: "인증/계정", item: "본인인증·비밀번호 재설정", scopeBasis: "휴대폰/이메일 OTP", standardPrice: 400000, marketPrice: 1200000, reuseLevel: "구현완료", note: null },
  { category: "인증/계정", item: "약관·개인정보 동의 관리", scopeBasis: "동의 화면/이력", standardPrice: 400000, marketPrice: 800000, reuseLevel: "일부재사용", note: null },
  { category: "인증/계정", item: "마이페이지·프로필 관리", scopeBasis: "내 정보 조회/수정", standardPrice: 400000, marketPrice: 1200000, reuseLevel: "구현완료", note: null },
  { category: "인증/계정", item: "권한·역할 관리(기본: 멤버/관리자)", scopeBasis: "멤버/관리자 등 단순 역할 구분", standardPrice: 400000, marketPrice: 1200000, reuseLevel: "구현완료", note: "세분 권한은 RBAC 항목" },
  { category: "인증/계정", item: "권한·역할 관리(RBAC 세분화)", scopeBasis: "리소스별 세분 권한/역할 매핑·정책", standardPrice: 1000000, marketPrice: 3200000, reuseLevel: "구현완료", note: null },
  { category: "결제", item: "PG 결제 연동(단건)", scopeBasis: "이니시스/토스 등", standardPrice: 600000, marketPrice: 2000000, reuseLevel: "구현완료", note: "PG 심사/수수료 별도" },
  { category: "결제", item: "구독·정기결제", scopeBasis: "정기 빌링/요금제", standardPrice: 1100000, marketPrice: 3600000, reuseLevel: "구현완료", note: null },
  { category: "결제", item: "환불·취소·결제내역", scopeBasis: "부분환불/내역 조회", standardPrice: 500000, marketPrice: 1800000, reuseLevel: "구현완료", note: null },
  { category: "콘텐츠/커머스", item: "목록·상세(피드/카탈로그)", scopeBasis: "리스트/상세 화면", standardPrice: 600000, marketPrice: 2000000, reuseLevel: "구현완료", note: null },
  { category: "콘텐츠/커머스", item: "검색·필터·정렬", scopeBasis: "키워드/카테고리/정렬", standardPrice: 1000000, marketPrice: 2000000, reuseLevel: "일부재사용", note: null },
  { category: "콘텐츠/커머스", item: "장바구니·주문", scopeBasis: "담기/주문서/결제 연계", standardPrice: 1600000, marketPrice: 3200000, reuseLevel: "일부재사용", note: null },
  { category: "콘텐츠/커머스", item: "쿠폰·프로모션", scopeBasis: "발급/적용/관리", standardPrice: 700000, marketPrice: 2400000, reuseLevel: "구현완료", note: null },
  { category: "콘텐츠/커머스", item: "리뷰·평점·스크랩", scopeBasis: "작성/집계/저장", standardPrice: 500000, marketPrice: 1800000, reuseLevel: "구현완료", note: null },
  { category: "미디어/게시", item: "파일 업로드·이미지 처리", scopeBasis: "업로드/리사이즈/미리보기", standardPrice: 800000, marketPrice: 2800000, reuseLevel: "구현완료", note: null },
  { category: "미디어/게시", item: "영상 플레이어·수강", scopeBasis: "재생/진도/이어보기", standardPrice: 3300000, marketPrice: 5000000, reuseLevel: "신규", note: "영상 제작/호스팅 별도" },
  { category: "미디어/게시", item: "게시판·댓글·대댓글", scopeBasis: "단순 게시판 CRUD/좋아요/대댓글", standardPrice: 500000, marketPrice: 1500000, reuseLevel: "구현완료", note: "모더레이션은 커뮤니티 항목" },
  { category: "커뮤니티", item: "커뮤니티 피드·팔로우·멘션", scopeBasis: "피드/팔로우/멘션/해시태그/공유", standardPrice: 2200000, marketPrice: 7400000, reuseLevel: "구현완료", note: null },
  { category: "커뮤니티", item: "신고·차단·숨김(모더레이션)", scopeBasis: "게시물/댓글 신고·블라인드·숨김·사용자 차단", standardPrice: 1500000, marketPrice: 5000000, reuseLevel: "구현완료", note: null },
  { category: "커뮤니티", item: "커뮤니티 가이드라인·제재 운영", scopeBasis: "가이드라인 노출·제재 이력·운영정책 관리", standardPrice: 900000, marketPrice: 3000000, reuseLevel: "구현완료", note: null },
  { category: "알림", item: "푸시 알림(FCM/웹푸시)", scopeBasis: "발송/타게팅", standardPrice: 700000, marketPrice: 2200000, reuseLevel: "구현완료", note: null },
  { category: "알림", item: "이메일·SMS 발송", scopeBasis: "템플릿/발송 연동", standardPrice: 400000, marketPrice: 1400000, reuseLevel: "구현완료", note: "발송 사용료 별도" },
  { category: "알림", item: "카카오 알림톡", scopeBasis: "알림톡 템플릿 심사/발송 연동(솔라피 등)", standardPrice: 700000, marketPrice: 1400000, reuseLevel: "일부재사용", note: "발송 사용료/템플릿 심사 별도" },
  { category: "알림", item: "외부 알림채널 연동(슬랙/디스코드 웹훅)", scopeBasis: "슬랙/디스코드 등 웹훅 알림 발송", standardPrice: 200000, marketPrice: 500000, reuseLevel: "구현완료", note: "채널당 추가" },
  { category: "알림", item: "인앱 알림센터", scopeBasis: "알림 목록/읽음 처리", standardPrice: 500000, marketPrice: 1800000, reuseLevel: "구현완료", note: null },
  { category: "예약/스케줄", item: "캘린더·예약·스케줄", scopeBasis: "달력/예약/인원 제한", standardPrice: 1600000, marketPrice: 5400000, reuseLevel: "구현완료", note: null },
  { category: "데이터", item: "복합 입력 폼(도메인 핵심)", scopeBasis: "도메인 데이터 입력 UI", standardPrice: 2300000, marketPrice: 3600000, reuseLevel: "신규", note: null },
  { category: "데이터", item: "대시보드·통계", scopeBasis: "지표 집계/요약", standardPrice: 700000, marketPrice: 2400000, reuseLevel: "구현완료", note: null },
  { category: "데이터", item: "차트·그래프 시각화", scopeBasis: "기간/타입별 그래프", standardPrice: 600000, marketPrice: 2000000, reuseLevel: "구현완료", note: null },
  { category: "데이터", item: "리포트·PDF 출력", scopeBasis: "보고서 화면/PDF 저장", standardPrice: 1000000, marketPrice: 2000000, reuseLevel: "일부재사용", note: null },
  { category: "지도/위치", item: "지도·위치 기반", scopeBasis: "지도/검색/마커", standardPrice: 1300000, marketPrice: 2000000, reuseLevel: "신규", note: null },
  { category: "운영/공통", item: "다국어(i18n)", scopeBasis: "번역 리소스/언어 전환", standardPrice: 500000, marketPrice: 1600000, reuseLevel: "구현완료", note: "localization 엔진 재사용" },
  { category: "운영/공통", item: "SEO·메타·소셜 공유", scopeBasis: "메타/OG/사이트맵", standardPrice: 400000, marketPrice: 800000, reuseLevel: "일부재사용", note: null },
  { category: "운영/공통", item: "FAQ·공지·1:1 문의", scopeBasis: "운영 콘텐츠/문의", standardPrice: 700000, marketPrice: 1400000, reuseLevel: "일부재사용", note: null },
  { category: "운영/공통", item: "온보딩·튜토리얼", scopeBasis: "첫 사용 안내", standardPrice: 500000, marketPrice: 900000, reuseLevel: "일부재사용", note: null },
  { category: "관리자", item: "회원·콘텐츠 운영(CMS)", scopeBasis: "백오피스 관리 화면", standardPrice: 1900000, marketPrice: 6400000, reuseLevel: "구현완료", note: "admin 앱 재사용" },
  { category: "관리자", item: "통계·정산 대시보드", scopeBasis: "매출/정산 집계", standardPrice: 1800000, marketPrice: 6000000, reuseLevel: "구현완료", note: null },
  { category: "연동", item: "외부 API 연동(1종)", scopeBasis: "3rd-party 단일 연동", standardPrice: 500000, marketPrice: 1000000, reuseLevel: "일부재사용", note: "연동처별 추가" },
  { category: "인프라", item: "배포·CI/CD·환경구성", scopeBasis: "빌드/배포 파이프라인", standardPrice: 600000, marketPrice: 2000000, reuseLevel: "구현완료", note: null },
  { category: "인프라", item: "DB·스토리지 설계", scopeBasis: "스키마/스토리지 구성", standardPrice: 800000, marketPrice: 1500000, reuseLevel: "일부재사용", note: "서버/스토리지 사용료 별도" },
  { category: "보안", item: "보안·권한·로깅/감사", scopeBasis: "접근로그/보안 처리", standardPrice: 1000000, marketPrice: 2000000, reuseLevel: "일부재사용", note: null },
  { category: "QA", item: "통합 QA·다기기 테스트", scopeBasis: "주요 플로우 회귀/다기기", standardPrice: 1300000, marketPrice: 2600000, reuseLevel: "일부재사용", note: null },
  { category: "QA", item: "안정화·버그픽스", scopeBasis: "출시 전 안정화", standardPrice: 800000, marketPrice: 1500000, reuseLevel: "일부재사용", note: null },
];

const won = (n: number): string =>
  Number.isFinite(n) ? `${Math.round(n).toLocaleString("ko-KR")}원` : "(미정)";

type RateMdRow = Pick<RateSheetSeed, "category" | "item" | "scopeBasis" | "standardPrice" | "note"> & {
  marketPrice?: number | null;
  reuseLevel?: string | null;
};

// rate_sheet 행을 analyzer 프롬프트용 마크다운 표로 직렬화한다.
// BBR 단가(standardPrice)가 견적 기준가, 시세(marketPrice)는 천장(고객 설득용 참고), 재사용도는 근거.
export function buildRateSheetMd(rows: ReadonlyArray<RateMdRow>): string {
  if (!rows || rows.length === 0) return "(단가 산정표 없음)";
  const head = [
    "회사 표준 단가 산정표(기능별, VAT 별도). 우리는 재사용 모듈 + 에이전트로 빠르게 빌드하는 팀이라,",
    "맨땅에서 다 짜주는 SI 시세(천장)보다 낮은 BBR 단가로 견적한다.",
    "- BBR 단가: 견적 산정 기준가. standardItems 의 standardPrice 는 이 값을 기준으로 한다.",
    "- 시세(천장): SI 외주 맨땅 구축 기준. 견적에 직접 쓰지 말고 '시세 대비 절감' 근거로만 활용.",
    "- 재사용도: 구현완료(내부 모듈 보유·통합 위주) / 일부재사용 / 신규(도메인 신규).",
    "",
    "| 대분류 | 산정 항목 | 범위 근거 | BBR 단가 | 시세(천장) | 재사용도 | 비고 |",
    "|---|---|---|---:|---:|---|---|",
  ];
  const body = rows.map((r) => {
    const note = (r.note ?? "").trim();
    const market = typeof r.marketPrice === "number" && r.marketPrice > 0 ? won(r.marketPrice) : "-";
    const reuse = (r.reuseLevel ?? "").trim() || "-";
    return `| ${r.category} | ${r.item} | ${r.scopeBasis} | ${won(r.standardPrice)} | ${market} | ${reuse} | ${note} |`;
  });
  const tail = [
    "",
    "주의: 위 표는 기준선(anchor)이다. 요청한 프로젝트에 없는 모듈은 빼고, 더 무겁거나 가벼우면 범위 근거를 들어 조정한다.",
    "standardItems 단가는 BBR 단가 기준으로 잡되, 재사용도가 '구현완료'인 모듈은 통합·커스터마이즈 위주라 낮게 유지한다.",
  ];
  return [...head, ...body, ...tail].join("\n");
}

// 시트가 비었을 때 fallback 으로 쓰는 기본 기준표 마크다운.
export const STANDARD_BASELINE_MD = buildRateSheetMd(DEFAULT_RATE_SHEET);
