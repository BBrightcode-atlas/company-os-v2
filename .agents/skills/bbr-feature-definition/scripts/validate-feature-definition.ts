import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

type CliArgs = {
  projectName?: string;
  runDir?: string;
  featureDefinition?: string;
  help?: boolean;
};

type LatestRun = {
  runDir?: string;
};

type FeatureScope = {
  selectedAreas?: string[];
  extraContext?: string;
};

type Finding = {
  severity: "error" | "warning";
  line: number;
  message: string;
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";
const ALLOWED_AREAS = new Set(["admin", "site", "server", "app", "ai-runtime"]);
const REQUIRED_HEADERS = ["영역", "기능명", "상세 설명", "메모"];

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-feature-definition/scripts/validate-feature-definition.ts --project-name aiga",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-feature-definition/scripts/validate-feature-definition.ts --feature-definition ./generated/source-intake/aiga/runs/<run>/feature-definition.md",
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
      case "--feature-definition":
        if (!next) throw new Error("--feature-definition requires a path");
        args.featureDefinition = next;
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

async function resolveFeatureDefinition(args: CliArgs): Promise<string> {
  if (args.featureDefinition) return resolve(args.featureDefinition);
  if (args.runDir) return join(resolve(args.runDir), "feature-definition.md");
  if (!args.projectName) throw new Error("--project-name, --run-dir, or --feature-definition is required");
  const latestPath = resolve(DEFAULT_SOURCE_ROOT, safeSlug(args.projectName), "latest-run.json");
  const latest = await readJson<LatestRun>(latestPath);
  if (!latest.runDir) throw new Error(`latest-run.json does not include runDir: ${latestPath}`);
  return join(resolveProjectPath(args.projectName, latest.runDir), "feature-definition.md");
}

function parseCells(line: string): string[] {
  const trimmed = line.trim();
  const withoutEdges = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return withoutEdges.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function mainTableHeader(cells: string[]): boolean {
  return REQUIRED_HEADERS.every((header, index) => cells[index] === header);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const featurePath = await resolveFeatureDefinition(args);
  const scopePath = join(dirname(featurePath), "feature-definition-scope.json");
  const scope = await readJsonIfExists<FeatureScope>(scopePath);
  const selectedAreas = scope?.selectedAreas?.length ? scope.selectedAreas : [...ALLOWED_AREAS];
  const selectedAreaSet = new Set(selectedAreas);
  const content = await readFile(featurePath, "utf8");
  const lines = content.split(/\r?\n/);
  const findings: Finding[] = [];
  let tableCount = 0;
  let rowCount = 0;
  let insideFeatureTable = false;
  const seenRows = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim().startsWith("|")) {
      insideFeatureTable = false;
      continue;
    }
    const cells = parseCells(line);
    if (mainTableHeader(cells)) {
      tableCount += 1;
      insideFeatureTable = true;
      continue;
    }
    if (!insideFeatureTable || isSeparatorRow(cells)) continue;

    rowCount += 1;
    if (cells.length !== REQUIRED_HEADERS.length) {
      findings.push({ severity: "error", line: index + 1, message: `Expected ${REQUIRED_HEADERS.length} columns, got ${cells.length}` });
      continue;
    }
    const [area, featureName, detail, memo] = cells;
    if (!ALLOWED_AREAS.has(area)) {
      findings.push({ severity: "error", line: index + 1, message: `Invalid 영역 "${area}". Allowed: ${[...ALLOWED_AREAS].join(", ")}` });
    } else if (!selectedAreaSet.has(area)) {
      findings.push({ severity: "error", line: index + 1, message: `영역 "${area}" is not in selected scope. Selected: ${selectedAreas.join(", ")}` });
    }
    if (!featureName) {
      findings.push({ severity: "error", line: index + 1, message: "기능명 is required" });
    }
    if (!detail || detail.length < 12) {
      findings.push({ severity: "error", line: index + 1, message: "상세 설명 is missing or too short" });
    }
    if (memo.trim().length > 0) {
      findings.push({ severity: "error", line: index + 1, message: "메모 must be empty because the user writes it" });
    }
    const rowKey = `${area}\0${featureName}\0${detail}`;
    if (seenRows.has(rowKey)) {
      findings.push({ severity: "warning", line: index + 1, message: "Duplicate feature row" });
    }
    seenRows.add(rowKey);
  }

  if (tableCount === 0) {
    findings.push({ severity: "error", line: 1, message: "No feature tables with headers: 영역 | 기능명 | 상세 설명 | 메모" });
  }
  if (rowCount === 0) {
    findings.push({ severity: "error", line: 1, message: "No feature rows found" });
  }

  const result = {
    ok: findings.every((finding) => finding.severity !== "error"),
    featureDefinition: featurePath,
    scope: scope ? scopePath : null,
    selectedAreas,
    tableCount,
    rowCount,
    findings,
  };
  const outputPath = join(dirname(featurePath), "feature-definition.validation.json");
  await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ ...result, validation: outputPath }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
