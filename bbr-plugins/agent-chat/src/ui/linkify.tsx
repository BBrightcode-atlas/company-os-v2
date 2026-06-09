import { Fragment } from "react";
import { useHostNavigation } from "@paperclipai/plugin-sdk/ui";

// e.g. FLO-19, BBR-3 — link issue identifiers to the host issue route.
const ISSUE_RE = /\b([A-Z]{2,6}-\d+)\b/g;

export function Linkified({ text }: { text: string }) {
  const nav = useHostNavigation();
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  ISSUE_RE.lastIndex = 0;
  while ((m = ISSUE_RE.exec(text)) !== null) {
    if (m.index > last) out.push(<Fragment key={last}>{text.slice(last, m.index)}</Fragment>);
    const id = m[1];
    out.push(
      <a key={m.index} {...nav.linkProps(`issues/${id}`)} style={{ color: "var(--primary)", textDecoration: "underline" }}>
        {id}
      </a>,
    );
    last = m.index + id.length;
  }
  if (last < text.length) out.push(<Fragment key={last}>{text.slice(last)}</Fragment>);
  return <>{out}</>;
}
