import {
  Children,
  isValidElement,
  type CSSProperties,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { isMermaidLanguage, MermaidDiagram } from "./MermaidDiagram.js";

/**
 * 화면정의서 마크다운(GFM 테이블/리스트/코드/굵게)을 렌더한다. 호스트 react-markdown+remark-gfm 스택과
 * 일치. 요소 렌더러는 인라인 스타일 + CSS 디자인 토큰(var(--…))을 쓴다 — 플러그인은 임의 Tailwind 클래스에
 * 의존할 수 없다(호스트 JIT이 자신이 쓰지 않는 클래스를 purge).
 */

const inlineCode: CSSProperties = {
  background: "var(--muted)",
  borderRadius: 4,
  padding: "1px 5px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.85em",
};
const link: CSSProperties = { color: "var(--primary)", textDecoration: "underline" };
const cell: CSSProperties = { border: "1px solid var(--border)", padding: "3px 8px", textAlign: "left" };

function normalizeCodeText(children: ReactNode): string {
  return Children.toArray(children).join("").replace(/\n$/, "");
}

function isMermaidElement(children: ReactNode): boolean {
  const items = Children.toArray(children);
  return items.length === 1 && isValidElement(items[0]) && items[0].type === MermaidDiagram;
}

const components: Components = {
  p: ({ children }) => <p style={{ margin: "0.25rem 0", lineHeight: 1.6 }}>{children}</p>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" style={link}>
      {children}
    </a>
  ),
  strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
  del: ({ children }) => <del style={{ opacity: 0.7 }}>{children}</del>,
  code: ({ children, className }) => {
    const t = normalizeCodeText(children);
    if (isMermaidLanguage(className)) return <MermaidDiagram chart={t} />;
    if (t.includes("\n")) {
      return (
        <code style={{ fontFamily: inlineCode.fontFamily, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {children}
        </code>
      );
    }
    return <code style={inlineCode}>{children}</code>;
  },
  pre: ({ children }) => isMermaidElement(children) ? (
    <>{children}</>
  ) : (
    <pre
      style={{
        background: "var(--muted)",
        borderRadius: 6,
        fontSize: "0.85em",
        lineHeight: 1.55,
        margin: "0.4rem 0",
        overflowX: "auto",
        overflowWrap: "anywhere",
        padding: "8px 10px",
        whiteSpace: "pre-wrap",
      }}
    >
      {children}
    </pre>
  ),
  ul: ({ children }) => <ul style={{ margin: "0.25rem 0", paddingLeft: "1.25rem", listStyleType: "disc" }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: "0.25rem 0", paddingLeft: "1.4rem", listStyleType: "decimal" }}>{children}</ol>,
  li: ({ children }) => <li style={{ margin: "0.1rem 0" }}>{children}</li>,
  h1: ({ children }) => <div style={{ fontWeight: 600, fontSize: "1.1em", margin: "0.6rem 0 0.3rem" }}>{children}</div>,
  h2: ({ children }) => <div style={{ fontWeight: 600, fontSize: "1em", margin: "0.5rem 0 0.25rem" }}>{children}</div>,
  h3: ({ children }) => <div style={{ fontWeight: 600, margin: "0.4rem 0 0.2rem" }}>{children}</div>,
  h4: ({ children }) => <div style={{ fontWeight: 600, margin: "0.3rem 0 0.2rem" }}>{children}</div>,
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: "3px solid var(--border)", paddingLeft: "0.6rem", color: "var(--muted-foreground)", margin: "0.3rem 0" }}>
      {children}
    </blockquote>
  ),
  hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.5rem 0" }} />,
  table: ({ children }) => (
    <div style={{ overflowX: "auto", margin: "0.4rem 0" }}>
      <table style={{ borderCollapse: "collapse", fontSize: "0.92em" }}>{children}</table>
    </div>
  ),
  th: ({ children }) => <th style={{ ...cell, fontWeight: 600, background: "var(--muted)" }}>{children}</th>,
  td: ({ children }) => <td style={cell}>{children}</td>,
};

export function Markdown({ text }: { text: string }) {
  return (
    <div style={{ wordBreak: "break-word" }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
