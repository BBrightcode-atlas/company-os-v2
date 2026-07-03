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

type SchemaField = {
  name?: string;
  type?: string;
  required?: boolean;
  description?: string;
  defaultValue?: string;
  validation?: string;
  example?: string;
};

type BaseDrizzleReference = {
  packagePath?: string;
  exportName?: string;
  tableName?: string;
  reuseDecision?: string;
  note?: string;
};

type SchemaCoverage = {
  projectName?: string;
  schemas?: Array<{
    code?: string;
    name?: string;
    tableName?: string;
    drizzleExportName?: string;
    description?: string;
    owner?: string;
    sourceFeatureIds?: string[];
    sourceChunks?: string[];
    baseReuseDecision?: string;
    baseDrizzleReferences?: BaseDrizzleReference[];
    fields?: SchemaField[];
    relations?: string[];
    indexes?: string[];
    enums?: string[];
    migrationScope?: string[];
    implementationNotes?: string[];
    acceptanceCriteria?: string[];
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
  severity: "error" | "warning";
  code: string;
  message: string;
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";
const REUSE_DECISIONS = new Set(["REUSE", "EXTEND", "NEW", "N/A", "UNDECIDED"]);
const REQUIRED_MARKDOWN_SECTIONS = [
  "# 스키마 정의서(Schema Definition)",
  "## 1. 전체 ERD(Mermaid Entity Relationship Diagram)",
  "## 2. 기능별 ERD(Feature ERD)",
  "### 3.1 기능 기준 스키마 매핑(Feature-to-Schema Matrix)",
  "### 3.3 기준 코드베이스(Base Drizzle Baseline)",
  "### 3.4 스키마별 참고/재사용/마이그레이션(Per-Schema Reference & Reuse)",
  "### 3.5 Mermaid 스키마 필드 정의(Type, Name, Description, Default)",
];

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/validate-schema-definition.ts --project-name aiga",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-schema-definition/scripts/validate-schema-definition.ts --run-dir ./generated/source-intake/aiga/runs/<run>",
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const runDir = await resolveRunDir(args);
  const definitionPath = join(runDir, "schema-definition.md");
  const coveragePath = join(runDir, "schema-coverage.json");
  const validationPath = join(runDir, "schema-definition.validation.json");
  const definition = await readFile(definitionPath, "utf8");
  const coverage = await readJson<SchemaCoverage>(coveragePath);
  const findings: Finding[] = [];

  for (const section of REQUIRED_MARKDOWN_SECTIONS) {
    if (!definition.includes(section)) {
      findings.push({ severity: "error", code: "markdown-section-missing", message: `schema-definition.md is missing section: ${section}` });
    }
  }
  if (!/```mermaid\s+erDiagram/.test(definition)) {
    findings.push({ severity: "error", code: "erd-missing", message: "schema-definition.md must include a Mermaid erDiagram code block." });
  }

  const schemas = coverage.schemas ?? [];
  if (!schemas.length) {
    findings.push({ severity: "error", code: "schemas-empty", message: "schema-coverage.json must include one or more schemas." });
  }

  const seenCodes = new Set<string>();
  const seenTables = new Set<string>();
  for (const [index, schema] of schemas.entries()) {
    const label = schema.code || `schema[${index}]`;
    if (!/^SCH-\d{3}$/.test(schema.code ?? "")) {
      findings.push({ severity: "error", code: "schema-code-format", message: `${label} code must match SCH-###.` });
    }
    if (schema.code && seenCodes.has(schema.code)) {
      findings.push({ severity: "error", code: "schema-code-duplicate", message: `${schema.code} is duplicated.` });
    }
    if (schema.code) seenCodes.add(schema.code);

    for (const key of ["name", "tableName", "drizzleExportName", "description", "owner"] as const) {
      if (!nonEmptyString(schema[key])) {
        findings.push({ severity: "error", code: "schema-field-empty", message: `${label}.${key} is required.` });
      }
    }
    if (schema.tableName && seenTables.has(schema.tableName)) {
      findings.push({ severity: "error", code: "schema-table-duplicate", message: `${schema.tableName} is used by multiple schemas.` });
    }
    if (schema.tableName) seenTables.add(schema.tableName);

    if (!nonEmptyStringArray(schema.sourceFeatureIds)) {
      findings.push({ severity: "error", code: "schema-feature-refs-empty", message: `${label}.sourceFeatureIds must include one or more FEA ids.` });
    } else {
      const invalidFeatureIds = schema.sourceFeatureIds.filter((featureId) => !/^FEA-\d{3}$/.test(featureId));
      if (invalidFeatureIds.length) {
        findings.push({ severity: "error", code: "schema-feature-ref-format", message: `${label}.sourceFeatureIds has invalid ids: ${invalidFeatureIds.join(", ")}.` });
      }
    }
    if (!schema.baseReuseDecision || !REUSE_DECISIONS.has(schema.baseReuseDecision)) {
      findings.push({ severity: "error", code: "schema-reuse-decision-invalid", message: `${label}.baseReuseDecision must be one of ${[...REUSE_DECISIONS].join(", ")}.` });
    }
    if ((schema.baseReuseDecision === "REUSE" || schema.baseReuseDecision === "EXTEND") && !nonEmptyStringArray((schema.baseDrizzleReferences ?? []).map((ref) => ref.packagePath).filter(Boolean))) {
      findings.push({ severity: "error", code: "schema-base-ref-required", message: `${label} must include baseDrizzleReferences for ${schema.baseReuseDecision}.` });
    }

    if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
      findings.push({ severity: "error", code: "schema-fields-empty", message: `${label}.fields must include one or more fields.` });
    } else {
      for (const [fieldIndex, field] of schema.fields.entries()) {
        const fieldLabel = `${label}.fields[${fieldIndex}]`;
        if (!nonEmptyString(field.name)) findings.push({ severity: "error", code: "schema-field-name-empty", message: `${fieldLabel}.name is required.` });
        if (!nonEmptyString(field.type)) findings.push({ severity: "error", code: "schema-field-type-empty", message: `${fieldLabel}.type is required.` });
        if (typeof field.required !== "boolean") findings.push({ severity: "error", code: "schema-field-required-invalid", message: `${fieldLabel}.required must be boolean.` });
        if (!nonEmptyString(field.description)) findings.push({ severity: "error", code: "schema-field-description-empty", message: `${fieldLabel}.description is required.` });
        if (!nonEmptyString(field.defaultValue)) findings.push({ severity: "error", code: "schema-field-default-empty", message: `${fieldLabel}.defaultValue is required; use an explicit value such as now(), defaultRandom(), null, or 없음.` });
      }
    }
    for (const key of ["migrationScope", "implementationNotes", "acceptanceCriteria"] as const) {
      if (!nonEmptyStringArray(schema[key])) {
        findings.push({ severity: "warning", code: "schema-notes-empty", message: `${label}.${key} should include one or more entries.` });
      }
    }
  }

  const validSchemaCodes = new Set(schemas.map((schema) => schema.code).filter(nonEmptyString));
  for (const mapping of coverage.featureSchemaMappings ?? []) {
    if (!/^FEA-\d{3}$/.test(mapping.featureId ?? "")) {
      findings.push({ severity: "error", code: "mapping-feature-id-invalid", message: `featureSchemaMappings has invalid featureId: ${mapping.featureId ?? ""}.` });
    }
    if (!nonEmptyStringArray(mapping.schemaCodes)) {
      findings.push({ severity: "error", code: "mapping-schema-codes-empty", message: `${mapping.featureId ?? "mapping"} must include schemaCodes.` });
    } else {
      const unknownCodes = mapping.schemaCodes.filter((code) => !validSchemaCodes.has(code));
      if (unknownCodes.length) {
        findings.push({ severity: "error", code: "mapping-schema-code-unknown", message: `${mapping.featureId ?? "mapping"} references unknown schema code(s): ${unknownCodes.join(", ")}.` });
      }
    }
    if (mapping.defaultDecision && !REUSE_DECISIONS.has(mapping.defaultDecision)) {
      findings.push({ severity: "error", code: "mapping-decision-invalid", message: `${mapping.featureId ?? "mapping"}.defaultDecision is invalid: ${mapping.defaultDecision}.` });
    }
  }

  const result = {
    ok: findings.every((finding) => finding.severity !== "error"),
    schemaDefinition: definitionPath,
    schemaCoverage: coveragePath,
    schemaCount: schemas.length,
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
