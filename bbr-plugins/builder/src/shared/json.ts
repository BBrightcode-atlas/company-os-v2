export function stripCodeFence(text: string): string {
  let t = text.trim();
  const closed = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  if (closed) return closed[1].trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  return t.trim();
}

export function repairTruncatedJson(input: string): string | null {
  let inStr = false;
  let esc = false;
  const stack: Array<"{" | "["> = [];
  let cutEnd = -1;
  let cutStack: Array<"{" | "["> | null = null;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === "\"") inStr = false;
      continue;
    }
    if (c === "\"") { inStr = true; continue; }
    if (c === "{" || c === "[") { stack.push(c); continue; }
    if (c === "}" || c === "]") {
      stack.pop();
      cutEnd = i;
      cutStack = [...stack];
      continue;
    }
    if (c === ",") {
      cutEnd = i - 1;
      cutStack = [...stack];
    }
  }
  if (cutEnd < 0 || !cutStack) return null;
  let out = input.slice(0, cutEnd + 1).replace(/[\s,]+$/, "");
  for (let k = cutStack.length - 1; k >= 0; k--) out += cutStack[k] === "{" ? "}" : "]";
  return out;
}

export function extractJsonObject(text: string): unknown {
  const cleaned = stripCodeFence(text);
  const start = cleaned.indexOf("{");
  if (start < 0) throw new Error("LLM response did not contain a JSON object");
  const end = cleaned.lastIndexOf("}");
  const candidate = end > start ? cleaned.slice(start, end + 1) : cleaned.slice(start);
  try {
    return JSON.parse(candidate);
  } catch (parseError) {
    const repaired = repairTruncatedJson(candidate);
    if (repaired) {
      try { return JSON.parse(repaired); } catch {}
    }
    throw parseError instanceof Error ? parseError : new Error(String(parseError));
  }
}
