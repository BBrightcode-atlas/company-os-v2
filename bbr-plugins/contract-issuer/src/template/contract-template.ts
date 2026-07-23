// 계약서 HTML 템플릿. 원본 "비브라이트코드_표준_도급계약서_v2.docx" 를 1:1 재현한다.
// 고정 법조항(제1~12조 + 부속조항)은 verbatim, 빈칸 필드만 ContractData 로 채운다.
// 의존성 없이 순수 문자열 생성. A4 세로 인쇄/PDF 친화.

import type { ContractData, ContractRecord, ContractType, EulInfo } from "../contract.js";
import { contractTypeLabel } from "../contract.js";
import { SEAL_DATA_URI } from "./seal.js";

// ──────────────────────────────────────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────────────────────────────────────

export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(escaped: string): string {
  return escaped.replace(/\r?\n/g, "<br />");
}
function safeMultiline(input: unknown): string {
  return nl2br(escapeHtml(input));
}

/** 금액 → 천단위 콤마 + '원'. 미정(0/누락)이면 빈칸 표기. */
function won(amount: number | null | undefined): string {
  const n = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  if (n <= 0) return "________원";
  return `${n.toLocaleString("ko-KR")}원`;
}

/** split 지급방법: 착수 시점 비율(pct%, 큰 금액 단위 라운드) + 완료 시 잔금. */
function payTermsLumpSum(total: number | null | undefined, pct?: number | null): string {
  const p = typeof pct === "number" && Number.isFinite(pct) ? Math.min(99, Math.max(1, Math.round(pct))) : 30;
  const janPct = 100 - p;
  const t = typeof total === "number" && Number.isFinite(total) && total > 0 ? total : 0;
  if (t <= 0) {
    return `착수 시점에 계약금액의 ${p}%(착수금), 납품·검수 완료 시 잔금 ${janPct}% 지급`;
  }
  const unit = t >= 9_000_000 ? 1_000_000 : t >= 900_000 ? 100_000 : 10_000;
  let chak = Math.round((t * p) / 100 / unit) * unit;
  if (chak <= 0) chak = unit;
  if (chak >= t) chak = Math.floor(t / 2);
  const jan = t - chak;
  return `착수 시점에 ${won(chak)}(${p}%), 납품·검수 완료 시 잔금 ${won(jan)} 지급`;
}

/** 'YYYY-MM-DD' → 'YYYY년 MM월 DD일'. 빈값이면 빈칸 표기. */
function krDate(value?: string | null): string {
  const t = (value ?? "").trim();
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return "____년 __월 __일";
  return `${m[1]}년 ${String(m[2]).padStart(2, "0")}월 ${String(m[3]).padStart(2, "0")}일`;
}

/** 종료일 등: 날짜면 'YYYY년 MM월 DD일', 자유문구면("완료시까지") 그대로(이스케이프). */
function krDateOrText(value?: string | null): string {
  const t = (value ?? "").trim();
  if (!t) return "____년 __월 __일";
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(t)) return krDate(t);
  return escapeHtml(t);
}

/** 'YYYY-MM-DD' → 'YYMMDD'. 없거나 형식 아니면 렌더 시점(오늘)로 대체. 파일명용. */
function toYYMMDD(value?: string | null): string {
  const t = (value ?? "").trim();
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1].slice(2) + m[2].padStart(2, "0") + m[3].padStart(2, "0");
  const d = new Date();
  if (Number.isNaN(d.getTime())) return "";
  return (
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0")
  );
}

/** 파일명에 못 쓰는 문자 제거. */
function fileSafe(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
}

/** 빈 문자열이면 밑줄 placeholder. */
function orBlank(v: string | null | undefined, width = 12): string {
  const t = (v ?? "").trim();
  return t.length > 0 ? escapeHtml(t) : "_".repeat(width);
}

// ──────────────────────────────────────────────────────────────────────────
// 스타일 (계약서 룩: 명조/고딕, A4 세로, 조항 들여쓰기)
// ──────────────────────────────────────────────────────────────────────────

