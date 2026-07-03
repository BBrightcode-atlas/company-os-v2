import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";

type CliArgs = {
  projectName?: string;
  runDir?: string;
  help?: boolean;
};

type LatestRun = {
  runDir?: string;
};

type ValidationResult = {
  ok: boolean;
  apiCount: number;
  pathCount: number;
  mappedFeatureCount: number;
  featureCount: number;
  findings: Array<{ severity: "error" | "warning"; code: string; message: string }>;
};

type FeatureCoverage = {
  selectedAreas?: string[];
  extraContext?: string;
  features: Array<{
    featureId: string;
    featureName: string;
    areas: string[];
  }>;
};

type ApiCoverage = {
  projectName?: string;
  apis?: Array<{
    code?: string;
    method?: string;
    path?: string;
    summary?: string;
    actor?: string;
    auth?: string;
    sourceFeatureCodes?: string[];
    schemaCodes?: string[];
    baseReuseDecision?: string;
    baseFeatureReferences?: Array<{ controllerPath?: string; servicePath?: string; dtoPath?: string; reuseDecision?: string }>;
    auditAction?: string;
    implementationNotes?: string[];
  }>;
  featureApiMappings?: Array<{
    featureId?: string;
    featureName?: string;
    apiCodes?: string[];
  }>;
  unmappedFeatures?: Array<{ featureId?: string; reason?: string }>;
};

type Finding = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/review-api-definition.ts --project-name aiga",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/review-api-definition.ts --run-dir ./generated/source-intake/aiga/runs/<run>",
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

