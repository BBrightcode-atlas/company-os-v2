import JSZip from "jszip";
import mammothBrowser from "mammoth/mammoth.browser.js";
import { extractText, getDocumentProxy } from "unpdf";
import type { SourceFormat } from "../contract.js";

type MammothMarkdownResult = {
  value: string;
  messages?: Array<{ type?: string; message?: string }>;
};

type MammothBrowserModule = {
  convertToMarkdown(input: { arrayBuffer: ArrayBuffer }, options?: Record<string, unknown>): Promise<MammothMarkdownResult>;
};

const mammoth = mammothBrowser as MammothBrowserModule;

export type ParsedFile = {
  fileName: string;
  format: SourceFormat;
  text: string;
};

const SUPPORTED_EXTENSIONS = ["txt", "md", "docx", "pptx", "pdf", "xlsx"] as const;

export const FILE_ACCEPT = SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

export function splitRenderedSourceDocumentBlocks(body: string): string[] {
  const trimmed = body.trim();
  if (!trimmed) return [];
  return trimmed.split(/\n\n---\n\n(?=# 기획 자료\(Source Material\) - )/g);
}

export function sourceBodyForRenderedSourceItem(body: string, title: string, documentRef?: string): string {
  const blocks = splitRenderedSourceDocumentBlocks(body);
  const exact = blocks.find((block) => block.includes(`# 기획 자료(Source Material) - ${title}`));
  if (exact) return exact;
  const byRef = documentRef ? blocks.find((block) => block.includes(documentRef)) : null;
  return byRef ?? body;
}

export function formatFromFileName(fileName: string): SourceFormat | null {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "txt":
      return "txt";
    case "md":
    case "markdown":
      return "md";
    case "docx":
      return "docx";
    case "pptx":
      return "pptx";
    case "pdf":
      return "pdf";
    case "xlsx":
      return "xlsx";
    default:
      return null;
  }
}

// XML 엔티티만 최소 디코드. 기획 텍스트 추출 목적이라 완전한 XML 파서는 불필요.
// &amp; 는 마지막에 처리해야 다른 엔티티(&amp;lt; 등)의 이중 디코드를 피한다.
function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

// PPTX OOXML 마크업을 평문으로 변환한다.
// - 단락 종료(paraTag: "a:p") / 줄바꿈(breakTag: "a:br") → 개행
// - 탭(w:tab/a:tab) → 탭 문자 (탭으로 구분된 키-값/간이표가 한 단어로 병합되는 것 방지)
// - 표 행 종료(w:tr/a:tr) → 개행, 셀 종료(w:tc/a:tc) → 탭 (표 구조 최소 보존)
function ooxmlToText(xml: string, paraTag: string, breakTag: string): string {
  const withBreaks = xml
    .replace(/<(?:w:tab|a:tab)\b[^>]*\/?>/g, "\t")
    .replace(/<\/(?:w:tc|a:tc)>/g, "\t")
    .replace(/<\/(?:w:tr|a:tr)>/g, "\n")
    .replace(new RegExp(`<${breakTag}\\b[^>]*/?>`, "g"), "\n")
    .replace(new RegExp(`</${paraTag}>`, "g"), "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  return decodeEntities(stripped)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToMarkdown({ arrayBuffer: buffer });
  return result.value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function slideNumber(name: string): number {
  return Number(name.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
}

async function extractPptx(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => slideNumber(a) - slideNumber(b));
  if (slidePaths.length === 0) throw new Error("pptx에 슬라이드 XML이 없습니다.");

  const slides: string[] = [];
  for (const slidePath of slidePaths) {
    const file = zip.file(slidePath);
    if (!file) continue;
    const num = slideNumber(slidePath);
    let text = ooxmlToText(await file.async("string"), "a:p", "a:br");

    // 발표자 노트도 함께 추출(best-effort: 파일 번호 매칭). 누락보다 over-capture를 택한다.
    const notesFile = zip.file(`ppt/notesSlides/notesSlide${num}.xml`);
    if (notesFile) {
      const notes = ooxmlToText(await notesFile.async("string"), "a:p", "a:br");
      if (notes) text = `${text}\n\n### Notes\n\n${notes}`.trim();
    }
    slides.push(`## Slide ${num}\n\n${text}`.trim());
  }
  return slides.join("\n\n").trim();
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  return text
    .map((pageText, index) => {
      const body = String(pageText ?? "").trim();
      return body ? `## Page ${index + 1}\n\n${body}` : "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function xmlSegments(xml: string, tagName: string): string[] {
  return Array.from(xml.matchAll(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`, "g")))
    .map((match) => match[1] ?? "");
}

function xmlText(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ""))
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractXlsx(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const sharedStringsFile = zip.file("xl/sharedStrings.xml");
  const sharedStrings = sharedStringsFile
    ? xmlSegments(await sharedStringsFile.async("string"), "si").map(xmlText)
    : [];

  const sheetPaths = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/sheet(\d+)\.xml$/)?.[1] ?? 0) - Number(b.match(/sheet(\d+)\.xml$/)?.[1] ?? 0));
  if (sheetPaths.length === 0) throw new Error("xlsx에 worksheet XML이 없습니다.");

  const sheets: string[] = [];
  for (const sheetPath of sheetPaths) {
    const sheetNumber = sheetPath.match(/sheet(\d+)\.xml$/)?.[1] ?? String(sheets.length + 1);
    const xml = await zip.file(sheetPath)?.async("string");
    if (!xml) continue;
    const rows = xmlSegments(xml, "row")
      .map((rowXml) => xmlSegments(rowXml, "c")
        .map((cellXml) => {
          const type = cellXml.match(/\bt="([^"]+)"/)?.[1];
          if (type === "inlineStr") return xmlText(cellXml);
          const rawValue = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
          const value = decodeEntities(rawValue).trim();
          if (type === "s") return sharedStrings[Number(value)] ?? "";
          if (type === "b") return value === "1" ? "TRUE" : value === "0" ? "FALSE" : value;
          return value;
        })
        .filter(Boolean)
        .join("\t"))
      .filter(Boolean);
    if (rows.length > 0) sheets.push(`## Sheet ${sheetNumber}\n\n${rows.join("\n")}`);
  }
  return sheets.join("\n\n").trim();
}

// 단일 파일을 평문 텍스트로 변환. 지원 포맷: txt, md, docx, pptx, pdf, xlsx.
export async function parseFile(file: File): Promise<ParsedFile> {
  const format = formatFromFileName(file.name);
  if (!format) {
    throw new Error(`지원하지 않는 파일 형식입니다: ${file.name}`);
  }

  let text: string;
  if (format === "txt" || format === "md") {
    text = (await file.text()).trim();
  } else if (format === "docx") {
    text = await extractDocx(await file.arrayBuffer());
  } else if (format === "pptx") {
    text = await extractPptx(await file.arrayBuffer());
  } else if (format === "pdf") {
    text = await extractPdf(await file.arrayBuffer());
  } else {
    text = await extractXlsx(await file.arrayBuffer());
  }

  if (!text.trim()) {
    throw new Error(`${file.name}에서 텍스트를 추출하지 못했습니다.`);
  }

  return { fileName: file.name, format, text };
}
