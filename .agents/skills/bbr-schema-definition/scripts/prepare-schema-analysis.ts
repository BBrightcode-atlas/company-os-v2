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
  unmappedChunks?: unknown[];
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";
const DEFAULT_PRODUCT_BUILDER_BASE = "../product-builder-base";
const DRIZZLE_SCHEMA_ROOT = "packages/drizzle/src/schema";
const DRIZZLE_SCHEMA_INDEX = `${DRIZZLE_SCHEMA_ROOT}/index.ts`;
const REUSE_DECISIONS = ["REUSE", "EXTEND", "NEW", "N/A", "UNDECIDED"];

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/prepare-schema-analysis.ts --project-name aiga",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/prepare-schema-analysis.ts --run-dir ./generated/source-intake/aiga/runs/<run>",
    "  PRODUCT_BUILDER_BASE=../product-builder-base node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/prepare-schema-analysis.ts --project-name aiga",
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
      outDir: resolve(args.outDir ?? join(runDir, "schema-definition-work")),
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
    outDir: resolve(args.outDir ?? join(runDir, "schema-definition-work")),
  };
}

async function walkFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath));
    } else if (entry.isFile() && /\.ts$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function baseDrizzleFiles(baseRepoPath: string): Promise<Array<{ path: string; kind: string }>> {
  try {
    const root = join(baseRepoPath, DRIZZLE_SCHEMA_ROOT);
    const files = await walkFiles(root);
    return files.map((file) => {
      const packagePath = relative(baseRepoPath, file);
      let kind = "barrel";
      if (packagePath.includes("/core/")) kind = "core";
      else if (packagePath.includes("/features/")) kind = "feature";
      return { path: packagePath, kind };
    }).sort((left, right) => left.path.localeCompare(right.path));
  } catch (error) {
    console.warn(`[warn] Could not index product-builder-base Drizzle files: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

function renderWorkflow(input: {
  projectName: string;
  selectedAreas: string[];
  featureCount: number;
  baseDrizzleFileCount: number;
}): string {
  return [
    `# Schema Definition Workflow - ${input.projectName}`,
    "",
    "## Inputs",
    "",
    "- `feature-definition.md`",
    "- `feature-coverage.json`",
    "- `source-material.md`",
    "- `feature-definition-work/feature-analysis-input.json`",
    "",
    "## Selected Scope",
    "",
    `- selected areas: ${input.selectedAreas.join(", ") || "(none)"}`,
    `- feature groups: ${input.featureCount}`,
    `- product-builder-base Drizzle files indexed in input: ${input.baseDrizzleFileCount}`,
    "",
    "## Steps",
    "",
    "1. Read `schema-analysis-input.json` completely.",
    "2. Extract data entities from feature groups. Do not create schemas for pure screens unless persisted data or workflow state is required.",
    "3. Merge duplicate entities across features and assign stable `SCH-###` codes.",
    "4. Write fields with `name`, `type`, `required`, and `description`; put PK/FK/UK and validation details in `validation`.",
    "5. Write ERD-convertible relations such as `users 1:N community_posts` and `doctorProfileId -> doctor_profiles.id`.",
    `6. Compare with product-builder-base Drizzle schema at \`${DRIZZLE_SCHEMA_INDEX}\`, core/*, and features/*.`,
    `7. Use only reuse decisions: ${REUSE_DECISIONS.join(", ")}.`,
    "8. Write the first draft `schema-definition.md` with ERD first, then feature ERD, then reuse/migration tables.",
    "9. Write the first draft `schema-coverage.json` with schemas, featureSchemaMappings, and unmappedFeatures.",
    "10. Run validation and review scripts.",
    "11. Perform agent semantic self-review against feature-definition and schema coverage.",
    "12. Patch `schema-definition.md` and `schema-coverage.json` for every validation, scripted review, and semantic self-review finding that is not intentionally accepted.",
    "13. Append the iteration summary to `schema-definition-loop.md`.",
    "14. Rerun validation and review after the patch.",
    "15. Stop only when the current on-disk schema-definition/coverage files are the post-review revised artifacts and validation/review have no unresolved findings.",
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
  const sourceMaterialPath = join(run.runDir, "source-material.md");
  const featureAnalysisInputPath = join(run.runDir, "feature-definition-work", "feature-analysis-input.json");

  const [featureDefinition, featureCoverage, baseFiles] = await Promise.all([
    readFile(featureDefinitionPath, "utf8"),
    readJson<FeatureCoverage>(featureCoveragePath),
    baseDrizzleFiles(baseRepo.absolutePath),
  ]);

  await mkdir(run.outDir, { recursive: true });

  const payload = {
    projectName: run.projectName,
    runDir: run.runDir,
    sourceMaterial: sourceMaterialPath,
    featureDefinition: featureDefinitionPath,
    featureCoverage: featureCoveragePath,
    featureAnalysisInput: featureAnalysisInputPath,
    outputFiles: {
      schemaDefinition: join(run.runDir, "schema-definition.md"),
      schemaCoverage: join(run.runDir, "schema-coverage.json"),
    },
    selectedAreas: featureCoverage.selectedAreas ?? [],
    reuseDecisions: REUSE_DECISIONS,
    productBuilderBase: {
      repoPath: baseRepo.inputPath,
      drizzleSchemaIndex: DRIZZLE_SCHEMA_INDEX,
      drizzleSchemaRoot: DRIZZLE_SCHEMA_ROOT,
      drizzleFiles: baseFiles,
    },
    featureDefinitionExcerpt: featureDefinition.slice(0, 12000),
    features: featureCoverage.features.map((feature) => ({
      featureId: feature.featureId,
      featureName: feature.featureName,
      areas: feature.areas,
      sourceChunks: feature.sourceChunks,
      featureReuse: feature.reuse ?? null,
    })),
    rules: [
      "Schema Definition must be based on feature-definition, not PRD prose.",
      "Every schema must have code, name, tableName, drizzleExportName, description, fields, sourceFeatureIds, baseReuseDecision, migrationScope, implementationNotes, and acceptanceCriteria.",
      "Every field must have name, type, required, and description.",
      "Every feature must be mapped to one or more schemas or explicitly listed in unmappedFeatures with reason.",
      "Use ERD as the primary declaration; do not rely only on per-table field lists.",
      "Do not define REST API endpoints here.",
      "The final schema deliverables must already include review-driven fixes; do not leave fixes only in schema-definition-review.md.",
    ],
  };

  const analysisPath = join(run.outDir, "schema-analysis-input.json");
  const workflowPath = join(run.outDir, "schema-workflow.md");
  await writeFile(analysisPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  await writeFile(workflowPath, renderWorkflow({
    projectName: run.projectName,
    selectedAreas: payload.selectedAreas,
    featureCount: payload.features.length,
    baseDrizzleFileCount: baseFiles.length,
  }), "utf8");

  console.log(JSON.stringify({
    ok: true,
    projectName: run.projectName,
    runDir: run.runDir,
    outDir: run.outDir,
    featureCount: payload.features.length,
    baseDrizzleFileCount: baseFiles.length,
    analysisInput: analysisPath,
    workflow: workflowPath,
    schemaDefinition: payload.outputFiles.schemaDefinition,
    schemaCoverage: payload.outputFiles.schemaCoverage,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
