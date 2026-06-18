import JSZip from "jszip";
import type { SourceFormat } from "../contract.js";

export type ParsedFile = {
  fileName: string;
  format: SourceFormat;
  text: string;
};

const SUPPORTED_EXTENSIONS = ["txt", "md", "docx", "pptx"] as const;

export const FILE_ACCEPT = SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

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

// OOXML 마크업을 평문으로 변환한다.
// - 단락 종료(paraTag: docx="w:p", pptx="a:p") / 줄바꿈(breakTag: "w:br"/"a:br") → 개행
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

// docx 본문 외에 머리글/바닥글/각주/미주 텍스트도 누락 없이 모은다. 본문(document)을 먼저 둔다.
function docxPartOrder(name: string): number {
  if (name === "word/document.xml") return 0;
  if (/^word\/header\d*\.xml$/.test(name)) return 1;
  if (/^word\/footnotes\.xml$/.test(name)) return 2;
  if (/^word\/endnotes\.xml$/.test(name)) return 3;
  if (/^word\/footer\d*\.xml$/.test(name)) return 4;
  return -1;
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  if (!zip.file("word/document.xml")) throw new Error("docx에 word/document.xml이 없습니다.");
  const parts = Object.keys(zip.files)
    .filter((name) => docxPartOrder(name) >= 0)
    .sort((a, b) => docxPartOrder(a) - docxPartOrder(b) || a.localeCompare(b));

  const texts: string[] = [];
  for (const part of parts) {
    const file = zip.file(part);
    if (!file) continue;
    const text = ooxmlToText(await file.async("string"), "w:p", "w:br");
    if (text) texts.push(text);
  }
  return texts.join("\n\n").trim();
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

// 단일 파일을 평문 텍스트로 변환. 지원 포맷: txt, md, docx, pptx.
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
  } else {
    text = await extractPptx(await file.arrayBuffer());
  }

  if (!text.trim()) {
    throw new Error(`${file.name}에서 텍스트를 추출하지 못했습니다.`);
  }

  return { fileName: file.name, format, text };
}
