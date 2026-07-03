import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import process from "node:process";

type CliArgs = {
  projectName?: string;
  runDir?: string;
  outDir?: string;
  baseRepoPath?: string;
  workflow?: WorkflowKind;
  figmaUrls?: string[];
  figmaLinksFile?: string;
  figmaRequired?: boolean;
  figmaAccessMode?: string;
  help?: boolean;
};

type LatestRun = {
  runDir?: string;
};

type FeatureCoverage = {
  projectName: string;
  selectedAreas?: string[];
  extraContext?: string;
  features: Array<{
    featureId: string;
    featureName: string;
    sourceChunks?: string[];
    areas: string[];
    reuse?: {
      type?: string;
      baseReferences?: string[];
    };
  }>;
};

type SchemaCoverage = {
  schemas?: Array<{
    code?: string;
    name?: string;
    tableName?: string;
    sourceFeatureIds?: string[];
  }>;
};

type ApiCoverage = {
  apis?: Array<{
    code?: string;
    method?: string;
    path?: string;
    summary?: string;
    sourceFeatureCodes?: string[];
    schemaCodes?: string[];
  }>;
};

type FeatureScope = {
  selectedAreas?: string[];
  extraContext?: string;
};

type SourceChunk = {
  id: string;
  heading: string;
  headingPath: string[];
  lineStart: number;
  lineEnd: number;
  charCount: number;
  screenHints: string[];
  surfaceHints: string[];
  text: string;
};

type FigmaScreenNode = {
  title: string;
  url: string;
  fileKey: string;
  nodeId: string;
  nodeIdApi: string;
  source: "figma-url" | "figma-links-file";
  order: number;
};

type WorkflowKind = "feature-implementation" | "figma-baseline";

type ArtifactConfig = {
  workflow: WorkflowKind;
  label: string;
  workDir: string;
  aggregateDocument: string;
  screenDir: string;
  screenIndex: string;
  screenCoverage: string;
  validation: string;
  reviewJson: string;
  reviewMarkdown: string;
  loop: string;
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";
const DEFAULT_PRODUCT_BUILDER_BASE = "../product-builder-base";
const SCREEN_TEMPLATE = ".agents/skills/bbr-screen-definition/templates/deliverables/screen-definition.md";
const SCREEN_RULES = ".agents/skills/bbr-screen-definition/templates/standards/screen-definition-writing-rules.md";
const FIGMA_SCREEN_TEMPLATE = ".agents/skills/bbr-screen-definition/templates/deliverables/figma-screen-definition.md";
const FIGMA_SCREEN_RULES = ".agents/skills/bbr-screen-definition/templates/standards/figma-screen-definition-writing-rules.md";
const TARGET_SURFACES = ["admin", "site", "app", "landing"] as const;
const MAX_SURFACE_FILES = 120;

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-screen-definition/scripts/prepare-screen-analysis.ts --project-name aiga",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-screen-definition/scripts/prepare-screen-analysis.ts --run-dir ./generated/source-intake/aiga/runs/<run>",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-screen-definition/scripts/prepare-screen-analysis.ts --workflow figma-baseline --project-name aiga --figma-links-file ./generated/source-intake/aiga/figma-screens.md",
    "  PRODUCT_BUILDER_BASE=../product-builder-base node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-screen-definition/scripts/prepare-screen-analysis.ts --project-name aiga",
  ].join("\n");
}

function parseWorkflowKind(value: string | undefined): WorkflowKind {
  if (!value || value === "feature-implementation") return "feature-implementation";
  if (value === "figma-baseline") return "figma-baseline";
  throw new Error(`Unknown --workflow value: ${value}. Expected feature-implementation or figma-baseline.`);
}

