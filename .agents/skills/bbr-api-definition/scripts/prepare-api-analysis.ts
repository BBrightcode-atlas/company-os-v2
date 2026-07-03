import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import process from "node:process";

type CliArgs = {
  projectName?: string;
  runDir?: string;
  outDir?: string;
  baseRepoPath?: string;
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
    sourceChunks: string[];
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
    baseReuseDecision?: string;
    baseDrizzleReferences?: Array<{ packagePath?: string; exportName?: string; tableName?: string }>;
  }>;
  featureSchemaMappings?: Array<{
    featureId?: string;
    featureName?: string;
    schemaCodes?: string[];
    defaultDecision?: string;
    baseDrizzleCandidates?: string[];
  }>;
};

type BaseControllerEndpoint = {
  packagePath: string;
  controllerPath: string;
  controllerBasePath: string;
  method: string;
  path: string;
  line: number;
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";
const DEFAULT_PRODUCT_BUILDER_BASE = "../product-builder-base";
const BASE_FEATURE_ROOT = "packages/features";
const REUSE_DECISIONS = ["REUSE", "EXTEND", "NEW", "N/A", "UNDECIDED"];

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/prepare-api-analysis.ts --project-name aiga",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/prepare-api-analysis.ts --run-dir ./generated/source-intake/aiga/runs/<run>",
    "  PRODUCT_BUILDER_BASE=../product-builder-base node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-api-definition/scripts/prepare-api-analysis.ts --project-name aiga",
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

async function resolveRun(args: CliArgs): Promise<{ projectName: string; runDir: string; outDir: string }> {
  if (args.runDir) {
    const runDir = resolve(args.runDir);
    return {
      projectName: args.projectName ?? (basename(dirname(dirname(runDir))) || "project"),
      runDir,
      outDir: resolve(args.outDir ?? join(runDir, "api-definition-work")),
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
    outDir: resolve(args.outDir ?? join(runDir, "api-definition-work")),
  };
}

async function walkTsFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkTsFiles(fullPath));
    } else if (entry.isFile() && /\.ts$/.test(entry.name) && !/\.spec\.ts$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function stringLiteralFromDecorator(text: string): string {
  const match = text.match(/@Controller\((["'`])([^"'`]*)\1\)/);
  return match?.[2] ?? "";
}

function endpointPath(basePath: string, methodPath: string): string {
  const joined = ["/api", basePath, methodPath]
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return `/${joined}`.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

async function baseControllerEndpoints(baseRepoPath: string): Promise<BaseControllerEndpoint[]> {
  try {
    const controllerRoot = join(baseRepoPath, BASE_FEATURE_ROOT);
    const files = (await walkTsFiles(controllerRoot)).filter((file) => file.includes("/controller/"));
    const endpoints: BaseControllerEndpoint[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      const packagePath = relative(baseRepoPath, dirname(dirname(file)));
      const controllerBasePath = stringLiteralFromDecorator(source);
      const lines = source.split(/\r?\n/);
      for (const [index, line] of lines.entries()) {
        const match = line.match(/@(Get|Post|Put|Patch|Delete)\((?:(["'`])([^"'`]*)\2)?\)/);
        if (!match) continue;
        const methodPath = match[3] ?? "";
        endpoints.push({
          packagePath,
          controllerPath: relative(baseRepoPath, file),
          controllerBasePath,
          method: match[1].toUpperCase(),
          path: endpointPath(controllerBasePath, methodPath),
          line: index + 1,
        });
      }
    }
    return endpoints.sort((left, right) => `${left.path}:${left.method}`.localeCompare(`${right.path}:${right.method}`));
  } catch (error) {
    console.warn(`[warn] Could not index product-builder-base controller endpoints: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

function renderWorkflow(input: {
  projectName: string;
  selectedAreas: string[];
  featureCount: number;
  schemaCount: number;
  baseEndpointCount: number;
}): string {
  return [
    `# API Definition Workflow - ${input.projectName}`,
    "",
    "## Inputs",
    "",
    "- `feature-definition.md`",
    "- `feature-coverage.json`",
    "- `feature-definition-scope.json`",
    "- `schema-definition.md`",
    "- `schema-coverage.json`",
    "- `source-material.md`",
    "",
    "## Selected Scope",
    "",
    `- selected areas: ${input.selectedAreas.join(", ") || "(none)"}`,
    `- feature groups: ${input.featureCount}`,
    `- schema count: ${input.schemaCount}`,
    `- product-builder-base controller endpoints indexed in input: ${input.baseEndpointCount}`,
    "",
    "## Steps",
    "",
    "1. Read `api-analysis-input.json` completely.",
    "2. Extract REST operations from feature groups. Do not create one API per screen event.",
    "3. Merge duplicate operations across features and assign stable `API-###` codes.",
    "4. Connect every operation to `FEA-###` feature codes and persisted operations to `SCH-###` schema codes.",
    "5. Compare operations against product-builder-base controllers/services/dtos.",
    `6. Use only reuse decisions: ${REUSE_DECISIONS.join(", ")}.`,
    "7. Write the first draft `api-definition.openapi.yaml` as OpenAPI 3.1 with traceability extensions.",
    "8. Write the first draft `api-definition.md` as a readable index; do not replace OpenAPI with Markdown tables.",
    "9. Write the first draft `api-coverage.json` with APIs, featureApiMappings, schemaApiMappings, and unmappedFeatures.",
    "10. Run validation and review scripts.",
    "11. Perform agent semantic self-review against feature/schema definitions and API coverage.",
    "12. Patch `api-definition.openapi.yaml`, `api-definition.openapi.json`, `api-definition.md`, and `api-coverage.json` for every validation, scripted review, and semantic self-review finding that is not intentionally accepted.",
    "13. Append the iteration summary to `api-definition-loop.md`.",
    "14. Rerun validation and review after the patch.",
    "15. Stop only when the current on-disk OpenAPI/coverage/Markdown files are the post-review revised artifacts and validation/review have no unresolved findings.",
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
  const scopePath = join(run.runDir, "feature-definition-scope.json");
  const schemaDefinitionPath = join(run.runDir, "schema-definition.md");
  const schemaCoveragePath = join(run.runDir, "schema-coverage.json");
  const sourceMaterialPath = join(run.runDir, "source-material.md");

  const [featureDefinition, featureCoverage, schemaCoverage, baseEndpoints] = await Promise.all([
    readFile(featureDefinitionPath, "utf8"),
    readJson<FeatureCoverage>(featureCoveragePath),
    readJson<SchemaCoverage>(schemaCoveragePath),
    baseControllerEndpoints(baseRepo.absolutePath),
  ]);

  await mkdir(run.outDir, { recursive: true });

  const payload = {
    projectName: run.projectName,
    runDir: run.runDir,
    sourceMaterial: sourceMaterialPath,
    featureDefinition: featureDefinitionPath,
    featureCoverage: featureCoveragePath,
    featureDefinitionScope: scopePath,
    schemaDefinition: schemaDefinitionPath,
    schemaCoverage: schemaCoveragePath,
    outputFiles: {
      openapiYaml: join(run.runDir, "api-definition.openapi.yaml"),
      openapiJson: join(run.runDir, "api-definition.openapi.json"),
      apiDefinition: join(run.runDir, "api-definition.md"),
      apiCoverage: join(run.runDir, "api-coverage.json"),
    },
    selectedAreas: featureCoverage.selectedAreas ?? [],
    extraContext: featureCoverage.extraContext ?? "",
    reuseDecisions: REUSE_DECISIONS,
    productBuilderBase: {
      repoPath: baseRepo.inputPath,
      featureRoot: BASE_FEATURE_ROOT,
      controllerEndpoints: baseEndpoints,
    },
    featureDefinitionExcerpt: featureDefinition.slice(0, 12000),
    features: featureCoverage.features.map((feature) => ({
      featureId: feature.featureId,
      featureName: feature.featureName,
      areas: feature.areas,
      sourceChunks: feature.sourceChunks,
      featureReuse: feature.reuse ?? null,
    })),
    schemas: (schemaCoverage.schemas ?? []).map((schema) => ({
      schemaCode: schema.code,
      schemaName: schema.name,
      tableName: schema.tableName,
      sourceFeatureIds: schema.sourceFeatureIds ?? [],
      baseReuseDecision: schema.baseReuseDecision,
      baseDrizzleReferences: schema.baseDrizzleReferences ?? [],
    })),
    featureSchemaMappings: schemaCoverage.featureSchemaMappings ?? [],
    rules: [
      "API Definition must be based on feature-definition and schema-definition.",
      "OpenAPI is the primary output. Markdown is only an index/review artifact.",
      "Every operation must have API code, operationId, method, path, feature codes, schema codes, reuse decision, auth, responses, and errors.",
      "Every feature must be mapped to one or more APIs or explicitly listed in unmappedFeatures with reason.",
      "Admin mutating endpoints must have an audit action.",
      "Do not define internal ai-runtime endpoints for projects whose selected scope excludes ai-runtime.",
      "The final API deliverables must already include review-driven fixes; do not leave fixes only in api-definition-review.md.",
    ],
  };

  const analysisPath = join(run.outDir, "api-analysis-input.json");
  const workflowPath = join(run.outDir, "api-workflow.md");
  await writeFile(analysisPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  await writeFile(workflowPath, renderWorkflow({
    projectName: run.projectName,
    selectedAreas: payload.selectedAreas,
    featureCount: payload.features.length,
    schemaCount: payload.schemas.length,
    baseEndpointCount: baseEndpoints.length,
  }), "utf8");

  console.log(JSON.stringify({
    ok: true,
    projectName: run.projectName,
    runDir: run.runDir,
    outDir: run.outDir,
    featureCount: payload.features.length,
    schemaCount: payload.schemas.length,
    baseEndpointCount: baseEndpoints.length,
    analysisInput: analysisPath,
    workflow: workflowPath,
    openapiYaml: payload.outputFiles.openapiYaml,
    apiCoverage: payload.outputFiles.apiCoverage,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
