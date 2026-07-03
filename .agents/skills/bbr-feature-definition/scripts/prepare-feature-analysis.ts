import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";

type CliArgs = {
  projectName?: string;
  runDir?: string;
  sourceMaterial?: string;
  outDir?: string;
  help?: boolean;
};

type LatestRun = {
  projectName?: string;
  runDir?: string;
  sourceMaterial?: string;
};

type Heading = {
  line: number;
  level: number;
  title: string;
  path: string[];
};

type Chunk = {
  id: string;
  heading: string;
  headingPath: string[];
  level: number;
  lineStart: number;
  lineEnd: number;
  charCount: number;
  candidateTags: string[];
  areaHints: string[];
  text: string;
};

type FeatureScope = {
  projectName?: string;
  availableAreas?: string[];
  selectedAreas?: string[];
  extraContext?: string;
  configuredAt?: string;
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";
const ALLOWED_AREAS = ["admin", "site", "server", "app", "ai-runtime"] as const;

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-feature-definition/scripts/prepare-feature-analysis.ts --project-name aiga",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-feature-definition/scripts/prepare-feature-analysis.ts --source-material ./generated/source-intake/aiga/runs/<run>/source-material.md",
    "",
    "Options:",
    "  --project-name <name>       Project name under generated/source-intake",
    "  --run-dir <path>            Source intake run directory",
    "  --source-material <path>    Explicit source-material.md",
    "  --out-dir <path>            Defaults to <run-dir>/feature-definition-work",
    "  --help                      Print this help",
  ].join("\n");
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case "--project-name":
        if (!next) throw new Error("--project-name requires a value");
        args.projectName = next;
        index += 1;
        break;
      case "--run-dir":
        if (!next) throw new Error("--run-dir requires a path");
        args.runDir = next;
        index += 1;
        break;
      case "--source-material":
        if (!next) throw new Error("--source-material requires a path");
        args.sourceMaterial = next;
        index += 1;
        break;
      case "--out-dir":
        if (!next) throw new Error("--out-dir requires a path");
        args.outDir = next;
        index += 1;
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function safeSlug(value: string): string {
  const normalized = value
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || "project";
}