function artifactConfig(workflow: WorkflowKind): ArtifactConfig {
  if (workflow === "figma-baseline") {
    return {
      workflow,
      label: "Figma Screen Definition Baseline",
      workDir: "figma-screen-definition-work",
      aggregateDocument: "figma-screen-definition.md",
      screenDir: "figma-screen-definitions",
      screenIndex: "figma-screen-definition-index.md",
      screenCoverage: "figma-screen-coverage.json",
      validation: "figma-screen-definition.validation.json",
      reviewJson: "figma-screen-definition.review.json",
      reviewMarkdown: "figma-screen-definition-review.md",
      loop: "figma-screen-definition-loop.md",
    };
  }
  return {
    workflow,
    label: "Feature Implementation Screen Definition",
    workDir: "screen-definition-work",
    aggregateDocument: "screen-definition.md",
    screenDir: "screen-definitions",
    screenIndex: "screen-definition-index.md",
    screenCoverage: "screen-coverage.json",
    validation: "screen-definition.validation.json",
    reviewJson: "screen-definition.review.json",
    reviewMarkdown: "screen-definition-review.md",
    loop: "screen-definition-loop.md",
  };
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
      case "--out-dir":
        if (!next) throw new Error("--out-dir requires a path");
        args.outDir = next;
        index += 1;
        break;
      case "--base-repo-path":
        if (!next) throw new Error("--base-repo-path requires a path");
        args.baseRepoPath = next;
        index += 1;
        break;
      case "--workflow":
        if (!next) throw new Error("--workflow requires a value");
        args.workflow = parseWorkflowKind(next);
        index += 1;
        break;
      case "--figma-url":
        if (!next) throw new Error("--figma-url requires a URL");
        args.figmaUrls = [...(args.figmaUrls ?? []), next];
        index += 1;
        break;
      case "--figma-links-file":
        if (!next) throw new Error("--figma-links-file requires a path");
        args.figmaLinksFile = next;
        index += 1;
        break;
      case "--figma-access-mode":
        if (!next) throw new Error("--figma-access-mode requires a value");
        args.figmaAccessMode = next;
        index += 1;
        break;
      case "--figma-optional":
        args.figmaRequired = false;
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

function parseFigmaUrl(url: string, title: string, source: FigmaScreenNode["source"], order: number): FigmaScreenNode {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid Figma URL: ${url}`);
  }

  const fileMatch = /\/(?:design|file)\/([^/]+)/.exec(parsed.pathname);
  const nodeId = parsed.searchParams.get("node-id") ?? "";
  if (!fileMatch?.[1]) throw new Error(`Figma URL is missing file key: ${url}`);
  if (!nodeId) throw new Error(`Figma URL is missing node-id: ${url}`);

  return {
    title: title.trim() || `Figma node ${nodeId}`,
    url,
    fileKey: fileMatch[1],
    nodeId,
    nodeIdApi: nodeId.replace(/-/g, ":"),
    source,
    order,
  };
}

function parseFigmaLinksMarkdown(markdown: string): FigmaScreenNode[] {
  const nodes: FigmaScreenNode[] = [];
  const markdownLink = /\[([^\]]+)\]\((https:\/\/www\.figma\.com\/[^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = markdownLink.exec(markdown)) !== null) {
    nodes.push(parseFigmaUrl(match[2], match[1], "figma-links-file", nodes.length + 1));
  }
  return nodes;
}

function dedupeFigmaNodes(nodes: FigmaScreenNode[]): FigmaScreenNode[] {
  const seen = new Set<string>();
  const deduped: FigmaScreenNode[] = [];
  for (const node of nodes) {
    const key = `${node.fileKey}:${node.nodeId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ ...node, order: deduped.length + 1 });
  }
  return deduped;
}

async function collectFigmaNodes(args: CliArgs): Promise<FigmaScreenNode[]> {
  const nodes: FigmaScreenNode[] = [];
  if (args.figmaLinksFile) {
    const markdown = await readFile(resolve(args.figmaLinksFile), "utf8");
    nodes.push(...parseFigmaLinksMarkdown(markdown));
  }
  for (const [index, url] of (args.figmaUrls ?? []).entries()) {
    nodes.push(parseFigmaUrl(url, `Figma node ${index + 1}`, "figma-url", nodes.length + 1));
  }
  return dedupeFigmaNodes(nodes);
}

