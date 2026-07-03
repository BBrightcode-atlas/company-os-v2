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
  schemaCount: number;
  findings: Array<{ severity: "error" | "warning"; code: string; message: string }>;
};

type FeatureCoverage = {
  features: Array<{
    featureId: string;
    featureName: string;
    areas: string[];
    sourceChunks: string[];
  }>;
};

type SchemaCoverage = {
  projectName?: string;
  schemas?: Array<{
    code?: string;
    name?: string;
    tableName?: string;
    sourceFeatureIds?: string[];
    sourceChunks?: string[];
    baseReuseDecision?: string;
    baseDrizzleReferences?: Array<{ packagePath?: string; reuseDecision?: string }>;
    fields?: Array<{ name?: string; type?: string; required?: boolean; description?: string; defaultValue?: string }>;
    relations?: string[];
    implementationNotes?: string[];
  }>;
  featureSchemaMappings?: Array<{
    featureId?: string;
    featureName?: string;
    schemaCodes?: string[];
    defaultDecision?: string;
    baseDrizzleCandidates?: string[];
  }>;
  unmappedFeatures?: Array<{ featureId?: string; reason?: string }>;
};

type Finding = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/review-schema-definition.ts --project-name aiga",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/review-schema-definition.ts --run-dir ./generated/source-intake/aiga/runs/<run>",
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
  schemaCount: number;
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
    `# 스키마 정의서 리뷰 - ${input.projectName}`,
    "",
    `- 상태: ${errorCount === 0 ? "pass" : "fail"}`,
    `- 스키마 수: ${input.schemaCount}`,
    `- 기능 수: ${input.featureCount}`,
    `- 스키마 매핑 기능 수: ${input.mappedFeatureCount}`,
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
  const definitionPath = join(runDir, "schema-definition.md");
  const coveragePath = join(runDir, "schema-coverage.json");
  const featureCoveragePath = join(runDir, "feature-coverage.json");
  const validationPath = join(runDir, "schema-definition.validation.json");
  const reviewJsonPath = join(runDir, "schema-definition.review.json");
  const reviewMarkdownPath = join(runDir, "schema-definition-review.md");

  const [definition, coverage, featureCoverage, validation] = await Promise.all([
    readFile(definitionPath, "utf8"),
    readJson<SchemaCoverage>(coveragePath),
    readJson<FeatureCoverage>(featureCoveragePath),
    readJsonIfExists<ValidationResult>(validationPath),
  ]);
  const findings: Finding[] = [];

  if (!validation) {
    findings.push({ severity: "warning", code: "validation-missing", message: "schema-definition.validation.json is missing; run validate-schema-definition.ts first." });
  } else if (!validation.ok) {
    findings.push({ severity: "error", code: "validation-failed", message: `Schema validation failed with ${validation.findings.length} finding(s).` });
  }

  const schemas = coverage.schemas ?? [];
  const featureIds = new Set(featureCoverage.features.map((feature) => feature.featureId));
  const schemaCodes = new Set(schemas.map((schema) => schema.code).filter(nonEmptyString));
  const mappedFeatureIds = new Set<string>();
  const unmappedFeatureIds = new Set((coverage.unmappedFeatures ?? []).map((feature) => feature.featureId).filter(nonEmptyString));

  for (const schema of schemas) {
    if (schema.code && !definition.includes(schema.code)) {
      findings.push({ severity: "error", code: "schema-code-missing-in-md", message: `${schema.code} is present in schema-coverage.json but missing in schema-definition.md.` });
    }
    for (const featureId of schema.sourceFeatureIds ?? []) {
      if (!featureIds.has(featureId)) {
        findings.push({ severity: "error", code: "schema-feature-unknown", message: `${schema.code ?? "schema"} references unknown feature ${featureId}.` });
      } else {
        mappedFeatureIds.add(featureId);
      }
    }
    if ((schema.baseReuseDecision === "REUSE" || schema.baseReuseDecision === "EXTEND") && !(schema.baseDrizzleReferences ?? []).some((ref) => ref.packagePath)) {
      findings.push({ severity: "error", code: "schema-base-ref-missing", message: `${schema.code ?? "schema"} is ${schema.baseReuseDecision} but has no baseDrizzleReferences.` });
    }
    if (schema.baseReuseDecision === "NEW" && (schema.baseDrizzleReferences ?? []).some((ref) => ref.reuseDecision === "REUSE")) {
      findings.push({ severity: "warning", code: "schema-new-with-reuse-ref", message: `${schema.code ?? "schema"} is NEW but includes a REUSE base reference; check decision consistency.` });
    }
    if ((schema.relations ?? []).some((relation) => !/(:|->)/.test(relation))) {
      findings.push({ severity: "warning", code: "schema-relation-weak", message: `${schema.code ?? "schema"} has relations that may not be ERD-convertible.` });
    }
    for (const field of schema.fields ?? []) {
      if (field.name && !definition.includes(field.name)) {
        findings.push({ severity: "warning", code: "schema-field-missing-in-md", message: `${schema.code ?? "schema"}.${field.name} is present in schema-coverage.json but not visible in schema-definition.md.` });
      }
      if (field.defaultValue && !definition.includes(`기본값: ${field.defaultValue}`)) {
        findings.push({ severity: "warning", code: "schema-field-default-missing-in-md", message: `${schema.code ?? "schema"}.${field.name} defaultValue is not visible in Mermaid field comments.` });
      }
    }
  }

  for (const mapping of coverage.featureSchemaMappings ?? []) {
    const featureId = mapping.featureId ?? "";
    if (!featureIds.has(featureId)) {
      findings.push({ severity: "error", code: "mapping-feature-unknown", message: `featureSchemaMappings references unknown feature ${featureId}.` });
    } else {
      mappedFeatureIds.add(featureId);
    }
    for (const schemaCode of mapping.schemaCodes ?? []) {
      if (!schemaCodes.has(schemaCode)) {
        findings.push({ severity: "error", code: "mapping-schema-unknown", message: `${featureId} maps to unknown schema ${schemaCode}.` });
      }
    }
  }

  const uncoveredFeatures = [...featureIds].filter((featureId) => !mappedFeatureIds.has(featureId) && !unmappedFeatureIds.has(featureId));
  if (uncoveredFeatures.length) {
    findings.push({
      severity: "error",
      code: "feature-unmapped",
      message: `${uncoveredFeatures.length} feature(s) are neither mapped to schemas nor explicitly unmapped: ${uncoveredFeatures.join(", ")}.`,
    });
  }

  for (const feature of coverage.unmappedFeatures ?? []) {
    if (!feature.featureId || !featureIds.has(feature.featureId)) {
      findings.push({ severity: "error", code: "unmapped-feature-unknown", message: `unmappedFeatures references unknown feature ${feature.featureId ?? ""}.` });
    }
    if (!feature.reason?.trim()) {
      findings.push({ severity: "error", code: "unmapped-feature-reason-empty", message: `${feature.featureId ?? "unmapped feature"} requires a reason.` });
    }
  }

  findings.push({
    severity: "info",
    code: "schema-coverage-summary",
    message: `${schemas.length} schemas; ${mappedFeatureIds.size}/${featureIds.size} features mapped; ${unmappedFeatureIds.size} features explicitly unmapped.`,
  });

  const projectName = coverage.projectName ?? "project";
  const result = {
    ok: findings.every((finding) => finding.severity !== "error"),
    projectName,
    runDir,
    schemaDefinition: definitionPath,
    schemaCoverage: coveragePath,
    featureCoverage: featureCoveragePath,
    validation: validationPath,
    reviewMarkdown: reviewMarkdownPath,
    schemaCount: schemas.length,
    featureCount: featureIds.size,
    mappedFeatureCount: mappedFeatureIds.size,
    unmappedFeatureCount: unmappedFeatureIds.size,
    findings,
  };

  await writeFile(reviewJsonPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  await writeFile(reviewMarkdownPath, renderReviewMarkdown({
    projectName,
    schemaCount: schemas.length,
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