function renderReviewMarkdown(input: {
  projectName: string;
  apiCount: number;
  featureCount: number;
  mappedFeatureCount: number;
  unmappedFeatureCount: number;
  validation: ValidationResult | null;
  findings: Finding[];
}): string {
  const errorCount = input.findings.filter((finding) => finding.severity === "error").length;
  const warningCount = input.findings.filter((finding) => finding.severity === "warning").length;
  const infoCount = input.findings.filter((finding) => finding.severity === "info").length;
  return [
    `# API 정의서 리뷰 - ${input.projectName}`,
    "",
    `- 상태: ${errorCount === 0 ? "pass" : "fail"}`,
    `- API 수: ${input.apiCount}`,
    `- 기능 수: ${input.featureCount}`,
    `- API 매핑 기능 수: ${input.mappedFeatureCount}`,
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

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const runDir = await resolveRunDir(args);
  const openapiYamlPath = join(runDir, "api-definition.openapi.yaml");
  const definitionPath = join(runDir, "api-definition.md");
  const coveragePath = join(runDir, "api-coverage.json");
  const featureCoveragePath = join(runDir, "feature-coverage.json");
  const validationPath = join(runDir, "api-definition.validation.json");
  const reviewJsonPath = join(runDir, "api-definition.review.json");
  const reviewMarkdownPath = join(runDir, "api-definition-review.md");

  const [openapiYaml, definition, coverage, featureCoverage, validation] = await Promise.all([
    readFile(openapiYamlPath, "utf8"),
    readFile(definitionPath, "utf8"),
    readJson<ApiCoverage>(coveragePath),
    readJson<FeatureCoverage>(featureCoveragePath),
    readJsonIfExists<ValidationResult>(validationPath),
  ]);
  const findings: Finding[] = [];

  if (!validation) {
    findings.push({ severity: "warning", code: "validation-missing", message: "api-definition.validation.json is missing; run validate-api-definition.ts first." });
  } else if (!validation.ok) {
    findings.push({ severity: "error", code: "validation-failed", message: `API validation failed with ${validation.findings.length} finding(s).` });
  }

  const apis = coverage.apis ?? [];
  const featureIds = new Set(featureCoverage.features.map((feature) => feature.featureId));
  const mappedFeatureIds = new Set<string>();
  const unmappedFeatureIds = new Set((coverage.unmappedFeatures ?? []).map((feature) => feature.featureId).filter(nonEmptyString));

  for (const api of apis) {
    const label = `${api.code ?? "API"} ${api.method ?? ""} ${api.path ?? ""}`.trim();
    if (api.code && !definition.includes(api.code)) {
      findings.push({ severity: "error", code: "api-code-missing-in-md", message: `${api.code} is present in api-coverage.json but missing in api-definition.md.` });
    }
    if (api.code && !openapiYaml.includes(api.code)) {
      findings.push({ severity: "error", code: "api-code-missing-in-openapi-yaml", message: `${api.code} is missing in api-definition.openapi.yaml.` });
    }
    if ((api.baseReuseDecision === "REUSE" || api.baseReuseDecision === "EXTEND") && !(api.baseFeatureReferences ?? []).some((ref) => ref.controllerPath || ref.servicePath || ref.dtoPath)) {
      findings.push({ severity: "error", code: "api-base-ref-missing", message: `${label} is ${api.baseReuseDecision} but has no concrete base controller/service/dto reference.` });
    }
    if (api.baseReuseDecision === "NEW" && (api.baseFeatureReferences ?? []).some((ref) => ref.reuseDecision === "REUSE")) {
      findings.push({ severity: "warning", code: "api-new-with-reuse-ref", message: `${label} is NEW but includes a REUSE base reference; check decision consistency.` });
    }
    if (api.path?.startsWith("/api/admin/") && MUTATING_METHODS.has((api.method ?? "").toUpperCase()) && (!api.auditAction || api.auditAction === "none")) {
      findings.push({ severity: "error", code: "admin-api-audit-missing", message: `${label} must define auditAction.` });
    }
    for (const featureId of api.sourceFeatureCodes ?? []) {
      if (!featureIds.has(featureId)) {
        findings.push({ severity: "error", code: "api-feature-unknown", message: `${label} references unknown feature ${featureId}.` });
      } else {
        mappedFeatureIds.add(featureId);
      }
    }
  }

  const uncoveredFeatures = [...featureIds].filter((featureId) => !mappedFeatureIds.has(featureId) && !unmappedFeatureIds.has(featureId));
  if (uncoveredFeatures.length) {
    findings.push({
      severity: "error",
      code: "feature-unmapped",
      message: `${uncoveredFeatures.length} feature(s) are neither mapped to APIs nor explicitly unmapped: ${uncoveredFeatures.join(", ")}.`,
    });
  }

  const selectedAreas = new Set(featureCoverage.selectedAreas ?? []);
  if (!selectedAreas.has("server")) {
    findings.push({ severity: "warning", code: "server-area-not-selected", message: "API definition normally requires server in selectedAreas." });
  }
  if (selectedAreas.has("ai-runtime")) {
    findings.push({ severity: "warning", code: "ai-runtime-selected", message: "Selected areas include ai-runtime; verify whether external AI chat scope changed." });
  }

  const allText = JSON.stringify({ openapiYaml, definition, coverage }).toLowerCase();
  if (allText.includes("ai-runtime")) {
    findings.push({ severity: "error", code: "ai-runtime-leak", message: "API artifacts mention ai-runtime even though Aiga AI chat is external REST only." });
  }
  if (!allText.includes("external rest") && !allText.includes("외부 rest")) {
    findings.push({ severity: "warning", code: "external-rest-note-missing", message: "External AI chat integration should explicitly mention external REST." });
  }

  const communityApis = apis.filter((api) => api.sourceFeatureCodes?.includes("FEA-004") || api.sourceFeatureCodes?.includes("FEA-005") || api.sourceFeatureCodes?.includes("FEA-014"));
  const communityReuseRefs = communityApis.flatMap((api) => api.baseFeatureReferences ?? []).map((ref) => ref.controllerPath ?? "");
  if (!communityReuseRefs.some((path) => path.includes("packages/features/community/controller/community.controller.ts"))) {
    findings.push({ severity: "warning", code: "community-controller-ref-missing", message: "Community APIs should reference product-builder-base community.controller.ts where reused or extended." });
  }
  if (!communityReuseRefs.some((path) => path.includes("packages/features/community/controller/community-admin.controller.ts"))) {
    findings.push({ severity: "warning", code: "community-admin-controller-ref-missing", message: "Admin community APIs should reference product-builder-base community-admin.controller.ts where reused or extended." });
  }

  const identityApis = apis.filter((api) => api.sourceFeatureCodes?.includes("FEA-008"));
  if (!identityApis.some((api) => JSON.stringify(api.baseFeatureReferences ?? []).includes("identity-verification"))) {
    findings.push({ severity: "warning", code: "identity-base-ref-missing", message: "Doctor verification APIs should reference product-builder-base identity-verification feature." });
  }

  findings.push({
    severity: "info",
    code: "api-coverage-summary",
    message: `${apis.length} APIs; ${mappedFeatureIds.size}/${featureIds.size} features mapped; ${unmappedFeatureIds.size} features explicitly unmapped.`,
  });

  const projectName = coverage.projectName ?? "project";
  const result = {
    ok: findings.every((finding) => finding.severity !== "error"),
    projectName,
    runDir,
    openapiYaml: openapiYamlPath,
    apiDefinition: definitionPath,
    apiCoverage: coveragePath,
    validation: validationPath,
    reviewMarkdown: reviewMarkdownPath,
    apiCount: apis.length,
    featureCount: featureIds.size,
    mappedFeatureCount: mappedFeatureIds.size,
    unmappedFeatureCount: unmappedFeatureIds.size,
    findings,
  };

  await writeFile(reviewJsonPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  await writeFile(reviewMarkdownPath, renderReviewMarkdown({
    projectName,
    apiCount: apis.length,
    featureCount: featureIds.size,
    mappedFeatureCount: mappedFeatureIds.size,
    unmappedFeatureCount: unmappedFeatureIds.size,
    validation,
    findings,
  }), "utf8");

  console.log(JSON.stringify({ ...result, reviewJson: reviewJsonPath }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