function safeSlug(value: string): string {
  const normalized = value
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || "project";
}

function resolveBaseRepoPath(args: CliArgs): { inputPath: string; absolutePath: string } {
  const inputPath = args.baseRepoPath ?? process.env.PRODUCT_BUILDER_BASE ?? DEFAULT_PRODUCT_BUILDER_BASE;
  return { inputPath, absolutePath: resolve(inputPath) };
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

async function resolveRun(args: CliArgs): Promise<{ projectName: string; runDir: string; outDir: string; artifact: ArtifactConfig }> {
  const workflow = parseWorkflowKind(args.workflow);
  const artifact = artifactConfig(workflow);
  if (args.runDir) {
    const runDir = resolve(args.runDir);
    return {
      projectName: args.projectName ?? (basename(dirname(dirname(runDir))) || "project"),
      runDir,
      outDir: resolve(args.outDir ?? join(runDir, artifact.workDir)),
      artifact,
    };
  }
  if (!args.projectName) throw new Error("--project-name or --run-dir is required");
  const latestPath = resolve(DEFAULT_SOURCE_ROOT, safeSlug(args.projectName), "latest-run.json");
  const latest = await readJson<LatestRun>(latestPath);
  if (!latest.runDir) throw new Error(`latest-run.json does not include runDir: ${latestPath}`);
  const runDir = resolveProjectPath(args.projectName, latest.runDir);
  return {
    projectName: args.projectName,
    runDir,
    outDir: resolve(args.outDir ?? join(runDir, artifact.workDir)),
    artifact,
  };
}

function sourceBodyStartLine(lines: string[]): number {
  const bodyIndex = lines.findIndex((line) => /^##\s+본문\(Body\)\s*$/.test(line));
  return bodyIndex >= 0 ? bodyIndex + 2 : 1;
}

function headingFromLine(line: string): { level: number; title: string } | null {
  const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
  if (!match) return null;
  return { level: match[1].length, title: match[2].trim() };
}

function screenHints(text: string): string[] {
  const checks: Array<[string, RegExp]> = [
    ["screen-definition", /화면정의서|Screen Definition/i],
    ["home", /홈|Home|큐레이션/],
    ["my-page", /마이페이지|MY\s*탭|내\s*활동|저장한\s*의료진/],
    ["community", /커뮤니티|게시글|댓글|공감|신고/],
    ["doctor", /명의|의사\s*프로필|의료진|후기|리뷰/],
    ["auth", /로그인|회원가입|SNS|2FA|OTP|세션|권한/],
    ["admin", /어드민|관리자|운영자|검수|처리\s*큐|정책\s*설정/],
    ["search", /검색|통합검색|필터|정렬/],
    ["support", /공지|고객지원|의견|약관|개인정보/],
    ["modal", /모달|팝업|토스트|Toast|Modal|drawer|Drawer/],
  ];
  return checks.filter(([, regex]) => regex.test(text)).map(([tag]) => tag);
}

function surfaceHints(text: string): string[] {
  const hints: string[] = [];
  if (/어드민|관리자|운영자|검수|관리\s*화면|정책\s*설정/.test(text)) hints.push("admin");
  if (/사이트|공개\s*웹|SEO|랜딩|홈|명의|커뮤니티|공지/.test(text)) hints.push("site");
  if (/앱|MY\s*탭|하단\s*탭|마이페이지|모바일/.test(text)) hints.push("app");
  if (/랜딩|마케팅|전환|hero/i.test(text)) hints.push("landing");
  return [...new Set(hints)];
}

function collectScreenChunks(sourceMaterial: string): SourceChunk[] {
  const lines = sourceMaterial.split(/\r?\n/);
  const start = sourceBodyStartLine(lines);
  const headings: Array<{ line: number; level: number; title: string; path: string[] }> = [];
  const stack: Array<{ line: number; level: number; title: string; path: string[] }> = [];
  for (let index = start - 1; index < lines.length; index += 1) {
    const parsed = headingFromLine(lines[index]);
    if (!parsed) continue;
    while (stack.length > 0 && stack[stack.length - 1].level >= parsed.level) stack.pop();
    const heading = {
      line: index + 1,
      level: parsed.level,
      title: parsed.title,
      path: [...stack.map((item) => item.title), parsed.title],
    };
    stack.push(heading);
    headings.push(heading);
  }

  return headings.map((heading, index) => {
    const next = headings[index + 1];
    const lineStart = heading.line;
    const lineEnd = next ? next.line - 1 : lines.length;
    const text = lines.slice(lineStart - 1, lineEnd).join("\n").trim();
    const hints = screenHints(`${heading.title}\n${text}`);
    return {
      id: `CH-${String(index + 1).padStart(3, "0")}`,
      heading: heading.title,
      headingPath: heading.path,
      lineStart,
      lineEnd,
      charCount: text.length,
      screenHints: hints,
      surfaceHints: surfaceHints(`${heading.title}\n${text}`),
      text,
    };
  }).filter((chunk) => chunk.text.length > 0 && (chunk.screenHints.length > 0 || chunk.surfaceHints.length > 0));
}

async function walkCandidateFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkCandidateFiles(fullPath));
    } else if (entry.isFile() && /\.(tsx?|md)$/.test(entry.name) && !/\.spec\.ts$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function baseSurfaceFiles(baseRepoPath: string): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};
  for (const surface of TARGET_SURFACES) {
    const root = join(baseRepoPath, "apps", surface);
    const files = await walkCandidateFiles(root);
    result[surface] = files.slice(0, MAX_SURFACE_FILES).map((file) => relative(baseRepoPath, file)).sort();
  }
  return result;
}

