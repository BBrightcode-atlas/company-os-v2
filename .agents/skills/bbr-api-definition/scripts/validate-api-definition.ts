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

type FeatureCoverage = {
  features?: Array<{ featureId?: string; featureName?: string }>;
};

type SchemaCoverage = {
  schemas?: Array<{ code?: string; name?: string }>;
};

type ApiCoverage = {
  projectName?: string;
  apis?: Array<{
    code?: string;
    method?: string;
    path?: string;
    operationId?: string;
    summary?: string;
    actor?: string;
    auth?: string;
    sourceFeatureCodes?: string[];
    schemaCodes?: string[];
    baseReuseDecision?: string;
    baseFeatureReferences?: Array<{ controllerPath?: string; servicePath?: string; dtoPath?: string; reuseDecision?: string }>;
    auditAction?: string;
    errors?: Array<{ code?: string; condition?: string }>;
    acceptanceCriteria?: string[];
  }>;
  featureApiMappings?: Array<{
    featureId?: string;
    featureName?: string;
    apiCodes?: string[];
    defaultDecision?: string;
    baseFeatureApiCandidates?: string[];
  }>;
  schemaApiMappings?: Array<{
    schemaCode?: string;
    schemaName?: string;
    apiCodes?: string[];
  }>;
  unmappedFeatures?: Array<{ featureId?: string; reason?: string }>;
};

type OpenApiOperation = {
  operationId?: string;
  summary?: string;
  tags?: string[];
  responses?: Record<string, unknown>;
  security?: Array<Record<string, unknown>>;
  "x-api-code"?: string;
  "x-domain-tag"?: string;
  "x-feature-codes"?: string[];
  "x-schema-codes"?: string[];
  "x-base-reuse-decision"?: string;
  "x-base-feature-references"?: unknown[];
  "x-audit-action"?: string;
  "x-actor"?: string;
  "x-required-role"?: string;
};

type OpenApiSpec = {
  openapi?: string;
  info?: unknown;
  tags?: Array<{ name?: string; description?: string }>;
  paths?: Record<string, Record<string, OpenApiOperation>>;
  components?: {
    securitySchemes?: Record<string, unknown>;
    schemas?: Record<string, unknown>;
  };
};

