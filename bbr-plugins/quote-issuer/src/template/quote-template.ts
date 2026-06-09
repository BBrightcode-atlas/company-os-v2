// 견적서 HTML 템플릿 모듈.
// 기존 회사 표준 엑셀 견적서(개발견적서_*.xlsx)의 시각 레이아웃을 1:1 재현한다.
// 15컬럼(엑셀 A~O) 단일 그리드: 제목밴드 → 공급자정보 → 품목표(기간/공급가액/비고 세로병합)
//   → 일정·설명 → 합계/부가세/총계. 의존성 없이 순수 문자열 생성. A4 세로 1페이지 인쇄/PDF 친화.
//
// 시각 기준(ground truth): /Users/bright/Downloads/채슬리투자자문-개발견적서-20260602.pdf (엑셀 출력물)
//   - 셀 구조 A1:O39, merge 범위/컬럼폭은 동일 xlsx 에서 파싱해 colspan/rowspan/colgroup 으로 매핑.

import type {
  AnalysisResult,
  QuoteRecord,
  ScopeBlock,
  StandardItem,
  SupplierInfo,
} from "../contract.js";

// ──────────────────────────────────────────────────────────────────────────
// 유틸 헬퍼
// ──────────────────────────────────────────────────────────────────────────

/**
 * HTML 이스케이프. 사용자/분석 텍스트를 그대로 마크업에 넣기 전 반드시 통과시킨다(XSS 방지).
 * null/undefined 는 빈 문자열로 처리한다.
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 줄바꿈(\n)을 <br>로 변환. 먼저 이스케이프한 뒤 호출해야 안전하다. */
function nl2br(escaped: string): string {
  return escaped.replace(/\r?\n/g, "<br />");
}

/** 이스케이프 + 줄바꿈 보존을 한 번에. 자유 입력 텍스트 셀에 사용. */
function safeMultiline(input: unknown): string {
  return nl2br(escapeHtml(input));
}

/** 금액을 엑셀 견적서 표기(₩ + 천단위 콤마)로. 음수는 부호 유지. */
function won(amount: number | null | undefined): string {
  const n = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return `₩${n.toLocaleString("ko-KR")}`;
}

