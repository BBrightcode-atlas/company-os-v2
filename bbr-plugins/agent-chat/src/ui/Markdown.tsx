import type { CSSProperties } from "react";
import { useHostNavigation } from "@paperclipai/plugin-sdk/ui";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Render agent/message bodies as GFM markdown (tables, lists, code, bold, links) — matching the
 * host's react-markdown + remark-gfm stack. Element renderers use inline styles + CSS design
 * tokens (var(--…)) because the plugin can't rely on arbitrary Tailwind classes (host JIT purges
 * any class it doesn't itself use). A tiny remark plugin keeps FLO-19-style issue auto-linking.
 */

// remark plugin: turn bare "FLO-19" text into issue: links (skipping code + existing links).
function remarkIssueRefs() {
  const RE = /\b[A-Z]{2,6}-\d+\b/g;
  function walk(node: any, inLink: boolean): void {
    if (!node || !Array.isArray(node.children)) return;
    const out: any[] = [];
    for (const child of node.children) {
      if (child.type === "text" && !inLink && RE.test(child.value)) {
        const val: string = child.value;
        let last = 0;
        let m: RegExpExecArray | null;
        RE.lastIndex = 0;
        while ((m = RE.exec(val)) !== null) {
          if (m.index > last) out.push({ type: "text", value: val.slice(last, m.index) });
          out.push({ type: "link", url: `issue:${m[0]}`, children: [{ type: "text", value: m[0] }] });
          last = m.index + m[0].length;
        }
        if (last < val.length) out.push({ type: "text", value: val.slice(last) });
      } else {
        if (child.type !== "code" && child.type !== "inlineCode") {
          walk(child, inLink || child.type === "link" || child.type === "linkReference");
        }
        out.push(child);
      }
    }
    node.children = out;
  }
  return (tree: any) => walk(tree, false);
}

const inlineCode: CSSProperties = {
  background: "var(--muted)",
  borderRadius: 4,
  padding: "1px 5px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.85em",
};
const link: CSSProperties = { color: "var(--primary)", textDecoration: "underline" };
const cell: CSSProperties = { border: "1px solid var(--border)", padding: "3px 8px", textAlign: "left" };

export function Markdown({ text }: { text: string }) {
  const nav = useHostNavigation();
  const components: Components = {
    p: ({ children }) => <p style={{ margin: "0.25rem 0", lineHeight: 1.6 }}>{children}</p>,
    a: ({ href, children }) => {
      if (href && href.startsWith("issue:")) {
        return (
          <a {...nav.linkProps(`issues/${href.slice(6)}`)} style={link}>
            {children}
          </a>
        );
      }
      return (
        <a href={href} target="_blank" rel="noreferrer" style={link}>
          {children}
        </a>
      );
    },
    strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
    em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
    del: ({ children }) => <del style={{ opacity: 0.7 }}>{children}</del>,
    code: ({ children }) => {
      const t = String(children ?? "");
      if (t.includes("\n")) return <code style={{ fontFamily: inlineCode.fontFamily, whiteSpace: "pre" }}>{children}</code>;
      return <code style={inlineCode}>{children}</code>;
    },
    pre: ({ children }) => (
      <pre
        style={{
          background: "var(--muted)",
          borderRadius: 6,
          padding: "8px 10px",
          overflowX: "auto",
          fontSize: "0.85em",
          margin: "0.4rem 0",
        }}
      >
        {children}
      </pre>
    ),
    ul: ({ children }) => <ul style={{ margin: "0.25rem 0", paddingLeft: "1.25rem", listStyleType: "disc" }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ margin: "0.25rem 0", paddingLeft: "1.4rem", listStyleType: "decimal" }}>{children}</ol>,
    li: ({ children }) => <li style={{ margin: "0.1rem 0" }}>{children}</li>,
    h1: ({ children }) => <div style={{ fontWeight: 600, fontSize: "1.05em", margin: "0.5rem 0 0.25rem" }}>{children}</div>,
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
    img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt} style={{ maxWidth: "100%", borderRadius: 6 }} />,
  };
  return (
    <div style={{ wordBreak: "break-word" }}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkIssueRefs]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
