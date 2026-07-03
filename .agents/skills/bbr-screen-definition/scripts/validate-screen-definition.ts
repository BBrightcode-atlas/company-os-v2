import { access, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";

type CliArgs = {
  projectName?: string;
  runDir?: string;
  workflow?: WorkflowKind;
  help?: boolean;
};

type WorkflowKind = "feature-implementation" | "figma-baseline";

type ArtifactConfig = {
  workflow: WorkflowKind;
  workDir: string;
  aggregateDocument: string;
  screenDir: string;
  screenIndex: string;
  screenCoverage: string;
  validation: string;
};

type LatestRun = {
  runDir?: string;
};

type FeatureCoverage = {
  features?: Array<{ featureId?: string; featureName?: string }>;
};

type SchemaCoverage = {
  schemas?: Array<{ code?: string; name?: string }>;
};

type ApiCoverage = {
  apis?: Array<{ code?: string; summary?: string }>;
};

type ScreenFigmaRef = {
  title?: string;
  url?: string;
  fileKey?: string;
  nodeId?: string;
  nodeIdApi?: string;
  frameName?: string;
  missingReason?: string;
};

type ScreenAction = {
  code?: string;
  name?: string;
  testId?: string;
  trigger?: string;
  apiCodes?: string[];
  targetScreenCode?: string | null;
};

type ScreenQaCase = {
  code?: string;
  testId?: string;
  description?: string;
};

type ScreenCoverage = {
  projectName?: string;
  screenIndex?: string;
  aggregateDocument?: string;
  screens?: Array<{
    code?: string;
    name?: string;
    targetSurface?: string;
    route?: string;
    access?: string;
    description?: string;
    layoutReference?: string;
    primaryTestId?: string;
    documentPath?: string;
    sourceFeatureCodes?: string[];
    schemaCodes?: string[];
    apiCodes?: string[];
    states?: string[];
    actions?: ScreenAction[];
    qaCases?: ScreenQaCase[];
    sourceChunks?: string[];
    figma?: ScreenFigmaRef;
    figmaNodes?: ScreenFigmaRef[];
    figmaUrl?: string;
    figmaNodeId?: string;
    figmaFrameName?: string;
  }>;
  featureScreenMappings?: Array<{
    featureId?: string;
    featureName?: string;
    screenCodes?: string[];
  }>;
  apiScreenMappings?: Array<{
    apiCode?: string;
    screenCodes?: string[];
  }>;
  unmappedFeatures?: Array<{ featureId?: string; reason?: string }>;
};

type Finding = {
  severity: "error" | "warning";
  code: string;
  message: string;
};

type ScreenAnalysisInput = {
  figma?: {
    required?: boolean;
    screenNodes?: ScreenFigmaRef[];
  };
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";
const TARGET_SURFACES = new Set(["admin", "site", "app", "landing"]);
const REQUIRED_STATES = ["Default", "Empty", "Loading", "Error", "Permission"];
const FEATURE_REQUIRED_SECTIONS = [
  "# 화면정의서(Screen Definition)",
  "## 1. 기본 정보(Basic Information)",
  "## 2. 참조 계약(Referenced Contracts)",
  "## 3. 화면 구성(Screen Composition)",
  "## 4. 화면 필드(Screen Fields)",
  "## 5. 화면 상태(Screen States)",
  "## 6. 사용자 액션(User Actions)",
  "## 7. UX Flow Diagrams",
  "flowchart TD",
  "sequenceDiagram",
  "## 8. 화면 QA 인수 기준(Screen QA Acceptance Criteria)",
  "## 9. 미확정(Undecided)",
  "## 10. 해당 없음(N/A)",
];
const FIGMA_REQUIRED_SECTIONS = [
  "# Figma 화면정의서(Figma Screen Definition)",
  "## 1. 기본 정보(Basic Information)",
  "## 2. Figma 구현 기준(Figma Implementation Baseline)",
  "## 3. 참조 계약(Referenced Contracts)",
  "## 4. 화면 구성(Screen Composition)",
  "## 5. 화면 필드(Screen Fields)",
  "## 6. 화면 상태(Screen States)",
  "## 7. 사용자 액션(User Actions)",
  "## 8. UX Flow Diagrams",
  "flowchart TD",
  "sequenceDiagram",
  "## 9. 화면 QA 인수 기준(Screen QA Acceptance Criteria)",
  "## 10. 미확정(Undecided)",
  "## 11. 해당 없음(N/A)",
];

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-screen-definition/scripts/validate-screen-definition.ts --project-name aiga",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-screen-definition/scripts/validate-screen-definition.ts --run-dir ./generated/source-intake/aiga/runs/<run>",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-screen-definition/scripts/validate-screen-definition.ts --workflow figma-baseline --project-name aiga",
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
      workDir: "figma-screen-definition-work",
      aggregateDocument: "figma-screen-definition.md",
      screenDir: "figma-screen-definitions",
      screenIndex: "figma-screen-definition-index.md",
      screenCoverage: "figma-screen-coverage.json",
      validation: "figma-screen-definition.validation.json",
    };
  }
  return {
    workflow,
    workDir: "screen-definition-work",
    aggregateDocument: "screen-definition.md",
    screenDir: "screen-definitions",
    screenIndex: "screen-definition-index.md",
    screenCoverage: "screen-coverage.json",
    validation: "screen-definition.validation.json",
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
      case "--workflow":
        if (!next) throw new Error("--workflow requires a value");
        args.workflow = parseWorkflowKind(next);
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

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveRunDir(args: CliArgs): Promise<string> {
  if (args.runDir) return resolve(args.runDir);
  if (!args.projectName) throw new Error("--project-name or --run-dir is required");
  const latestPath = resolve(DEFAULT_SOURCE_ROOT, safeSlug(args.projectName), "latest-run.json");
  const latest = await readJson<LatestRun>(latestPath);
  if (!latest.runDir) throw new Error(`latest-run.json does not include runDir: ${latestPath}`);
  return resolveProjectPath(args.projectName, latest.runDir);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(nonEmptyString);
}

type ScreenCoverageScreen = NonNullable<ScreenCoverage["screens"]>[number];

function screenFigmaRefs(screen: ScreenCoverageScreen): ScreenFigmaRef[] {
  const refs: ScreenFigmaRef[] = [];
  if (Array.isArray(screen.figmaNodes)) refs.push(...screen.figmaNodes);
  if (screen.figma) refs.push(screen.figma);
  if (screen.figmaUrl || screen.figmaNodeId || screen.figmaFrameName) {
    refs.push({
      url: screen.figmaUrl,
      nodeId: screen.figmaNodeId,
      frameName: screen.figmaFrameName,
    });
  }
  return refs.map((ref) => ({
    ...ref,
    nodeIdApi: ref.nodeIdApi ?? ref.nodeId?.replace(/-/g, ":"),
  }));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const runDir = await resolveRunDir(args);
  const artifact = artifactConfig(parseWorkflowKind(args.workflow));
  const coveragePath = join(runDir, artifact.screenCoverage);
  const featureCoveragePath = join(runDir, "feature-coverage.json");
  const schemaCoveragePath = join(runDir, "schema-coverage.json");
  const apiCoveragePath = join(runDir, "api-coverage.json");
  const analysisInputPath = join(runDir, artifact.workDir, "screen-analysis-input.json");
  const validationPath = join(runDir, artifact.validation);

  const [coverage, featureCoverage, schemaCoverage, apiCoverage, analysisInput] = await Promise.all([
    readJson<ScreenCoverage>(coveragePath),
    readJson<FeatureCoverage>(featureCoveragePath),
    readJson<SchemaCoverage>(schemaCoveragePath),
    readJson<ApiCoverage>(apiCoveragePath),
    readJsonIfExists<ScreenAnalysisInput>(analysisInputPath),
  ]);

  const findings: Finding[] = [];
  const screens = coverage.screens ?? [];
  const featureIds = new Set((featureCoverage.features ?? []).map((feature) => feature.featureId).filter(nonEmptyString));
  const schemaCodes = new Set((schemaCoverage.schemas ?? []).map((schema) => schema.code).filter(nonEmptyString));
  const apiCodes = new Set((apiCoverage.apis ?? []).map((api) => api.code).filter(nonEmptyString));
  const screenCodes = new Set<string>();
  const figmaNodes = analysisInput?.figma?.screenNodes ?? [];
  const figmaRequired = artifact.workflow === "figma-baseline" && Boolean(analysisInput?.figma?.required && figmaNodes.length > 0);
  const figmaNodeIds = new Set(figmaNodes.flatMap((node) => [node.nodeId, node.nodeIdApi]).filter(nonEmptyString));

  if (!coverage.aggregateDocument || !await fileExists(join(runDir, coverage.aggregateDocument))) {
    findings.push({ severity: "error", code: "aggregate-missing", message: "screen-coverage.json.aggregateDocument must point to an existing aggregate Markdown file." });
  }
  if (!coverage.screenIndex || !await fileExists(join(runDir, coverage.screenIndex))) {
    findings.push({ severity: "error", code: "screen-index-missing", message: "screen-coverage.json.screenIndex must point to an existing screen index Markdown file." });
  }
  if (!screens.length) {
    findings.push({ severity: "error", code: "screens-empty", message: "screen-coverage.json must include one or more screens." });
  }

  for (const [index, screen] of screens.entries()) {
    const label = screen.code || `screens[${index}]`;
    if (!/^(ADMIN|SITE|APP|LANDING)-SCR-\d{3}$/.test(screen.code ?? "")) {
      findings.push({ severity: "error", code: "screen-code-invalid", message: `${label}.code must match {SURFACE}-SCR-###.` });
    }
    if (screen.code && screenCodes.has(screen.code)) {
      findings.push({ severity: "error", code: "screen-code-duplicate", message: `${screen.code} is duplicated.` });
    }
    if (screen.code) screenCodes.add(screen.code);

    for (const key of ["name", "targetSurface", "route", "access", "description", "layoutReference", "primaryTestId", "documentPath"] as const) {
      if (!nonEmptyString(screen[key])) {
        findings.push({ severity: "error", code: "screen-required-field-empty", message: `${label}.${key} is required.` });
      }
    }
    if (screen.targetSurface && !TARGET_SURFACES.has(screen.targetSurface)) {
      findings.push({ severity: "error", code: "screen-target-surface-invalid", message: `${label}.targetSurface must be one of admin, site, app, landing.` });
    }
    if (!nonEmptyStringArray(screen.sourceFeatureCodes)) {
      findings.push({ severity: "error", code: "screen-feature-codes-empty", message: `${label}.sourceFeatureCodes must include one or more FEA ids.` });
    } else {
      const unknown = screen.sourceFeatureCodes.filter((featureId) => !featureIds.has(featureId));
      if (unknown.length) findings.push({ severity: "error", code: "screen-feature-code-unknown", message: `${label} references unknown feature(s): ${unknown.join(", ")}.` });
    }
    if (!Array.isArray(screen.schemaCodes)) {
      findings.push({ severity: "error", code: "screen-schema-codes-invalid", message: `${label}.schemaCodes must be an array.` });
    } else {
      const unknown = screen.schemaCodes.filter((schemaCode) => !schemaCodes.has(schemaCode));
      if (unknown.length) findings.push({ severity: "error", code: "screen-schema-code-unknown", message: `${label} references unknown schema(s): ${unknown.join(", ")}.` });
    }
    if (!Array.isArray(screen.apiCodes)) {
      findings.push({ severity: "error", code: "screen-api-codes-invalid", message: `${label}.apiCodes must be an array.` });
    } else {
      const unknown = screen.apiCodes.filter((apiCode) => !apiCodes.has(apiCode));
      if (unknown.length) findings.push({ severity: "error", code: "screen-api-code-unknown", message: `${label} references unknown API(s): ${unknown.join(", ")}.` });
    }
    if (!nonEmptyStringArray(screen.states)) {
      findings.push({ severity: "error", code: "screen-states-empty", message: `${label}.states must include screen states.` });
    } else {
      const missingStates = REQUIRED_STATES.filter((state) => !screen.states?.includes(state));
      if (missingStates.length) findings.push({ severity: "warning", code: "screen-state-missing", message: `${label} does not list required state(s): ${missingStates.join(", ")}.` });
    }
    if (!Array.isArray(screen.actions) || screen.actions.length === 0) {
      findings.push({ severity: "error", code: "screen-actions-empty", message: `${label}.actions must include one or more actions.` });
    } else {
      for (const [actionIndex, action] of screen.actions.entries()) {
        const actionLabel = `${label}.actions[${actionIndex}]`;
        if (!/^ACT-\d{2}$/.test(action.code ?? "")) findings.push({ severity: "error", code: "screen-action-code-invalid", message: `${actionLabel}.code must match ACT-##.` });
        if (!nonEmptyString(action.testId)) findings.push({ severity: "error", code: "screen-action-testid-empty", message: `${actionLabel}.testId is required.` });
        if (!nonEmptyString(action.trigger)) findings.push({ severity: "error", code: "screen-action-trigger-empty", message: `${actionLabel}.trigger is required.` });
        for (const apiCode of action.apiCodes ?? []) {
          if (!apiCodes.has(apiCode)) findings.push({ severity: "error", code: "screen-action-api-unknown", message: `${actionLabel} references unknown API ${apiCode}.` });
        }
      }
    }
    if (!Array.isArray(screen.qaCases) || screen.qaCases.length === 0) {
      findings.push({ severity: "error", code: "screen-qa-empty", message: `${label}.qaCases must include one or more QA cases.` });
    } else {
      for (const [qaIndex, qa] of screen.qaCases.entries()) {
        const qaLabel = `${label}.qaCases[${qaIndex}]`;
        if (!/^AC-\d{2}$/.test(qa.code ?? "")) findings.push({ severity: "error", code: "screen-qa-code-invalid", message: `${qaLabel}.code must match AC-##.` });
        if (!nonEmptyString(qa.testId)) findings.push({ severity: "error", code: "screen-qa-testid-empty", message: `${qaLabel}.testId is required.` });
        if (!nonEmptyString(qa.description)) findings.push({ severity: "error", code: "screen-qa-description-empty", message: `${qaLabel}.description is required.` });
      }
    }

    if (figmaRequired) {
      const figmaRefs = screenFigmaRefs(screen);
      const hasFigmaRef = figmaRefs.some((ref) => nonEmptyString(ref.url) && nonEmptyString(ref.nodeId));
      const hasMissingReason = figmaRefs.some((ref) => nonEmptyString(ref.missingReason));
      if (!hasFigmaRef && !hasMissingReason) {
        findings.push({ severity: "error", code: "screen-figma-ref-missing", message: `${label} must include figmaNodes[].url and figmaNodes[].nodeId, or figmaNodes[].missingReason if Figma access/export is unavailable.` });
      }
      for (const figmaRef of figmaRefs) {
        const nodeMatchesInput = (figmaRef.nodeId && figmaNodeIds.has(figmaRef.nodeId)) || (figmaRef.nodeIdApi && figmaNodeIds.has(figmaRef.nodeIdApi));
        if (nonEmptyString(figmaRef.nodeId) && figmaNodeIds.size > 0 && !nodeMatchesInput) {
          findings.push({ severity: "warning", code: "screen-figma-node-not-in-input", message: `${label} references Figma node ${figmaRef.nodeId}, which is not in screen-analysis-input.json.` });
        }
        if (nonEmptyString(figmaRef.missingReason)) {
          findings.push({ severity: "warning", code: "screen-figma-access-gap-documented", message: `${label} documents a Figma access/export gap: ${figmaRef.missingReason}.` });
        }
      }
    }

    if (!screen.documentPath || !await fileExists(join(runDir, screen.documentPath))) {
      findings.push({ severity: "error", code: "screen-document-missing", message: `${label}.documentPath must point to an existing Markdown file.` });
      continue;
    }
    const document = await readFile(join(runDir, screen.documentPath), "utf8");
    const requiredSections = artifact.workflow === "figma-baseline" ? FIGMA_REQUIRED_SECTIONS : FEATURE_REQUIRED_SECTIONS;
    for (const section of requiredSections) {
      if (!document.includes(section)) {
        findings.push({ severity: "error", code: "screen-document-section-missing", message: `${label} document is missing section or marker: ${section}.` });
      }
    }
    if (screen.code && !document.includes(screen.code)) {
      findings.push({ severity: "error", code: "screen-code-missing-in-document", message: `${label} code is missing from its screen document.` });
    }
    if (/\{\{[^}]+\}\}/.test(document)) {
      findings.push({ severity: "error", code: "screen-template-placeholder-left", message: `${label} document still contains screen template placeholders.` });
    }
    if (figmaRequired) {
      const figmaRefs = screenFigmaRefs(screen);
      if (!document.includes("## 2. Figma 구현 기준(Figma Implementation Baseline)")) {
        findings.push({ severity: "error", code: "screen-document-figma-section-missing", message: `${label} document is missing the Figma implementation baseline section.` });
      }
      const hasDocumentFigmaRef = figmaRefs.some((figmaRef) =>
        (figmaRef.nodeId && document.includes(figmaRef.nodeId))
        || (figmaRef.nodeIdApi && document.includes(figmaRef.nodeIdApi))
        || (figmaRef.url && document.includes(figmaRef.url))
        || (figmaRef.missingReason && document.includes(figmaRef.missingReason))
      );
      if (!hasDocumentFigmaRef) {
        findings.push({ severity: "error", code: "screen-document-figma-ref-missing", message: `${label} document does not include its Figma node/url or documented Figma gap.` });
      }
      if (/(추정|guess|assume|estimated)/i.test(document) && !/추정하지|do not guess|do not assume/i.test(document)) {
        findings.push({ severity: "warning", code: "screen-document-figma-guess-risk", message: `${label} document appears to contain guessed visual details; verify against Figma or mark the gap explicitly.` });
      }
    }
    for (const action of screen.actions ?? []) {
      if (action.testId && !document.includes(action.testId)) {
        findings.push({ severity: "warning", code: "screen-action-testid-missing-in-document", message: `${label} document does not include action test id ${action.testId}.` });
      }
    }
  }

  const validScreenCodes = new Set(screens.map((screen) => screen.code).filter(nonEmptyString));
  for (const mapping of coverage.featureScreenMappings ?? []) {
    if (!mapping.featureId || !featureIds.has(mapping.featureId)) {
      findings.push({ severity: "error", code: "feature-screen-mapping-unknown", message: `featureScreenMappings references unknown feature ${mapping.featureId ?? ""}.` });
    }
    if (!nonEmptyStringArray(mapping.screenCodes)) {
      findings.push({ severity: "error", code: "feature-screen-codes-empty", message: `${mapping.featureId ?? "feature mapping"} must include screenCodes.` });
    } else {
      const unknown = mapping.screenCodes.filter((screenCode) => !validScreenCodes.has(screenCode));
      if (unknown.length) findings.push({ severity: "error", code: "feature-screen-code-unknown", message: `${mapping.featureId ?? "feature mapping"} references unknown screen(s): ${unknown.join(", ")}.` });
    }
  }
  for (const mapping of coverage.apiScreenMappings ?? []) {
    if (!mapping.apiCode || !apiCodes.has(mapping.apiCode)) {
      findings.push({ severity: "error", code: "api-screen-mapping-unknown", message: `apiScreenMappings references unknown API ${mapping.apiCode ?? ""}.` });
    }
    if (!nonEmptyStringArray(mapping.screenCodes)) {
      findings.push({ severity: "error", code: "api-screen-codes-empty", message: `${mapping.apiCode ?? "api mapping"} must include screenCodes.` });
    } else {
      const unknown = mapping.screenCodes.filter((screenCode) => !validScreenCodes.has(screenCode));
      if (unknown.length) findings.push({ severity: "error", code: "api-screen-code-unknown", message: `${mapping.apiCode ?? "api mapping"} references unknown screen(s): ${unknown.join(", ")}.` });
    }
  }

  const result = {
    ok: findings.every((finding) => finding.severity !== "error"),
    screenCoverage: coveragePath,
    aggregateDocument: coverage.aggregateDocument ? join(runDir, coverage.aggregateDocument) : null,
    screenIndex: coverage.screenIndex ? join(runDir, coverage.screenIndex) : null,
    workflow: artifact.workflow,
    screenCount: screens.length,
    figmaRequired,
    figmaInputNodeCount: figmaNodes.length,
    findings,
  };
  await writeFile(validationPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ ...result, validation: validationPath }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