const STYLE = `
      @page { size: A4 portrait; margin: 18mm 18mm; }
      * { box-sizing: border-box; }
      html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body {
        margin: 0; color: #111; background: #fff;
        font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo",
          "Pretendard Variable", Pretendard, "Noto Sans KR", sans-serif;
        font-size: 10.5pt; line-height: 1.7;
      }
      .doc { width: 100%; max-width: 820px; margin: 0 auto; }
      .c-title {
        text-align: center; font-size: 19pt; font-weight: 800;
        letter-spacing: 0.3em; margin: 0 0 18px; padding-bottom: 6px;
      }
      .c-preamble { margin: 0 0 14px; line-height: 1.8; }
      .c-art {
        margin: 14px 0 4px; font-weight: 800; font-size: 11.5pt;
        break-after: avoid;
      }
      .c-art-sub { margin: 10px 0 4px; font-weight: 700; }
      .c-body { margin: 2px 0; }
      .c-li { margin: 1px 0 1px 1.1em; text-indent: -1.1em; }
      .c-li2 { margin: 1px 0 1px 2.2em; text-indent: -1.1em; }
      .fill { font-weight: 700; }
      .c-note { color: #444; }
      /* 서명부 */
      .c-close { margin: 22px 0 6px; }
      .c-date { text-align: center; margin: 14px 0 18px; font-weight: 600; }
      .c-sign { width: 100%; border-collapse: collapse; margin-top: 8px; }
      .c-sign td {
        border: 1px solid #111; padding: 10px 12px; vertical-align: top;
        width: 50%; line-height: 1.9;
      }
      .c-sign .who { font-weight: 800; margin-bottom: 6px; }
      /* 을 직인(법인인감) — "(인)" 위에 80x80 오버레이 */
      .seal-wrap { position: relative; display: inline-block; }
      .seal-img {
        position: absolute; left: 50%; top: 50%;
        width: 80px; height: 80px; transform: translate(-50%, -50%);
        pointer-events: none;
      }`;

// ──────────────────────────────────────────────────────────────────────────
// 본문 조립 (고정 조항 verbatim + 가변 필드)
// ──────────────────────────────────────────────────────────────────────────

function renderScope(data: ContractData & { projectDesc?: string }, type: ContractType): string {
  const projectDesc = data.projectDesc ?? "";
  if (projectDesc.trim()) {
    return '<div class="c-body">' + safeMultiline(projectDesc) + "</div>";
  }

  const devFallback = [
    `${data.projectName || "[서비스/제품명]"} 웹/앱 개발(신규 기능 포함)`,
    "서비스 운영과 관련된 관리용 페이지/도구 개발(Admin, QA 자동화 등)",
    "상기 1)~2)와 직접 관련된 버그 수정, 성능 개선, 보안 패치, 운영 이슈 대응",
  ];
  const maintFallback = [
    `${data.projectName || "[서비스/제품명]"} 운영 및 유지보수(장애 대응, 버그 수정, 보안 패치)`,
    "성능 모니터링·개선 및 운영 안정화",
    "경미한 기능 개선/변경 및 운영 문의 대응",
    "상기 항목과 직접 관련된 배포·롤백 및 운영 이슈 대응",
  ];
  const items =
    data.scopeItems && data.scopeItems.length > 0
      ? data.scopeItems
      : type === "maintenance"
        ? maintFallback
        : devFallback;
  return items
    .map((s, i) => `<div class="c-li2">${i + 1}) ${safeMultiline(s)}</div>`)
    .join("");
}

// ──────────────────────────────────────────────────────────────────────────
// 진입점
// ──────────────────────────────────────────────────────────────────────────

/**
 * 완성된 단일 HTML 계약서 문서 문자열을 반환한다(도급계약서 표준).
 */
