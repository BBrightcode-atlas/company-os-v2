import { readFile, writeFile } from "node:fs/promises";
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
  screenCoverage: string;
  validation: string;
  reviewJson: string;
  reviewMarkdown: string;
};

type LatestRun = {
  runDir?: string;
};

type ValidationResult = {
  ok: boolean;
  screenCount: number;
  findings: Array<{ severity: "error" | "warning"; code: string; message: string }>;
};

type FeatureCoverage = {
  selectedAreas?: string[];
  features?: Array<{
    featureId?: string;
    featureName?: string;
    areas?: string[];
  }>;
};

type ApiCoverage = {
  apis?: Array<{
    code?: string;
    method?: string;
    path?: string;
    sourceFeatureCodes?: string[];
  }>;
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
    documentPath?: string;
    sourceFeatureCodes?: string[];
    apiCodes?: string[];
    schemaCodes?: string[];
    states?: string[];
    actions?: Array<{ code?: string; testId?: string; apiCodes?: string[]; targetScreenCode?: string | null }>;
    qaCases?: Array<{ code?: string; testId?: string; description?: string }>;
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
  unmappedFigmaNodes?: Array<{ nodeId?: string; title?: string; reason?: string }>;
};

type ScreenAnalysisInput = {
  figma?: {
    required?: boolean;
    screenNodes?: ScreenFigmaRef[];
  };
};

