import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let nextMermaidId = 0;
let mermaidInitialized = false;

const monospaceFont = "ui-monospace, SFMono-Regular, Menlo, monospace";

function nextMermaidRenderId(): string {
  nextMermaidId += 1;
  return `builder-mermaid-${nextMermaidId}`;
}

function ensureMermaidInitialized() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "default",
  });
  mermaidInitialized = true;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isMermaidLanguage(className: string | undefined): boolean {
  return /\blanguage-mermaid\b/i.test(className ?? "");
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const idBaseRef = useRef<string | null>(null);
  if (!idBaseRef.current) idBaseRef.current = nextMermaidRenderId();
  const renderCountRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; svg: string }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let active = true;
    const renderId = `${idBaseRef.current}-${renderCountRef.current += 1}`;
    setState({ status: "loading" });

    void (async () => {
      try {
        ensureMermaidInitialized();
        const { svg, bindFunctions } = await mermaid.render(renderId, chart);
        if (!active) return;
        setState({ status: "ready", svg });
        window.requestAnimationFrame(() => {
          if (!active || !containerRef.current) return;
          bindFunctions?.(containerRef.current);
        });
      } catch (error) {
        if (!active) return;
        setState({ status: "error", message: errorMessage(error) });
      }
    })();

    return () => {
      active = false;
    };
  }, [chart]);

  if (state.status === "error") {
    return (
      <div style={{ border: "1px solid var(--destructive)", borderRadius: 6, margin: "0.5rem 0", overflow: "hidden" }}>
        <div style={{ borderBottom: "1px solid var(--destructive)", color: "var(--destructive)", fontSize: "0.8rem", padding: "6px 8px" }}>
          Mermaid render failed: {state.message}
        </div>
        <pre style={{ background: "var(--muted)", margin: 0, overflowX: "auto", padding: "8px 10px", whiteSpace: "pre-wrap" }}>
          <code style={{ fontFamily: monospaceFont }}>{chart}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        background: "var(--background)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        margin: "0.5rem 0",
        minHeight: state.status === "loading" ? 72 : undefined,
        overflowX: "auto",
        padding: "10px",
      }}
    >
      {state.status === "loading" ? (
        <div style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>Rendering diagram...</div>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: state.svg }} style={{ display: "inline-block", minWidth: "100%" }} />
      )}
    </div>
  );
}