function renderWorkflow(input: {
  projectName: string;
  artifact: ArtifactConfig;
  selectedAreas: string[];
  uiSurfaces: string[];
  featureCount: number;
  schemaCount: number;
  apiCount: number;
  screenChunkCount: number;
  figmaNodeCount: number;
  figmaRequired: boolean;
  figmaFileKeys: string[];
}): string {
  const isFigmaBaseline = input.artifact.workflow === "figma-baseline";
  const templatePath = isFigmaBaseline ? FIGMA_SCREEN_TEMPLATE : SCREEN_TEMPLATE;
  const rulesPath = isFigmaBaseline ? FIGMA_SCREEN_RULES : SCREEN_RULES;
  return [
    `# ${input.artifact.label} Workflow - ${input.projectName}`,
    "",
    `- workflow: ${input.artifact.workflow}`,
    `- aggregate artifact: \`${input.artifact.aggregateDocument}\``,
    `- coverage artifact: \`${input.artifact.screenCoverage}\``,
    "",
    "## Inputs",
    "",
    "- `feature-definition.md`",
    "- `feature-coverage.json`",
    "- `schema-definition.md`",
    "- `schema-coverage.json`",
    "- `api-definition.openapi.yaml`",
    "- `api-coverage.json`",
    "- `source-material.md`",
    `- Codex workflow template: \`${templatePath}\``,
    `- Codex workflow writing rules: \`${rulesPath}\``,
    "",
    "## Selected Scope",
    "",
    `- selected feature areas: ${input.selectedAreas.join(", ") || "(none)"}`,
    `- screen target surfaces: ${input.uiSurfaces.join(", ") || "(none)"}`,
    `- feature groups: ${input.featureCount}`,
    `- schema count: ${input.schemaCount}`,
    `- API count: ${input.apiCount}`,
    `- source chunks with screen hints: ${input.screenChunkCount}`,
    `- Figma baseline: ${input.figmaNodeCount > 0 ? `${input.figmaNodeCount} node(s), file key(s): ${input.figmaFileKeys.join(", ")}` : "(not supplied)"}`,
    `- Figma required: ${input.figmaRequired ? "yes" : "no"}`,
    "",
    isFigmaBaseline ? "## Figma Implementation Baseline" : "## Workflow Separation",
    "",
    isFigmaBaseline
      ? [
        "- Treat the supplied Figma nodes as the visual/layout source of truth for screen definitions.",
        `- Every screen derived from Figma must keep the Figma URL, file key, node id, frame name/title, and implementation notes in its screen document and \`${input.artifact.screenCoverage}\`.`,
        "- Capture exact layout, spacing, typography, color, component, asset, responsive, and state details only when they are visible in Figma or supplied export data.",
        "- If the agent cannot inspect Figma directly, do not guess visual values. Mark the screen with an explicit Figma access/export gap and ask for screenshots/export/API access before final implementation-level detail.",
        "- This workflow is not the feature-centered implementation workflow. Use `feature-implementation` separately when converting feature groups into development tasks and implementation screens.",
      ].join("\n")
      : "- This is the feature-centered implementation screen workflow. Do not treat Figma as the governing visual source here; use `figma-baseline` for Figma-first extraction.",
    "",
    "## Steps",
    "",
    "1. Read `screen-analysis-input.json` completely.",
    "2. Build a screen inventory from source screen sections, feature rows, API routes, and user/admin task flows.",
    "3. Merge duplicate screen candidates by route, tab, modal lifecycle, or admin queue purpose.",
    "4. Exclude pure server behavior from screens unless there is an admin/site/app/landing UI consuming it.",
    "5. Assign stable screen codes using `{SURFACE}-SCR-###`.",
    "6. Write one detailed document per screen using the Codex screen-definition template.",
    `7. Write \`${input.artifact.screenDir}/${input.artifact.screenIndex}\` grouped by target surface.`,
    `8. Write \`${input.artifact.aggregateDocument}\` as an aggregate review document.`,
    isFigmaBaseline
      ? `9. Write \`${input.artifact.screenCoverage}\` with screens, featureScreenMappings, apiScreenMappings, unmappedFeatures, figmaNodes, and unmappedFigmaNodes.`
      : `9. Write \`${input.artifact.screenCoverage}\` with screens, featureScreenMappings, apiScreenMappings, and unmappedFeatures.`,
    "10. Run validation and review scripts.",
    isFigmaBaseline
      ? "11. Perform agent semantic self-review against Figma nodes, feature/schema/API definitions, and source chunks."
      : "11. Perform agent semantic self-review against feature/schema/API definitions and source chunks.",
    "12. Patch screen docs, index, aggregate Markdown, and coverage JSON for every validation, scripted review, and semantic finding that is not intentionally accepted.",
    `13. Append the iteration summary to \`${input.artifact.loop}\`.`,
    "14. Rerun validation and review after the patch.",
    "15. Stop only when the current on-disk screen docs/coverage/index/aggregate files are the post-review revised artifacts and validation/review have no unresolved findings.",
  ].join("\n") + "\n";
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const run = await resolveRun(args);
  const baseRepo = resolveBaseRepoPath(args);
  const featureDefinitionPath = join(run.runDir, "feature-definition.md");
  const featureCoveragePath = join(run.runDir, "feature-coverage.json");
  const featureScopePath = join(run.runDir, "feature-definition-scope.json");
  const schemaDefinitionPath = join(run.runDir, "schema-definition.md");
  const schemaCoveragePath = join(run.runDir, "schema-coverage.json");
  const apiDefinitionPath = join(run.runDir, "api-definition.md");
  const apiCoveragePath = join(run.runDir, "api-coverage.json");
  const openapiPath = join(run.runDir, "api-definition.openapi.yaml");
  const sourceMaterialPath = join(run.runDir, "source-material.md");
  const isFigmaBaseline = run.artifact.workflow === "figma-baseline";
  const templatePath = isFigmaBaseline ? FIGMA_SCREEN_TEMPLATE : SCREEN_TEMPLATE;
  const writingRulesPath = isFigmaBaseline ? FIGMA_SCREEN_RULES : SCREEN_RULES;

  const [
    featureDefinition,
    featureCoverage,
    featureScope,
    schemaCoverage,
    apiCoverage,
    sourceMaterial,
    screenTemplate,
    writingRules,
    productBuilderBaseSurfaceFiles,
  ] = await Promise.all([
    readFile(featureDefinitionPath, "utf8"),
    readJson<FeatureCoverage>(featureCoveragePath),
    readJsonIfExists<FeatureScope>(featureScopePath),
    readJson<SchemaCoverage>(schemaCoveragePath),
    readJson<ApiCoverage>(apiCoveragePath),
    readFile(sourceMaterialPath, "utf8"),
    readFile(templatePath, "utf8"),
    readFile(writingRulesPath, "utf8"),
    baseSurfaceFiles(baseRepo.absolutePath),
  ]);

  const selectedAreas = featureScope?.selectedAreas ?? featureCoverage.selectedAreas ?? [];
  const uiSurfaces = TARGET_SURFACES.filter((surface) => selectedAreas.includes(surface));
  const screenChunks = collectScreenChunks(sourceMaterial);
  const figmaNodes = await collectFigmaNodes(args);
  const figmaRequired = args.figmaRequired ?? isFigmaBaseline;
  if (isFigmaBaseline && figmaNodes.length === 0) {
    throw new Error("--workflow figma-baseline requires --figma-url or --figma-links-file");
  }
  const figmaFileKeys = [...new Set(figmaNodes.map((node) => node.fileKey))];
  await mkdir(run.outDir, { recursive: true });

  const payload = {
    projectName: run.projectName,
    runDir: run.runDir,
    sourceMaterial: sourceMaterialPath,
    featureDefinition: featureDefinitionPath,
    featureCoverage: featureCoveragePath,
    featureDefinitionScope: featureScopePath,
    schemaDefinition: schemaDefinitionPath,
    schemaCoverage: schemaCoveragePath,
    apiDefinition: apiDefinitionPath,
    openapi: openapiPath,
    apiCoverage: apiCoveragePath,
    workflow: run.artifact.workflow,
    artifactKind: run.artifact.label,
    outputFiles: {
      aggregateDocument: join(run.runDir, run.artifact.aggregateDocument),
      screenIndex: join(run.runDir, run.artifact.screenDir, run.artifact.screenIndex),
      screenCoverage: join(run.runDir, run.artifact.screenCoverage),
      validation: join(run.runDir, run.artifact.validation),
      reviewJson: join(run.runDir, run.artifact.reviewJson),
      reviewMarkdown: join(run.runDir, run.artifact.reviewMarkdown),
      loop: join(run.runDir, run.artifact.loop),
    },
    workflowTemplate: {
      screenDefinitionTemplatePath: templatePath,
      screenDefinitionTemplate: screenTemplate,
      writingRulesPath,
      writingRules,
      collection: true,
      screenCodeConvention: "{SURFACE}-SCR-###",
    },
    selectedAreas,
    screenTargetSurfaces: uiSurfaces,
    extraContext: featureScope?.extraContext ?? featureCoverage.extraContext ?? "",
    figma: {
      required: figmaRequired,
      accessMode: args.figmaAccessMode ?? "direct-or-export",
      linksFile: args.figmaLinksFile ? resolve(args.figmaLinksFile) : null,
      fileKeys: figmaFileKeys,
      screenNodes: figmaNodes,
      implementationBaselineRules: [
        "Figma is the source of truth for visual layout, spacing, typography, color, component composition, icons/images, and interaction states when supplied.",
        "Each screen document must include the Figma URL, file key, node id, frame/title, and design-to-implementation notes.",
        "Use exact Figma/export values only when directly inspected or provided; do not invent visual measurements or tokens.",
        "If Figma access is unavailable, record the missing access/export as a blocker in the Figma section and avoid guessed design details.",
      ],
    },
    features: featureCoverage.features.map((feature) => ({
      featureId: feature.featureId,
      featureName: feature.featureName,
      areas: feature.areas,
      sourceChunks: feature.sourceChunks ?? [],
      reuse: feature.reuse ?? null,
    })),
    schemas: (schemaCoverage.schemas ?? []).map((schema) => ({
      schemaCode: schema.code,
      schemaName: schema.name,
      tableName: schema.tableName,
      sourceFeatureIds: schema.sourceFeatureIds ?? [],
    })),
    apis: (apiCoverage.apis ?? []).map((api) => ({
      apiCode: api.code,
      method: api.method,
      path: api.path,
      summary: api.summary,
      sourceFeatureCodes: api.sourceFeatureCodes ?? [],
      schemaCodes: api.schemaCodes ?? [],
    })),
    sourceScreenChunks: screenChunks,
    productBuilderBase: {
      repoPath: baseRepo.inputPath,
      appSurfaceFiles: productBuilderBaseSurfaceFiles,
    },
    featureDefinitionExcerpt: featureDefinition.slice(0, 12000),
    rules: [
      isFigmaBaseline
        ? "Figma Screen Definition Baseline must be based on supplied Figma nodes plus feature/schema/API definitions and source material."
        : "Feature Implementation Screen Definition must be based on feature/schema/API definitions and source material.",
      "Use Codex screen template sections exactly; every detailed screen doc must include UX flow diagrams and QA acceptance criteria.",
      "Do not redefine API request/response shapes or DB fields in screen docs.",
      "Every screen must have one targetSurface from admin, site, app, landing.",
      "Do not create screens for pure server behavior.",
      "Every screen must reference existing feature/schema/API codes only.",
      isFigmaBaseline
        ? "Every Figma-backed screen must include the matching Figma node reference and implementation baseline."
        : "Do not mix the Figma baseline workflow into this feature-centered workflow.",
      isFigmaBaseline
        ? "When Figma cannot be inspected, document the access/export gap and do not guess layout/style/token values."
        : "Use the separate figma-baseline workflow when Figma is the source of truth.",
      "The final screen deliverables must already include review-driven fixes; do not leave fixes only in screen-definition-review.md.",
    ],
  };

  const analysisPath = join(run.outDir, "screen-analysis-input.json");
  const workflowPath = join(run.outDir, "screen-workflow.md");
  await writeFile(analysisPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  await writeFile(workflowPath, renderWorkflow({
    projectName: run.projectName,
    artifact: run.artifact,
    selectedAreas,
    uiSurfaces,
    featureCount: payload.features.length,
    schemaCount: payload.schemas.length,
    apiCount: payload.apis.length,
    screenChunkCount: screenChunks.length,
    figmaNodeCount: figmaNodes.length,
    figmaRequired,
    figmaFileKeys,
  }), "utf8");

  console.log(JSON.stringify({
    ok: true,
    projectName: run.projectName,
    runDir: run.runDir,
    outDir: run.outDir,
    workflowKind: run.artifact.workflow,
    artifactKind: run.artifact.label,
    selectedAreas,
    screenTargetSurfaces: uiSurfaces,
    featureCount: payload.features.length,
    schemaCount: payload.schemas.length,
    apiCount: payload.apis.length,
    sourceScreenChunkCount: screenChunks.length,
    figmaNodeCount: figmaNodes.length,
    figmaRequired,
    figmaFileKeys,
    analysisInput: analysisPath,
    workflowFile: workflowPath,
    screenIndex: payload.outputFiles.screenIndex,
    screenCoverage: payload.outputFiles.screenCoverage,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