function resolveProjectPath(projectName: string, value: string): string {
  const normalized = value.replace(/\\/g, "/");
  const marker = `${DEFAULT_SOURCE_ROOT}/${safeSlug(projectName)}/`;
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex >= 0) return resolve(normalized.slice(markerIndex));
  return resolve(value);
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function readJsonIfExists<T>(path: string): Promise<T | null> {
  try {
    return await readJson<T>(path);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function resolveInput(args: CliArgs): Promise<{
  projectName: string;
  runDir: string;
  sourceMaterial: string;
  outDir: string;
}> {
  if (args.sourceMaterial) {
    const sourceMaterial = resolve(args.sourceMaterial);
    const runDir = args.runDir ? resolve(args.runDir) : dirname(sourceMaterial);
    const projectName = args.projectName ?? (basename(dirname(dirname(runDir))) || "project");
    return {
      projectName,
      runDir,
      sourceMaterial,
      outDir: resolve(args.outDir ?? join(runDir, "feature-definition-work")),
    };
  }

  if (args.runDir) {
    const runDir = resolve(args.runDir);
    return {
      projectName: args.projectName ?? (basename(dirname(dirname(runDir))) || "project"),
      runDir,
      sourceMaterial: join(runDir, "source-material.md"),
      outDir: resolve(args.outDir ?? join(runDir, "feature-definition-work")),
    };
  }

  if (!args.projectName) throw new Error("--project-name, --run-dir, or --source-material is required");
  const projectName = args.projectName;
  const latestPath = resolve(DEFAULT_SOURCE_ROOT, safeSlug(projectName), "latest-run.json");
  const latest = await readJson<LatestRun>(latestPath);
  const runDir = latest.runDir
    ? resolveProjectPath(projectName, latest.runDir)
    : latest.sourceMaterial
      ? dirname(resolveProjectPath(projectName, latest.sourceMaterial))
      : "";
  if (!runDir) throw new Error(`latest-run.json does not include runDir: ${latestPath}`);
  const sourceMaterial = latest.sourceMaterial
    ? resolveProjectPath(projectName, latest.sourceMaterial)
    : join(runDir, "source-material.md");
  return {
    projectName: latest.projectName ?? projectName,
    runDir,
    sourceMaterial,
    outDir: resolve(args.outDir ?? join(runDir, "feature-definition-work")),
  };
}

function headingFromLine(line: string): { level: number; title: string } | null {
  const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
  if (!match) return null;
  return { level: match[1].length, title: match[2].trim() };
}

function sourceBodyStartLine(lines: string[]): number {
  const bodyIndex = lines.findIndex((line) => /^##\s+본문\(Body\)\s*$/.test(line));
  return bodyIndex >= 0 ? bodyIndex + 2 : 1;
}

function collectHeadings(lines: string[]): Heading[] {
  const start = sourceBodyStartLine(lines);
  const headings: Heading[] = [];
  const stack: Heading[] = [];
  for (let index = start - 1; index < lines.length; index += 1) {
    const parsed = headingFromLine(lines[index]);
    if (!parsed) continue;
    while (stack.length > 0 && stack[stack.length - 1].level >= parsed.level) stack.pop();
    const heading: Heading = {
      line: index + 1,
      level: parsed.level,
      title: parsed.title,
      path: [...stack.map((item) => item.title), parsed.title],
    };
    stack.push(heading);
    headings.push(heading);
  }
  return headings;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function candidateTags(text: string): string[] {
  const checks: Array<[string, RegExp]> = [
    ["auth-membership", /회원|비회원|로그인|회원가입|SNS|세션|탈퇴|닉네임/],
    ["doctor-verification", /의사\s*인증|면허|전문가\s*뱃지|의사\s*뱃지/],
    ["community-post", /커뮤니티|게시글|피드|글쓰기|댓글|대댓글|공감|카테고리|질환/],
    ["review", /리뷰|후기|별점|평점|의사\s*프로필/],
    ["visit-verification", /병원\s*방문|진료\s*인증|영수증|OCR|인증\s*뱃지/],
    ["moderation-reporting", /신고|블라인드|관리자\s*처리|운영\s*정책|soft delete|삭제/],
    ["search", /검색|통합검색|필터|정렬|페이지네이션/],
    ["mypage-support", /마이페이지|내\s*활동|고객지원|공지사항|이용약관|개인정보처리방침/],
    ["ui-feedback", /모달|팝업|토스트|LoginRequiredToast|GuestLimitModal|FAB|버튼/],
    ["common-system", /API|오류|상태|동시성|정합성|DB|데이터|정책/],
    ["analytics-privacy-accessibility", /분석\s*이벤트|개인정보|접근성|로그/],
  ];
  return checks.filter(([, regex]) => regex.test(text)).map(([tag]) => tag);
}

function areaHints(text: string): string[] {
  const hints: string[] = [];
  if (/관리자|어드민|운영|설정|신고\s*처리|기간\s*설정|원본\s*열람/.test(text)) hints.push("admin");
  if (/API|서버|DB|권한|정책|인증|OCR|영수증|한도|평점|soft delete|동시성|정합성/.test(text)) hints.push("server");
  if (/화면|모달|팝업|토스트|탭|카드|버튼|FAB|마이페이지|커뮤니티|프로필|리뷰\s*작성/.test(text)) hints.push("app");
  if (/랜딩|SEO|공개\s*웹|사이트|정적\s*페이지/.test(text)) hints.push("site");
  if (/AI|LLM|추천|분류|요약|비전|OCR\s*모델/.test(text)) hints.push("ai-runtime");
  return unique(hints);
}

function buildChunks(lines: string[], headings: Heading[]): Chunk[] {
  return headings.map((heading, index) => {
    const next = headings[index + 1];
    const lineStart = heading.line;
    const lineEnd = next ? next.line - 1 : lines.length;
    const text = lines.slice(lineStart - 1, lineEnd).join("\n").trim();
    return {
      id: `CH-${String(index + 1).padStart(3, "0")}`,
      heading: heading.title,
      headingPath: heading.path,
      level: heading.level,
      lineStart,
      lineEnd,
      charCount: text.length,
      candidateTags: candidateTags(text),
      areaHints: areaHints(text),
      text,
    };
  }).filter((chunk) => chunk.text.length > 0);
}

function renderOutline(projectName: string, sourceMaterial: string, chunks: Chunk[]): string {
  return [
    `# Feature Analysis Source Outline - ${projectName}`,
    "",
    `Source material: ${sourceMaterial}`,
    "",
    "| Chunk | Lines | Level | Heading Path | Candidate Tags | Area Hints |",
    "| --- | --- | --- | --- | --- | --- |",
    ...chunks.map((chunk) => (
      `| ${chunk.id} | ${chunk.lineStart}-${chunk.lineEnd} | H${chunk.level} | ${chunk.headingPath.join(" > ").replace(/\|/g, "\\|")} | ${chunk.candidateTags.join(", ") || "-"} | ${chunk.areaHints.join(", ") || "-"} |`
    )),
  ].join("\n") + "\n";
}

function renderWorkflow(projectName: string, selectedAreas: readonly string[], extraContext: string): string {
  return [
    `# Feature Definition Workflow - ${projectName}`,
    "",
    "## Selected Scope",
    "",
    `- Selected areas: ${selectedAreas.join(", ")}`,
    `- Extra context: ${extraContext || "(none)"}`,
    "",
    "1. Read `feature-analysis-input.json` completely.",
    "2. Build atomic requirements for every chunk. Do not skip chunks just because a heading looks repetitive.",
    "3. Merge scattered requirements into feature groups when they describe the same capability, policy object, UI interaction, data object, or state transition.",
    `4. For each feature group, write one or more table rows using only the selected areas in the \`영역\` column: ${selectedAreas.join(", ")}.`,
    "5. Leave `메모` empty because the user writes it.",
    "6. Compare every feature group against `product-builder-base` and classify reuse as `complete-reuse`, `partial-reuse`, `reuse-with-customization`, `new-implementation`, or `not-applicable`.",
    "7. Under every feature section, add exactly one `product-builder-base 재사용 판단` table with columns: `재사용 유형 | 기준 surface | base 참조 | hard-copy 범위 | 커스터마이징 범위 | 메모`.",
    "8. Add the same reuse decision to each `feature-coverage.json.features[]` entry as a structured `reuse` object.",
    "9. Write the first draft `feature-definition.md` and `feature-coverage.json` in the run directory.",
    "10. Run `validate-feature-definition.ts --project-name " + projectName + "` and `review-feature-definition.ts --project-name " + projectName + "`.",
    "11. Perform agent semantic self-review against feature-definition, feature coverage, and referenced source chunks.",
    "12. Patch `feature-definition.md` and `feature-coverage.json` for every validation, scripted review, and semantic self-review finding that is not intentionally accepted.",
    "13. Append the iteration summary to `feature-definition-loop.md`.",
    "14. Rerun validation and review after the patch.",
    "15. Stop only when the current on-disk feature-definition/coverage files are the post-review revised artifacts and validation/review have no unresolved findings.",
    "",
    "Feature grouping rule:",
    "",
    "- Policy doc + screen doc + common component doc can all be the same feature.",
    "- Example: 비회원 제한 정책, LoginRequiredToast, GuestLimitModal, and daily read limit should be evaluated together before deciding feature boundaries.",
    "- Do not produce duplicate features just because content appears under multiple source pages.",
    "",
    "Reuse analysis rule:",
    "",
    "- Prefer codebase-memory MCP architecture/search tools for `product-builder-base` discovery when available.",
    "- Fallback to local file search only when graph tools are unavailable or insufficient.",
    "- Do not force reuse. If only generic primitives exist, classify the domain feature as `new-implementation` and explain the reason in coverage JSON.",
  ].join("\n") + "\n";
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const input = await resolveInput(args);
  const scopePath = join(input.runDir, "feature-definition-scope.json");
  const scope = await readJsonIfExists<FeatureScope>(scopePath);
  const selectedAreas = scope?.selectedAreas?.length ? scope.selectedAreas : [...ALLOWED_AREAS];
  const extraContext = scope?.extraContext ?? "";
  const content = await readFile(input.sourceMaterial, "utf8");
  const lines = content.split(/\r?\n/);
  const headings = collectHeadings(lines);
  const chunks = buildChunks(lines, headings);
  await mkdir(input.outDir, { recursive: true });

  const payload = {
    projectName: input.projectName,
    runDir: input.runDir,
    sourceMaterial: input.sourceMaterial,
    availableAreas: ALLOWED_AREAS,
    selectedAreas,
    extraContext,
    scope: scope ? scopePath : null,
    outputFiles: {
      featureDefinition: join(input.runDir, "feature-definition.md"),
      featureCoverage: join(input.runDir, "feature-coverage.json"),
    },
    requiredColumns: ["영역", "기능명", "상세 설명", "메모"],
    rules: [
      "메모 column must be empty.",
      "Merge scattered requirements that belong to the same feature.",
      `Use only selected areas in the 영역 column: ${selectedAreas.join(", ")}.`,
      extraContext ? `Apply extra context from scope: ${extraContext}` : "No extra context was provided in scope.",
      "Every feature must cite sourceChunks in feature-coverage.json.",
      "Every feature must include a product-builder-base reuse decision in Markdown and feature-coverage.json.",
      "Every important source chunk must be mapped or explicitly listed in unmappedChunks with reason.",
      "The final feature deliverables must already include review-driven fixes; do not leave fixes only in feature-definition-review.md.",
    ],
    chunks,
  };

  const analysisPath = join(input.outDir, "feature-analysis-input.json");
  const outlinePath = join(input.outDir, "source-outline.md");
  const workflowPath = join(input.outDir, "feature-workflow.md");
  await writeFile(analysisPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  await writeFile(outlinePath, renderOutline(input.projectName, input.sourceMaterial, chunks), "utf8");
  await writeFile(workflowPath, renderWorkflow(input.projectName, selectedAreas, extraContext), "utf8");

  console.log(JSON.stringify({
    ok: true,
    projectName: input.projectName,
    runDir: input.runDir,
    outDir: input.outDir,
    sourceMaterial: input.sourceMaterial,
    chunkCount: chunks.length,
    analysisInput: analysisPath,
    sourceOutline: outlinePath,
    workflow: workflowPath,
    scope: scope ? scopePath : null,
    selectedAreas,
    extraContext,
    featureDefinition: join(input.runDir, "feature-definition.md"),
    featureCoverage: join(input.runDir, "feature-coverage.json"),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