type Finding = {
  severity: "error" | "warning";
  code: string;
  message: string;
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";
const REUSE_DECISIONS = new Set(["REUSE", "EXTEND", "NEW", "N/A", "UNDECIDED"]);
const METHODS = new Set(["get", "post", "put", "patch", "delete"]);
const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/validate-api-definition.ts --project-name aiga",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/validate-api-definition.ts --run-dir ./generated/source-intake/aiga/runs/<run>",
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

function operationKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

function featureLabel(featureCoverage: FeatureCoverage, featureId: string): string {
  const feature = (featureCoverage.features ?? []).find((item) => item.featureId === featureId);
  return feature?.featureName ? `${featureId} ${feature.featureName}` : featureId;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const runDir = await resolveRunDir(args);
  const openapiJsonPath = join(runDir, "api-definition.openapi.json");
  const openapiYamlPath = join(runDir, "api-definition.openapi.yaml");
  const definitionPath = join(runDir, "api-definition.md");
  const coveragePath = join(runDir, "api-coverage.json");
  const featureCoveragePath = join(runDir, "feature-coverage.json");
  const schemaCoveragePath = join(runDir, "schema-coverage.json");
  const validationPath = join(runDir, "api-definition.validation.json");

  const [openapi, yaml, definition, coverage, featureCoverage, schemaCoverage] = await Promise.all([
    readJson<OpenApiSpec>(openapiJsonPath),
    readFile(openapiYamlPath, "utf8"),
    readFile(definitionPath, "utf8"),
    readJson<ApiCoverage>(coveragePath),
    readJson<FeatureCoverage>(featureCoveragePath),
    readJson<SchemaCoverage>(schemaCoveragePath),
  ]);
  const findings: Finding[] = [];

  if (openapi.openapi !== "3.1.0") {
    findings.push({ severity: "error", code: "openapi-version-invalid", message: "api-definition.openapi.json must use openapi 3.1.0." });
  }
  if (!openapi.info) {
    findings.push({ severity: "error", code: "openapi-info-missing", message: "OpenAPI info is required." });
  }
  if (!openapi.components?.securitySchemes?.bearerAuth) {
    findings.push({ severity: "error", code: "bearer-auth-missing", message: "components.securitySchemes.bearerAuth is required." });
  }
  if (!openapi.components?.schemas || Object.keys(openapi.components.schemas).length === 0) {
    findings.push({ severity: "error", code: "components-schemas-empty", message: "OpenAPI components.schemas must not be empty." });
  }
  if (!openapi.paths || Object.keys(openapi.paths).length === 0) {
    findings.push({ severity: "error", code: "paths-empty", message: "OpenAPI paths must not be empty." });
  }
  if (!yaml.includes("openapi: 3.1.0")) {
    findings.push({ severity: "error", code: "yaml-openapi-missing", message: "api-definition.openapi.yaml must visibly include openapi: 3.1.0." });
  }
  if (!definition.includes("# REST API 정의서(REST API Definition)")) {
    findings.push({ severity: "error", code: "markdown-title-missing", message: "api-definition.md title is missing." });
  }

  const featureIds = new Set((featureCoverage.features ?? []).map((feature) => feature.featureId).filter(nonEmptyString));
  const featureLabels = new Set((featureCoverage.features ?? []).map((feature) => feature.featureId && feature.featureName ? `${feature.featureId} ${feature.featureName}` : "").filter(nonEmptyString));
  const schemaCodes = new Set((schemaCoverage.schemas ?? []).map((schema) => schema.code).filter(nonEmptyString));
  const apis = coverage.apis ?? [];
  if (!apis.length) {
    findings.push({ severity: "error", code: "coverage-apis-empty", message: "api-coverage.json must include one or more apis." });
  }

  const operationByCode = new Map<string, { method: string; path: string; operation: OpenApiOperation }>();
  if (!Array.isArray(openapi.tags) || openapi.tags.length === 0) {
    findings.push({ severity: "error", code: "openapi-feature-tags-empty", message: "OpenAPI top-level tags must include feature tags." });
  } else {
    const unknownTags = openapi.tags.map((tag) => tag.name).filter(nonEmptyString).filter((name) => !featureLabels.has(name));
    if (unknownTags.length) {
      findings.push({ severity: "error", code: "openapi-tag-not-feature", message: `OpenAPI top-level tags must be feature labels only; invalid tag(s): ${unknownTags.join(", ")}.` });
    }
    const missingFeatureTags = [...featureLabels].filter((label) => !openapi.tags?.some((tag) => tag.name === label));
    if (missingFeatureTags.length) {
      findings.push({ severity: "error", code: "openapi-feature-tag-missing", message: `OpenAPI top-level tags are missing feature label(s): ${missingFeatureTags.join(", ")}.` });
    }
  }
  for (const [path, pathItem] of Object.entries(openapi.paths ?? {})) {
    if (!path.startsWith("/api/") && path !== "/api") {
      findings.push({ severity: "error", code: "path-prefix-invalid", message: `${path} must start with /api.` });
    }
    if (path.includes("ai-runtime")) {
      findings.push({ severity: "error", code: "ai-runtime-path-forbidden", message: `${path} must not define internal ai-runtime API.` });
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!METHODS.has(method)) {
        findings.push({ severity: "error", code: "method-invalid", message: `${method.toUpperCase()} ${path} is not a supported REST method.` });
        continue;
      }
      const label = operationKey(method, path);
      if (!nonEmptyString(operation.operationId)) findings.push({ severity: "error", code: "operation-id-missing", message: `${label} operationId is required.` });
      if (!nonEmptyString(operation.summary)) findings.push({ severity: "error", code: "summary-missing", message: `${label} summary is required.` });
      if (!nonEmptyStringArray(operation.tags)) findings.push({ severity: "error", code: "tags-missing", message: `${label} tags are required.` });
      if (nonEmptyStringArray(operation.tags)) {
        const nonFeatureTags = operation.tags.filter((tag) => !featureLabels.has(tag));
        if (nonFeatureTags.length) {
          findings.push({ severity: "error", code: "operation-tag-not-feature", message: `${label} has non-feature tag(s): ${nonFeatureTags.join(", ")}.` });
        }
      }
      if (!nonEmptyString(operation["x-domain-tag"])) {
        findings.push({ severity: "error", code: "x-domain-tag-missing", message: `${label} x-domain-tag is required for domain navigation.` });
      }
      if (!operation.responses || Object.keys(operation.responses).length === 0) findings.push({ severity: "error", code: "responses-missing", message: `${label} responses are required.` });
      if (!/^API-\d{3}$/.test(operation["x-api-code"] ?? "")) {
        findings.push({ severity: "error", code: "x-api-code-invalid", message: `${label} x-api-code must match API-###.` });
      }
      if (!nonEmptyStringArray(operation["x-feature-codes"])) {
        findings.push({ severity: "error", code: "x-feature-codes-missing", message: `${label} x-feature-codes must include one or more feature ids.` });
      } else {
        const unknown = operation["x-feature-codes"].filter((featureId) => !featureIds.has(featureId));
        if (unknown.length) findings.push({ severity: "error", code: "x-feature-codes-unknown", message: `${label} references unknown feature(s): ${unknown.join(", ")}.` });
        const missingOperationTags = operation["x-feature-codes"]
          .map((featureId) => featureLabel(featureCoverage, featureId))
          .filter((tag) => !(operation.tags ?? []).includes(tag));
        if (missingOperationTags.length) {
          findings.push({ severity: "error", code: "operation-feature-tag-missing", message: `${label} tags must include feature label(s): ${missingOperationTags.join(", ")}.` });
        }
      }
      if (!Array.isArray(operation["x-schema-codes"])) {
        findings.push({ severity: "error", code: "x-schema-codes-missing", message: `${label} x-schema-codes must be an array.` });
      } else {
        const unknown = operation["x-schema-codes"].filter((schemaCode) => !schemaCodes.has(schemaCode));
        if (unknown.length) findings.push({ severity: "error", code: "x-schema-codes-unknown", message: `${label} references unknown schema(s): ${unknown.join(", ")}.` });
      }
      if (!operation["x-base-reuse-decision"] || !REUSE_DECISIONS.has(operation["x-base-reuse-decision"])) {
        findings.push({ severity: "error", code: "x-reuse-decision-invalid", message: `${label} x-base-reuse-decision is invalid.` });
      }
      if (!Array.isArray(operation["x-base-feature-references"])) {
        findings.push({ severity: "error", code: "x-base-feature-references-invalid", message: `${label} x-base-feature-references must be an array.` });
      }
      if (path.startsWith("/api/admin/") && MUTATING_METHODS.has(method) && (!operation["x-audit-action"] || operation["x-audit-action"] === "none")) {
        findings.push({ severity: "error", code: "admin-mutating-audit-missing", message: `${label} is an admin mutation and requires x-audit-action.` });
      }
      if (path.startsWith("/api/admin/") && operation["x-required-role"] !== "admin") {
        findings.push({ severity: "warning", code: "admin-role-missing", message: `${label} should include x-required-role: admin.` });
      }
      if (operation["x-api-code"]) {
        if (operationByCode.has(operation["x-api-code"])) {
          findings.push({ severity: "error", code: "x-api-code-duplicate", message: `${operation["x-api-code"]} is used by multiple operations.` });
        }
        operationByCode.set(operation["x-api-code"], { method, path, operation });
      }
    }
  }

  const seenCoverageCodes = new Set<string>();
  const mappedFeatures = new Set<string>();
  for (const [index, api] of apis.entries()) {
    const label = api.code || `apis[${index}]`;
    if (!/^API-\d{3}$/.test(api.code ?? "")) {
      findings.push({ severity: "error", code: "api-code-invalid", message: `${label} code must match API-###.` });
    }
    if (api.code && seenCoverageCodes.has(api.code)) {
      findings.push({ severity: "error", code: "api-code-duplicate", message: `${api.code} is duplicated in api-coverage.json.` });
    }
    if (api.code) seenCoverageCodes.add(api.code);

    if (!nonEmptyString(api.method)) findings.push({ severity: "error", code: "api-method-missing", message: `${label}.method is required.` });
    if (!nonEmptyString(api.path)) findings.push({ severity: "error", code: "api-path-missing", message: `${label}.path is required.` });
    if (!nonEmptyString(api.operationId)) findings.push({ severity: "error", code: "api-operation-id-missing", message: `${label}.operationId is required.` });
    if (!nonEmptyString(api.summary)) findings.push({ severity: "error", code: "api-summary-missing", message: `${label}.summary is required.` });
    if (!nonEmptyString(api.actor)) findings.push({ severity: "error", code: "api-actor-missing", message: `${label}.actor is required.` });
    if (!nonEmptyString(api.auth)) findings.push({ severity: "error", code: "api-auth-missing", message: `${label}.auth is required.` });
    if (!api.baseReuseDecision || !REUSE_DECISIONS.has(api.baseReuseDecision)) {
      findings.push({ severity: "error", code: "api-reuse-decision-invalid", message: `${label}.baseReuseDecision is invalid.` });
    }
    if ((api.baseReuseDecision === "REUSE" || api.baseReuseDecision === "EXTEND") && !(api.baseFeatureReferences ?? []).some((ref) => ref.controllerPath || ref.servicePath || ref.dtoPath)) {
      findings.push({ severity: "error", code: "api-base-ref-required", message: `${label} must include concrete baseFeatureReferences for ${api.baseReuseDecision}.` });
    }
    if (!nonEmptyStringArray(api.sourceFeatureCodes)) {
      findings.push({ severity: "error", code: "api-feature-codes-empty", message: `${label}.sourceFeatureCodes must include one or more FEA ids.` });
    } else {
      for (const featureId of api.sourceFeatureCodes) {
        if (!featureIds.has(featureId)) {
          findings.push({ severity: "error", code: "api-feature-code-unknown", message: `${label} references unknown feature ${featureId}.` });
        } else {
          mappedFeatures.add(featureId);
        }
      }
    }
    if (!Array.isArray(api.schemaCodes)) {
      findings.push({ severity: "error", code: "api-schema-codes-invalid", message: `${label}.schemaCodes must be an array.` });
    } else {
      const unknownSchemas = api.schemaCodes.filter((schemaCode) => !schemaCodes.has(schemaCode));
      if (unknownSchemas.length) findings.push({ severity: "error", code: "api-schema-code-unknown", message: `${label} references unknown schema(s): ${unknownSchemas.join(", ")}.` });
    }
    const operation = api.code ? operationByCode.get(api.code) : undefined;
    if (!operation) {
      findings.push({ severity: "error", code: "api-code-missing-in-openapi", message: `${label} is present in api-coverage.json but missing in OpenAPI.` });
    } else {
      if (operation.method.toUpperCase() !== api.method?.toUpperCase() || operation.path !== api.path) {
        findings.push({ severity: "error", code: "api-openapi-mismatch", message: `${label} coverage method/path does not match OpenAPI.` });
      }
    }
    if (!Array.isArray(api.errors) || api.errors.length === 0) {
      findings.push({ severity: "warning", code: "api-errors-empty", message: `${label}.errors should include expected error responses.` });
    }
    if (!nonEmptyStringArray(api.acceptanceCriteria)) {
      findings.push({ severity: "warning", code: "api-acceptance-empty", message: `${label}.acceptanceCriteria should include one or more entries.` });
    }
  }

  const apiCodes = new Set(apis.map((api) => api.code).filter(nonEmptyString));
  for (const mapping of coverage.featureApiMappings ?? []) {
    if (!mapping.featureId || !featureIds.has(mapping.featureId)) {
      findings.push({ severity: "error", code: "feature-api-mapping-unknown", message: `featureApiMappings references unknown feature ${mapping.featureId ?? ""}.` });
    }
    if (!nonEmptyStringArray(mapping.apiCodes)) {
      findings.push({ severity: "error", code: "feature-api-codes-empty", message: `${mapping.featureId ?? "feature mapping"} must include apiCodes.` });
    } else {
      const unknown = mapping.apiCodes.filter((apiCode) => !apiCodes.has(apiCode));
      if (unknown.length) findings.push({ severity: "error", code: "feature-api-code-unknown", message: `${mapping.featureId ?? "feature mapping"} references unknown API(s): ${unknown.join(", ")}.` });
    }
    if (mapping.defaultDecision && !REUSE_DECISIONS.has(mapping.defaultDecision)) {
      findings.push({ severity: "error", code: "feature-api-decision-invalid", message: `${mapping.featureId ?? "feature mapping"}.defaultDecision is invalid.` });
    }
  }

  for (const mapping of coverage.schemaApiMappings ?? []) {
    if (!mapping.schemaCode || !schemaCodes.has(mapping.schemaCode)) {
      findings.push({ severity: "error", code: "schema-api-mapping-unknown", message: `schemaApiMappings references unknown schema ${mapping.schemaCode ?? ""}.` });
    }
    if (!nonEmptyStringArray(mapping.apiCodes)) {
      findings.push({ severity: "error", code: "schema-api-codes-empty", message: `${mapping.schemaCode ?? "schema mapping"} must include apiCodes.` });
    } else {
      const unknown = mapping.apiCodes.filter((apiCode) => !apiCodes.has(apiCode));
      if (unknown.length) findings.push({ severity: "error", code: "schema-api-code-unknown", message: `${mapping.schemaCode ?? "schema mapping"} references unknown API(s): ${unknown.join(", ")}.` });
    }
  }

  const unmappedFeatureIds = new Set((coverage.unmappedFeatures ?? []).map((feature) => feature.featureId).filter(nonEmptyString));
  const uncoveredFeatures = [...featureIds].filter((featureId) => !mappedFeatures.has(featureId) && !unmappedFeatureIds.has(featureId));
  if (uncoveredFeatures.length) {
    findings.push({ severity: "error", code: "feature-unmapped", message: `${uncoveredFeatures.length} feature(s) are neither mapped to APIs nor explicitly unmapped: ${uncoveredFeatures.join(", ")}.` });
  }
  for (const feature of coverage.unmappedFeatures ?? []) {
    if (!feature.featureId || !featureIds.has(feature.featureId)) {
      findings.push({ severity: "error", code: "unmapped-feature-unknown", message: `unmappedFeatures references unknown feature ${feature.featureId ?? ""}.` });
    }
    if (!feature.reason?.trim()) {
      findings.push({ severity: "error", code: "unmapped-feature-reason-empty", message: `${feature.featureId ?? "unmapped feature"} requires a reason.` });
    }
  }

  const aiChatApis = apis.filter((api) => api.sourceFeatureCodes?.includes("FEA-023"));
  if (!aiChatApis.length) {
    findings.push({ severity: "error", code: "external-ai-api-missing", message: "FEA-023 external AI chat must be represented by at least one API operation." });
  }
  for (const api of aiChatApis) {
    const openapiOperation = api.code ? operationByCode.get(api.code)?.operation : undefined;
    const asText = JSON.stringify({ api, openapiOperation }).toLowerCase();
    if (asText.includes("ai-runtime")) {
      findings.push({ severity: "error", code: "external-ai-runtime-leak", message: `${api.code ?? "AI API"} mentions ai-runtime; use external REST integration only.` });
    }
    if (!asText.includes("external rest") && !asText.includes("외부 rest")) {
      findings.push({ severity: "warning", code: "external-ai-rest-note-missing", message: `${api.code ?? "AI API"} should explicitly say it calls an external REST API.` });
    }
  }

  const result = {
    ok: findings.every((finding) => finding.severity !== "error"),
    openapiYaml: openapiYamlPath,
    openapiJson: openapiJsonPath,
    apiDefinition: definitionPath,
    apiCoverage: coveragePath,
    apiCount: apis.length,
    pathCount: Object.keys(openapi.paths ?? {}).length,
    mappedFeatureCount: mappedFeatures.size,
    featureCount: featureIds.size,
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