export function renderContractHtml(
  contract: ContractRecord,
  sourceData: ContractData,
  eul: EulInfo,
): string {
  const data = { ...sourceData, projectDesc: contract.projectDesc };
  const gab = orBlank(data.gabCompany || contract.gabCompany, 16);
  const project = orBlank(data.projectName || contract.projectName, 16);
  const jurisdiction = (data.jurisdiction ?? "").trim();
  const typeWord = contractTypeLabel(contract.contractType); // "개발" | "유지보수"
  // 유지보수는 "유지보수 계약서", 개발은 "개발 도급계약서".
  const titleText =
    contract.contractType === "maintenance" ? "유지보수 계약서" : `${typeWord} 도급계약서`;
  // 파일명(=문서 title)은 NFC 정규화. macOS 한글 NFD(자모분리) 방지.
  const docTitle = `${titleText.replace(/\s+/g, "")}_${fileSafe(data.gabCompany || contract.gabCompany || "갑")}_${toYYMMDD(
    data.contractDate || contract.contractDate,
  )}`.normalize("NFC");

  const body = `
    <div class="c-title">${titleText}</div>

    <p class="c-preamble">
      <span class="fill">${gab}</span>(이하 “갑”이라 한다)과
      ${escapeHtml(eul.companyName)}(이하 “을”이라 한다)은
      <span class="fill">${project}</span> ${typeWord}(이하 “본 업무”)를 위하여
      다음과 같이 도급계약을 체결한다.
    </p>

    <div class="c-art">제 1 조 【 목적 】</div>
    <div class="c-body">본 계약은 “갑”이 “을”에게 의뢰한 본 업무를 효과적으로 수행하기 위하여 도급업무의 범위, 납품·검수, 대금지급, 비밀유지, 지식재산권, 계약해지 등 제반 사항을 정함을 목적으로 한다.</div>

    <div class="c-art">제 2 조 【 도급업무의 범위 】</div>
    <div class="c-art-sub">① 업무정의</div>
    ${renderScope(data, contract.contractType)}
    <div class="c-art-sub">② 책임</div>
    <div class="c-body">“을”은 계약기간 내 완수를 목표로 “갑”이 의뢰한 작업내용을 수행하며, 완성도·품질·운영 가능성(배포/운영 재현 가능 포함)에 대한 책임을 진다.</div>
    <div class="c-body">③ 산출물 및 세부 범위는 별첨(요구사항 정의서, 일정표, 견적서, 제안서 등)이 있는 경우 해당 별첨을 따른다.</div>

    <div class="c-art">제 3 조 【 계약기간 및 계약금액 】</div>
    <div class="c-body">계약기간: <span class="fill">${krDate(data.periodStart)}</span> ~ <span class="fill">${krDateOrText(data.periodEnd)}</span></div>
    ${
      contract.payMethod === "monthly" && typeof data.monthlyAmount === "number" && data.monthlyAmount > 0
        ? `<div class="c-body">계약금액: 월 <span class="fill">${won(data.monthlyAmount)}</span> (VAT ${escapeHtml(data.vatMode)})</div>`
        : ""
    }
    <div class="c-body">총 계약금액: <span class="fill">${won(data.totalAmount)}</span> (VAT ${escapeHtml(data.vatMode)})</div>
    <div class="c-body">지급방법: ${
      contract.payMethod === "monthly"
        ? "매월 말일 지급(세금계산서 발행 후 당월 말일 지급)"
        : contract.payMethod === "on_completion"
          ? "납품·검수 완료(검수 승인) 시 총 계약금액 전액을 일시 지급"
          : escapeHtml(payTermsLumpSum(data.totalAmount, contract.downPaymentPct))
    }</div>
    <div class="c-body">단, “을”의 귀책 또는 개인 사정으로 업무 수행이 중단되거나 개발을 완료하지 못한 경우, 기 지급된 대가를 실제 수행분 기준으로 정산하며 과지급분이 있는 경우 “갑”은 환수할 수 있다.</div>

    <div class="c-art">제 4 조 【 납품 】</div>
    <div class="c-body">본 업무의 최소 납품물은 아래 각 호를 포함한다.</div>
    <div class="c-li">① 소스코드 및 버전 이력(“갑”이 지정한 저장소/레포지토리에 반영)</div>
    <div class="c-li">② 빌드/배포 절차 및 재현 문서(환경 구성, 배포 순서, 롤백 포함)</div>
    <div class="c-li">③ DB 스키마/마이그레이션 스크립트(해당 시)</div>
    <div class="c-li">④ 운영 가이드, 장애 대응 가이드, 모니터링/로그 항목 설명</div>
    <div class="c-li">⑤ 테스트 결과(단위/통합/회귀) 및 주요 결함 조치 내역</div>
    <div class="c-li">⑥ 관리자/운영 기능 관련 권한 및 감사로그(해당 시)</div>

    <div class="c-art">제 4의 2 조 【 검수 및 인수 】</div>
    <div class="c-li">① “갑”은 납품일로부터 10영업일 내에 검수하여 승인 또는 반려(하자 목록 포함)를 통지한다.</div>
    <div class="c-li">② “을”은 반려 통지일로부터 5영업일 내에 하자를 무상으로 보완하여 재납품하여야 한다.</div>
    <div class="c-li">③ 다음 각 호는 “중대한 하자”로 하며, “갑”은 승인할 수 없고 반려할 수 있다.</div>
    <div class="c-li2">1. 서비스 불능 또는 핵심 기능 장애로 업무/서비스 운영에 중대한 영향이 있는 경우</div>
    <div class="c-li2">2. 개인정보/인증정보/비밀정보 노출 또는 중대한 보안 취약점이 존재하는 경우</div>
    <div class="c-li2">3. 데이터 무결성 훼손 또는 복구 불가능 위험이 있는 경우</div>
    <div class="c-li2">4. 배포/운영 재현 불가로 운영이 현저히 곤란한 상태</div>
    <div class="c-li">④ “갑”이 검수기간 내 의사표시를 하지 않은 경우에도, 중대한 하자가 확인되면 “갑”은 시정 요구를 할 수 있다.</div>

    <div class="c-art">제 5 조 【 자료제공 】</div>
    <div class="c-body">“갑”은 “을”이 업무 수행에 필요한 자료(요구사항, 디자인, 정책, 테스트 계정/환경 등)를 제공한다. 단, “을”은 제공받은 자료를 본 계약 목적 외로 사용하거나 제3자에게 제공할 수 없다.</div>

    <div class="c-art">제 6 조 【 비밀유지 】</div>
    <div class="c-li">1. “을”은 본 업무와 관련된 일체의 정보를 외부에 누설하거나 유출해서는 아니되며, 이로 인해 발생하는 모든 책임을 진다.</div>
    <div class="c-li">2. “을”은 “갑”의 비밀정보 및 고객정보(개인정보 포함)를 목적 외로 사용하거나 무단 복제·반출·제공할 수 없다.</div>
    <div class="c-li">3. 계약 종료 또는 “갑”의 요청 시, “을”은 관련 자료·데이터·사본을 즉시 반환 또는 파기하고, 파기 사실을 증빙할 수 있는 자료를 제출한다.</div>

    <div class="c-art">제 6의 2 조 【 보안 및 개인정보 보호 】</div>
    <div class="c-li">1. “을”은 최소권한 원칙에 따라 접근권한을 부여받으며, 계정 공유를 금지한다.</div>
    <div class="c-li">2. 개발/테스트 목적의 실데이터(고객정보 포함) 사용은 원칙적으로 금지하며, 불가피한 경우 “갑”의 사전 승인을 받아야 한다.</div>
    <div class="c-li">3. 보안사고(의심 포함) 발생 시 “을”은 24시간 이내 “갑”에게 통지하고 조사·복구·재발방지에 협조한다.</div>
    <div class="c-li">4. “을”은 본 업무를 제3자에게 재위탁/재하도급할 수 없으며, 불가피한 경우 “갑”의 사전 서면 승인을 받아야 한다.</div>

    <div class="c-art">제 7 조 【 품질 】</div>
    <div class="c-li">1. “을”은 본 계약에 의해 진행 완료된 성과물이 “갑”이 정상적으로 활용(개발·배포·운영 가능)할 수 있는 수준의 품질을 보장한다.</div>
    <div class="c-li">2. “갑”이 제4조의2에 따른 검수에서 반려한 경우, “을”은 무상으로 하자를 보완하여야 하며, 정당한 사유 없이 미이행 시 “갑”은 대금 지급을 유보하거나 본 계약을 해지할 수 있다.</div>
    <div class="c-li">3. 품질 판단은 검수 절차 및 중대한 하자 기준에 따른다.</div>

    <div class="c-art">제 8 조 【 해지 】</div>
    <div class="c-body">“갑”은 다음 각 호에 해당될 경우 “을”의 귀책사유로 본 계약을 해지할 수 있다.</div>
    <div class="c-li">① 정당한 이유 없이 작업 진행이 이루어지지 않을 때</div>
    <div class="c-li">② 정당한 이유 없이 계약기간에 작업완료가 불가능하다고 판단될 때</div>
    <div class="c-li">③ 기타 “갑”이 필요하다고 판단될 때</div>
    <div class="c-li">④ 제4조의2(검수) 반려가 반복되거나, 제6조의2(보안) 위반 등으로 서비스 운영에 중대한 위험이 발생한 때</div>

    <div class="c-art">제 8의 2 조 【 계약 종료 시 인수인계 】</div>
    <div class="c-li">1. 계약 해지 또는 종료 시 “을”은 종료일로부터 15영업일 이내에 다음 각 호를 무상으로 이행한다.</div>
    <div class="c-li2">① 최신 소스코드/문서/테스트 결과/운영가이드 일체 인도</div>
    <div class="c-li2">② 저장소, CI/CD, 클라우드 권한 등 접근권한 이관 및 “을” 권한 회수</div>
    <div class="c-li2">③ “갑” 정보 및 개인정보 반환/파기 및 파기증적 제출</div>
    <div class="c-li2">④ 전환 지원(지식 이전, Q&amp;A, 안정화 지원) 최소 2주 제공</div>
    <div class="c-li">2. “을”의 인수인계 미이행으로 “갑”에게 손해가 발생한 경우, “갑”은 손해배상을 청구할 수 있다.</div>

    <div class="c-art">제 9 조 【 도급업무 완성 결과의 귀속 】</div>
    <div class="c-li">1. “을”이 본 계약에 따라 개발한 결과물(소스코드, 문서, 산출물 등)의 소유권 및 지식재산권은 별도 합의가 없는 한 대금 완납 시 “갑”에게 귀속된다.</div>
    <div class="c-li">2. “을”은 “갑”의 사전 서면 동의 없이는 결과물을 전용하거나 제3자에게 양도·사용허락할 수 없다.</div>
    <div class="c-li">3. “을”은 결과물이 제3자의 특허권·저작권 등 지식재산권을 침해하지 않도록 하며, 제3자가 “을”을 상대로 제기하는 분쟁으로부터 “갑”은 책임지지 아니한다. 단, “갑”의 제공자료 또는 지시로 인한 침해는 제외한다.</div>

    <div class="c-art">제 10 조 【 배상책임 】</div>
    <div class="c-body">“을”의 귀책사유로 납기 지연, 보안사고, 계약 위반 등으로 본 계약이 불이행된 경우 “을”은 “갑”이 입은 손해를 배상한다. 다만, 간접손해·특별손해의 범위 및 손해배상 한도는 별첨 또는 별도 합의에 따른다.</div>

    <div class="c-art">제 11 조 【 해석 】</div>
    <div class="c-body">본 계약에 명기하지 아니한 사항 및 본 계약의 해석상 이의가 있을 때에는 쌍방 협의로 결정한다. 협의가 원만하지 않을 경우 관계 법령 및 상관례에 따른다.</div>

    <div class="c-art">제 12 조 【 관할 】</div>
    <div class="c-body">본 계약으로 발생하는 분쟁의 관할법원은 ${
      jurisdiction
        ? `<span class="fill">${escapeHtml(jurisdiction)}</span>`
        : `“갑”의 본점 소재지 관할 법원`
    }으로 한다.</div>

    <div class="c-close">본 계약을 증명하기 위하여 계약서 2통을 작성하여 쌍방이 서명 또는 날인하고 각각 1통씩 보관한다.</div>
    <div class="c-date">계약일자: <span class="fill">${krDate(data.contractDate)}</span></div>

    <table class="c-sign">
      <tbody>
        <tr>
          <td>
            <div class="who">(갑) ${gab}</div>
            ${
              contract.gabKind === "individual"
                ? `${gab} (인)<br />
            ${contract.gabBirth ? `생년월일: ${orBlank(contract.gabBirth, 12)}<br />` : ""}주소: ${orBlank(data.gabAddress, 20)}`
                : `대표자: ${orBlank(data.gabCeo, 10)} (인)<br />
            사업자등록번호: ${orBlank(data.gabBizNo, 14)}<br />
            주소: ${orBlank(data.gabAddress, 20)}`
            }
          </td>
          <td>
            <div class="who">(을) ${escapeHtml(eul.companyName)}</div>
            대표자: ${escapeHtml(eul.ceo)} <span class="seal-wrap">(인)${
              contract.useSeal
                ? `<img class="seal-img" src="${SEAL_DATA_URI}" alt="직인" />`
                : ""
            }</span><br />
            사업자등록번호: ${escapeHtml(eul.bizNo)}<br />
            주소: ${escapeHtml(eul.address)}
          </td>
        </tr>
      </tbody>
    </table>`;

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(docTitle)}</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
    />
    <style>${STYLE}
    </style>
  </head>
  <body>
    <main class="doc">
${body}
    </main>
  </body>
</html>
`;
}