type Finding = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";
const UI_AREAS = new Set(["admin", "site", "app", "landing"]);

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-screen-definition/scripts/review-screen-definition.ts --project-name aiga",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-screen-definition/scripts/review-screen-definition.ts --run-dir ./generated/source-intake/aiga/runs/<run>",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-screen-definition/scripts/review-screen-definition.ts --workflow figma-baseline --project-name aiga",
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
      screenCoverage: "figma-screen-coverage.json",
      validation: "figma-screen-definition.validation.json",
      reviewJson: "figma-screen-definition.review.json",
      reviewMarkdown: "figma-screen-definition-review.md",
    };
  }
  return {
    workflow,
    workDir: "screen-definition-work",
    screenCoverage: "screen-coverage.json",
    validation: "screen-definition.validation.json",
    reviewJson: "screen-definition.review.json",
    reviewMarkdown: "screen-definition-review.md",
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

function renderReviewMarkdown(input: {
  projectName: string;
  screenCount: number;
  uiFeatureCount: number;
  mappedUiFeatureCount: number;
  unmappedFeatureCount: number;
  validation: ValidationResult | null;
  findings: Finding[];
}): string {
  const errorCount = input.findings.filter((finding) => finding.severity === "error").length;
  const warningCount = input.findings.filter((finding) => finding.severity === "warning").length;
  const infoCount = input.findings.filter((finding) => finding.severity === "info").length;
  return [
    `# 화면정의서 리뷰 - ${input.projectName}`,
    "",
    `- 상태: ${errorCount === 0 ? "pass" : "fail"}`,
    `- 화면 수: ${input.screenCount}`,
    `- UI 관련 기능 수: ${input.uiFeatureCount}`,
    `- 화면 매핑 UI 기능 수: ${input.mappedUiFeatureCount}`,
    `- 미매핑 기능 수: ${input.unmappedFeatureCount}`,
    `- 구조 검증: ${input.validation ? (input.validation.ok ? "pass" : "fail") : "not-run"}`,
    `- 발견 사항: error ${errorCount}, warning ${warningCount}, info ${infoCount}`,
    "",
    "## Findings",
    "",
    input.findings.length === 0
      ? "검토 항목에서 문제를 발견하지 못했습니다."
      : input.findings.map((finding) => `- ${finding.severity.toUpperCase()} [${finding.code}] ${finding.message}`).join("\n"),
    "",
  ].join("\n");
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
  const apiCoveragePath = join(runDir, "api-coverage.json");
  const validationPath = join(runDir, artifact.validation);
  const analysisInputPath = join(runDir, artifact.workDir, "screen-analysis-input.json");
  const reviewJsonPath = join(runDir, artifact.reviewJson);
  const reviewMarkdownPath = join(runDir, artifact.reviewMarkdown);

  const [coverage, featureCoverage, apiCoverage, validation, analysisInput] = await Promise.all([
    readJson<ScreenCoverage>(coveragePath),
    readJson<FeatureCoverage>(featureCoveragePath),
    readJson<ApiCoverage>(apiCoveragePath),
    readJsonIfExists<ValidationResult>(validationPath),
    readJsonIfExists<ScreenAnalysisInput>(analysisInputPath),
  ]);
  const findings: Finding[] = [];

  if (!validation) {
    findings.push({ severity: "warning", code: "validation-missing", message: "screen-definition.validation.json is missing; run validate-screen-definition.ts first." });
  } else if (!validation.ok) {
    findings.push({ severity: "error", code: "validation-failed", message: `Screen validation failed with ${validation.findings.length} finding(s).` });
  }

  const screens = coverage.screens ?? [];
  const figmaNodes = analysisInput?.figma?.screenNodes ?? [];
  const figmaRequired = artifact.workflow === "figma-baseline" && Boolean(analysisInput?.figma?.required && figmaNodes.length > 0);
  const suppliedFigmaNodeIds = new Set(figmaNodes.flatMap((node) => [node.nodeId, node.nodeIdApi]).filter(nonEmptyString));
  const referencedFigmaNodeIds = new Set<string>();
  for (const screen of screens) {
    for (const ref of screenFigmaRefs(screen)) {
      if (ref.nodeId) referencedFigmaNodeIds.add(ref.nodeId);
      if (ref.nodeIdApi) referencedFigmaNodeIds.add(ref.nodeIdApi);
    }
  }
  const explicitlyUnmappedFigmaNodes = new Set((coverage.unmappedFigmaNodes ?? []).flatMap((node) => [node.nodeId, node.nodeId?.replace(/-/g, ":")]).filter(nonEmptyString));
  if (figmaRequired) {
    const missingFigmaNodes = figmaNodes
      .filter((node) => {
        const ids = [node.nodeId, node.nodeIdApi].filter(nonEmptyString);
        return ids.length > 0 && !ids.some((id) => referencedFigmaNodeIds.has(id) || explicitlyUnmappedFigmaNodes.has(id));
      })
      .map((node) => `${node.title ?? "Figma node"}(${node.nodeId ?? node.nodeIdApi ?? "-"})`);
    if (missingFigmaNodes.length) {
      findings.push({ severity: "error", code: "figma-node-unmapped", message: `Supplied Figma node(s) are neither mapped to screens nor explicitly unmapped: ${missingFigmaNodes.join(", ")}.` });
    }
  }
  const mappedFeatures = new Set<string>();
  const unmappedFeatures = new Set((coverage.unmappedFeatures ?? []).map((feature) => feature.featureId).filter(nonEmptyString));
  for (const screen of screens) {
    for (const featureId of screen.sourceFeatureCodes ?? []) mappedFeatures.add(featureId);
  }

  const uiFeatures = (featureCoverage.features ?? []).filter((feature) => (feature.areas ?? []).some((area) => UI_AREAS.has(area)));
  const uncoveredUiFeatures = uiFeatures
    .map((feature) => feature.featureId)
    .filter(nonEmptyString)
    .filter((featureId) => !mappedFeatures.has(featureId) && !unmappedFeatures.has(featureId));
  if (uncoveredUiFeatures.length) {
    findings.push({ severity: "error", code: "ui-feature-unmapped", message: `UI feature(s) are neither mapped to screens nor explicitly unmapped: ${uncoveredUiFeatures.join(", ")}.` });
  }

  const apiCodesWithScreens = new Set((coverage.apiScreenMappings ?? []).map((mapping) => mapping.apiCode).filter(nonEmptyString));
  const uiFeatureIds = new Set(uiFeatures.map((feature) => feature.featureId).filter(nonEmptyString));
  for (const api of apiCoverage.apis ?? []) {
    const touchesUiFeature = (api.sourceFeatureCodes ?? []).some((featureId) => uiFeatureIds.has(featureId));
    if (touchesUiFeature && api.code && !apiCodesWithScreens.has(api.code)) {
      findings.push({ severity: "warning", code: "ui-api-unmapped-to-screen", message: `${api.code} touches a UI feature but is not mapped to any screen.` });
    }
  }

  for (const screen of screens) {
    const label = `${screen.code ?? "screen"} ${screen.name ?? ""}`.trim();
    if (figmaRequired) {
      const refs = screenFigmaRefs(screen);
      if (refs.length === 0) {
        findings.push({ severity: "error", code: "screen-figma-empty", message: `${label} has no Figma mapping while Figma is required for this run.` });
      }
      for (const ref of refs) {
        const refMatchesSupplied = (ref.nodeId && suppliedFigmaNodeIds.has(ref.nodeId)) || (ref.nodeIdApi && suppliedFigmaNodeIds.has(ref.nodeIdApi));
        if (ref.nodeId && suppliedFigmaNodeIds.size > 0 && !refMatchesSupplied) {
          findings.push({ severity: "warning", code: "screen-figma-not-supplied", message: `${label} references Figma node ${ref.nodeId}, but it was not supplied in the Figma input list.` });
        }
        if (ref.missingReason) {
          findings.push({ severity: "warning", code: "screen-figma-gap", message: `${label} still has a Figma access/export gap; implementation-level visual detail may be incomplete.` });
        }
      }
    }
    if (screen.documentPath) {
      const doc = await readFile(join(runDir, screen.documentPath), "utf8").catch(() => "");
      if (doc && coverage.aggregateDocument) {
        const aggregate = await readFile(join(runDir, coverage.aggregateDocument), "utf8").catch(() => "");
        if (aggregate && screen.code && !aggregate.includes(screen.code)) {
          findings.push({ severity: "error", code: "screen-missing-in-aggregate", message: `${screen.code} is missing from aggregate screen-definition.md.` });
        }
      }
      if (doc && coverage.screenIndex) {
        const index = await readFile(join(runDir, coverage.screenIndex), "utf8").catch(() => "");
        if (index && screen.code && !index.includes(screen.code)) {
          findings.push({ severity: "error", code: "screen-missing-in-index", message: `${screen.code} is missing from screen-definition-index.md.` });
        }
      }
      if (doc && /request body|response body|CREATE TABLE|drizzle|pgTable/i.test(doc)) {
        findings.push({ severity: "warning", code: "screen-contract-redefinition-risk", message: `${label} may redefine API/schema details instead of referencing prior contracts.` });
      }
      if (figmaRequired && doc) {
        const figmaDetailChecks: Array<[string, RegExp]> = [
          ["Figma node reference", /Figma|node|노드/i],
          ["typography", /Typography|타이포|font|폰트/i],
          ["color", /Color|색상|color token/i],
          ["spacing/layout", /Spacing|간격|padding|margin|grid|layout|레이아웃/i],
          ["responsive behavior", /Responsive|반응형|breakpoint|viewport|뷰포트/i],
        ];
        for (const [detail, pattern] of figmaDetailChecks) {
          if (!pattern.test(doc)) {
            findings.push({ severity: "warning", code: "screen-figma-implementation-detail-weak", message: `${label} document may lack Figma implementation detail: ${detail}.` });
          }
        }
      }
    }
    if ((screen.apiCodes ?? []).length > 0) {
      const states = new Set(screen.states ?? []);
      for (const state of ["Loading", "Error"]) {
        if (!states.has(state)) findings.push({ severity: "warning", code: "screen-api-state-missing", message: `${label} uses API(s) but lacks ${state} state.` });
      }
    }
    if ((screen.actions ?? []).length > (screen.qaCases ?? []).length) {
      findings.push({ severity: "warning", code: "screen-actions-undercovered", message: `${label} has more actions than QA cases; check action coverage.` });
    }
    if (screen.targetSurface === "admin" && !/admin|operator|관리|운영/i.test(`${screen.access ?? ""} ${screen.name ?? ""}`)) {
      findings.push({ severity: "warning", code: "admin-screen-permission-weak", message: `${label} is admin surface but permission/name does not clearly indicate admin operation.` });
    }
  }

  findings.push({
    severity: "info",
    code: "screen-coverage-summary",
    message: `${screens.length} screens; ${mappedFeatures.size}/${uiFeatures.length} UI features mapped; ${unmappedFeatures.size} features explicitly unmapped.`,
  });

  const result = {
    ok: findings.every((finding) => finding.severity !== "error"),
    screenCoverage: coveragePath,
    aggregateDocument: coverage.aggregateDocument ? join(runDir, coverage.aggregateDocument) : null,
    screenIndex: coverage.screenIndex ? join(runDir, coverage.screenIndex) : null,
    validation: validationPath,
    workflow: artifact.workflow,
    screenCount: screens.length,
    uiFeatureCount: uiFeatures.length,
    mappedUiFeatureCount: mappedFeatures.size,
    unmappedFeatureCount: unmappedFeatures.size,
    figmaRequired,
    figmaInputNodeCount: figmaNodes.length,
    figmaReferencedNodeCount: referencedFigmaNodeIds.size,
    findings,
  };
  await writeFile(reviewJsonPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  await writeFile(reviewMarkdownPath, renderReviewMarkdown({
    projectName: coverage.projectName ?? args.projectName ?? "project",
    screenCount: screens.length,
    uiFeatureCount: uiFeatures.length,
    mappedUiFeatureCount: mappedFeatures.size,
    unmappedFeatureCount: unmappedFeatures.size,
    validation,
    findings,
  }), "utf8");

  console.log(JSON.stringify({ ...result, reviewJson: reviewJsonPath, reviewMarkdown: reviewMarkdownPath }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
