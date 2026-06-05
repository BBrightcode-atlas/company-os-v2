// 실제 analyzer 출력(DB 추출 JSON)을 새 템플릿으로 렌더 → 진짜 데이터 매핑 검증.
import { readFileSync } from "node:fs";
import { renderQuoteHtml } from "../src/template/quote-template.js";
import { DEFAULT_SUPPLIER, type AnalysisResult, type QuoteRecord } from "../src/contract.js";

const raw = JSON.parse(readFileSync(process.env.REAL_QUOTE_JSON || "/tmp/real-quote.json", "utf8"));
const analysis = raw.analysis as AnalysisResult;
const quote: QuoteRecord = {
  id: String(raw.id),
  companyId: "BBR",
  clientName: String(raw.client_name ?? ""),
  requirements: "",
  workScope: String(raw.work_scope ?? ""),
  expectedPrice: null,
  platform: null,
  vatMode: (raw.vat_mode as "별도" | "포함") ?? "별도",
  status: "analyzed",
  analysis,
  html: null,
  errorMessage: null,
  createdAt: typeof raw.created_at === "string" ? raw.created_at : new Date(raw.created_at).toISOString(),
  updatedAt: "",
};

process.stdout.write(renderQuoteHtml(quote, analysis, DEFAULT_SUPPLIER));