/** ISO/날짜 문자열을 'YYYY.MM.DD' 로. 파싱 실패 시 오늘 날짜로 대체. */
function formatDate(value?: string | null): string {
  const d = value ? new Date(value) : new Date();
  const valid = !Number.isNaN(d.getTime()) ? d : new Date();
  const y = valid.getFullYear();
  const m = String(valid.getMonth() + 1).padStart(2, "0");
  const day = String(valid.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/** workScope/요건에서 그룹 밴드 제목을 유도(첫 문장 또는 첫 줄). */
function deriveGroupTitle(quote: QuoteRecord, analysis: AnalysisResult): string {
  const explicit = (analysis.groupTitle ?? "").trim();
  if (explicit) return explicit;
  const scope = (quote.workScope ?? "").trim();
  if (scope) {
    const firstLine = scope.split(/\r?\n/)[0].trim();
    const firstSentence = firstLine.split(/(?<=[.。·])\s/)[0].trim();
    return (firstSentence || firstLine).slice(0, 60);
  }
  return `${quote.clientName} 개발 구축`;
}

/** 일정/설명 블록 본문을 scope/summary 에서 조립(엑셀의 '- ' 불릿 + '별도 범위:' 패턴). */
function buildNotesLines(analysis: AnalysisResult): string[] {
  const lines: string[] = [];
  const scope: ScopeBlock = analysis.scope ?? {
    included: [],
    excluded: [],
    assumptions: [],
    externalCosts: [],
  };
  const summary = (analysis.summary ?? "").trim();
  if (summary) lines.push(summary);
  // 핵심 범위(주요/별도)를 전제보다 우선 노출 — 5줄 제한에서 범위가 잘리지 않게.
  const included = (scope.included ?? []).map((s) => (s ?? "").trim()).filter(Boolean);
  if (included.length) lines.push(`주요 범위: ${included.join(", ")}`);
  const excluded = [
    ...(scope.excluded ?? []),
    ...(scope.externalCosts ?? []),
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  if (excluded.length) lines.push(`별도 범위: ${excluded.join(", ")}`);
  for (const a of scope.assumptions ?? []) {
    const t = (a ?? "").trim();
    if (t) lines.push(t);
  }
  return lines.slice(0, 5); // 일정/설명은 최대 5줄
}

// ──────────────────────────────────────────────────────────────────────────
// 스타일 (엑셀 견적서 룩: 맑은 고딕 계열, 얇은 검정 그리드, A4 세로 1페이지)
// ──────────────────────────────────────────────────────────────────────────

const STYLE = `
      @page {
        size: A4 portrait;
        margin: 12mm 10mm;
      }

      * { box-sizing: border-box; }

      html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      body {
        margin: 0;
        color: #000;
        background: #fff;
        font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo",
          "Pretendard Variable", Pretendard, "Noto Sans KR", sans-serif;
        font-size: 9pt;
        line-height: 1.3;
      }

      .quote {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .quote col { /* 폭은 colgroup 에서 개별 지정 */ }

      .quote td {
        border: 1px solid #000;
        padding: 3px 5px;
        vertical-align: middle;
        word-break: break-word;
        overflow: hidden;
      }

      /* 제목 밴드 (A1:O3) */
      .q-title {
        height: 70px;
        text-align: center;
        font-size: 22pt;
        font-weight: 800;
        letter-spacing: 0.02em;
      }

      /* 공급자 정보 블록 (4~8행) */
      .q-meta-left {
        vertical-align: top;
        padding: 10px 8px;
        font-size: 10pt;
        line-height: 1.9;
      }
      .q-supplier-label {
        text-align: center;
        font-size: 11pt;
        font-weight: 700;
      }
      .q-lbl {
        text-align: center;
        font-weight: 700;
        white-space: nowrap;
      }
      .q-val { text-align: left; }

      /* 빈 간격 행 (A9:O9) */
      .q-spacer { height: 6px; padding: 0; border-left: none; border-right: none; }

      /* 품목 표 헤더 (10행) */
      .q-head td {
        text-align: center;
        font-weight: 700;
        white-space: nowrap;
      }

      /* 그룹 밴드 (11행) */
      .q-group {
        font-weight: 700;
        text-align: left;
      }

      /* 품목 행 */
      .q-no { text-align: center; }
      .q-cat { text-align: left; }
      .q-item { text-align: left; }
      .q-period { text-align: center; vertical-align: middle; }
      .q-price {
        text-align: right;
        vertical-align: middle;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .q-note { text-align: center; vertical-align: middle; white-space: nowrap; }
      .q-empty { height: 19px; }

      /* 일정 / 설명 (24~36행) */
      .q-notes {
        vertical-align: top;
        text-align: left;
        padding: 6px 7px;
        height: 340px;
        line-height: 1.55;
      }
      .q-notes-title { font-weight: 700; margin-bottom: 3px; }
      .q-notes-line {
        position: relative;
        padding-left: 11px;
        margin: 1.5px 0;
      }
      .q-notes-line::before {
        content: "-";
        position: absolute;
        left: 0;
      }
      .q-notes-lead { margin: 0 0 4px; padding-left: 0; }
      .q-notes-lead::before { content: none; }

      /* 합계 / 부가세 / 총계 (37~39행) */
      .q-sum-label { text-align: center; font-weight: 700; }
      .q-sum-value {
        text-align: right;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .q-total .q-sum-label,
      .q-total .q-sum-value { font-weight: 800; }`;

// ──────────────────────────────────────────────────────────────────────────
// 진입점
// ──────────────────────────────────────────────────────────────────────────

// 엑셀 A~O 컬럼폭(문자단위, xlsx 파싱값) → colgroup 비율. 합계 91.4.
const COL_WIDTHS = [4.4, 13.5, 7.7, 6.5, 8.4, 1.4, 3.0, 6.4, 5.4, 4.9, 4.4, 7.4, 1.4, 3.2, 9.4];
const COL_TOTAL = COL_WIDTHS.reduce((a, b) => a + b, 0);

/**
 * 완성된 단일 HTML 견적서 문서 문자열을 반환한다.
 * 회사 표준 엑셀 견적서와 동일한 그리드로 A4 세로 1페이지 렌더된다.
 *
 * @param quote    견적 레코드(고객사/일자 등)
 * @param analysis analyzer 가 산출한 구조화 분석 JSON
 * @param supplier 공급자 정보
 */
export function renderQuoteHtml(
  quote: QuoteRecord,
  analysis: AnalysisResult,
  supplier: SupplierInfo,
): string {
  const docTitle = `${quote.clientName} 개발견적서`;
  const issueDate = formatDate(quote.createdAt);
  const clientName = quote.clientName || "고객사";

  const colgroup = COL_WIDTHS.map(
    (w) => `<col style="width:${((w / COL_TOTAL) * 100).toFixed(3)}%" />`,
  ).join("");

  // ── 품목 행: standardItems → 분류/항목. 엑셀처럼 최소 12행 확보(빈 행 패딩). ──
  const items: StandardItem[] = analysis.standardItems ?? [];
  const rowCount = Math.max(12, items.length);
  const period = (analysis.period ?? "").trim() || "협의";
  const vatNote = analysis.pricing?.vatMode === "포함" ? "VAT 포함" : "VAT 별도";
  const groupPrice = won(analysis.pricing?.proposedSupply ?? 0);

  const itemRows: string[] = [];
  for (let i = 0; i < rowCount; i++) {
    const it = items[i];
    const no = i + 1;
    const cat = it ? safeMultiline(it.category) : "";
    const item = it ? safeMultiline(it.item) : "";
    if (i === 0) {
      // 첫 품목 행에서 기간/공급가액/비고 세로 병합(rowspan = 전체 품목행 수).
      itemRows.push(
        `        <tr>
          <td class="q-no">${no}</td>
          <td class="q-cat">${cat}</td>
          <td class="q-item" colspan="6">${item}</td>
          <td class="q-period" colspan="2" rowspan="${rowCount}">${safeMultiline(period)}</td>
          <td class="q-price" colspan="3" rowspan="${rowCount}">${escapeHtml(groupPrice)}</td>
          <td class="q-note" colspan="2" rowspan="${rowCount}">${escapeHtml(vatNote)}</td>
        </tr>`,
      );
    } else {
      itemRows.push(
        `        <tr${it ? "" : ' class="q-empty"'}>
          <td class="q-no">${no}</td>
          <td class="q-cat">${cat}</td>
          <td class="q-item" colspan="6">${item}</td>
        </tr>`,
      );
    }
  }

  // ── 일정 / 설명 본문 ──
  const notesLines = buildNotesLines(analysis);
  const notesHtml = notesLines.length
    ? notesLines
        .map((ln, idx) =>
          idx === 0 && (analysis.summary ?? "").trim()
            ? `<div class="q-notes-line q-notes-lead">${safeMultiline(ln)}</div>`
            : `<div class="q-notes-line">${safeMultiline(ln)}</div>`,
        )
        .join("")
    : `<div class="q-notes-line">${safeMultiline(quote.workScope)}</div>`;

  // ── 합계 / 부가세 / 총계 ──
  const sumSupply = won(analysis.pricing?.proposedSupply ?? 0);
  const sumVat = won(analysis.pricing?.vat ?? 0);
  const sumTotal = won(analysis.pricing?.total ?? 0);
  const groupTitle = deriveGroupTitle(quote, analysis);

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
    <table class="quote">
      <colgroup>${colgroup}</colgroup>
      <tbody>
        <tr>
          <td class="q-title" colspan="15">개 발  견 적 서 - ${escapeHtml(clientName)}</td>
        </tr>

        <tr>
          <td class="q-meta-left" colspan="4" rowspan="5">견적일자: ${escapeHtml(
            issueDate,
          )}<br /><br />고객명: ${escapeHtml(clientName)}</td>
          <td class="q-supplier-label" colspan="2" rowspan="5">공급자</td>
          <td class="q-lbl" colspan="3">사업자번호</td>
          <td class="q-val" colspan="6">${escapeHtml(supplier.bizNo)}</td>
        </tr>
        <tr>
          <td class="q-lbl" colspan="3">사업장소재지</td>
          <td class="q-val" colspan="6">${safeMultiline(supplier.address)}</td>
        </tr>
        <tr>
          <td class="q-lbl" colspan="3">상&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;호</td>
          <td class="q-val" colspan="6">${escapeHtml(supplier.companyName)}</td>
        </tr>
        <tr>
          <td class="q-lbl" colspan="3">업&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;태</td>
          <td class="q-val" colspan="2">${escapeHtml(supplier.bizType)}</td>
          <td class="q-lbl">종&nbsp;&nbsp;목</td>
          <td class="q-val" colspan="3">${escapeHtml(supplier.bizItem)}</td>
        </tr>
        <tr>
          <td class="q-lbl" colspan="3">대표자</td>
          <td class="q-val" colspan="2">${escapeHtml(supplier.ceo)}</td>
          <td class="q-lbl">전화번호</td>
          <td class="q-val" colspan="3">${escapeHtml(supplier.phone)}</td>
        </tr>

        <tr><td class="q-spacer" colspan="15"></td></tr>

        <tr class="q-head">
          <td>구분</td>
          <td>분류</td>
          <td colspan="6">항목</td>
          <td colspan="2">기간</td>
          <td colspan="3">공급가액(월)</td>
          <td colspan="2">비고</td>
        </tr>

        <tr>
          <td class="q-group" colspan="15">${escapeHtml(groupTitle)}</td>
        </tr>

${itemRows.join("\n")}

        <tr>
          <td class="q-notes" colspan="15">
            <div class="q-notes-title">일정 / 설명</div>
            ${notesHtml}
          </td>
        </tr>

        <tr>
          <td class="q-sum-label" colspan="5">합계</td>
          <td class="q-sum-value" colspan="10">${escapeHtml(sumSupply)}</td>
        </tr>
        <tr>
          <td class="q-sum-label" colspan="5">부가세</td>
          <td class="q-sum-value" colspan="10">${escapeHtml(sumVat)}</td>
        </tr>
        <tr class="q-total">
          <td class="q-sum-label" colspan="5">총계(만원미만 절삭)</td>
          <td class="q-sum-value" colspan="10">${escapeHtml(sumTotal)}</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`;
}
