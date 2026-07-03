import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

type CliArgs = {
  projectName?: string;
  runDir?: string;
  help?: boolean;
};

type LatestRun = {
  runDir?: string;
};

type AnalysisChunk = {
  id: string;
  heading: string;
  headingPath: string[];
  charCount: number;
  candidateTags: string[];
  areaHints: string[];
};

type AnalysisInput = {
  projectName: string;
  selectedAreas?: string[];
  chunks: AnalysisChunk[];
};

type FeatureScope = {
  selectedAreas?: string[];
  extraContext?: string;
};

type ValidationResult = {
  ok: boolean;
  tableCount: number;
  rowCount: number;
  findings: Array<{ severity: "error" | "warning"; line: number; message: string }>;
};

type ReuseType =
  | "complete-reuse"
  | "partial-reuse"
  | "reuse-with-customization"
  | "new-implementation"
  | "not-applicable";

type ReuseDecision = {
  type?: string;
  surfaces?: string[];
  baseReferences?: string[];
  hardCopyScope?: string;
  customizationScope?: string;
  reason?: string;
};

type CoverageFeature = {
  featureId: string;
  featureName: string;
  sourceChunks: string[];
  areas: string[];
  notes?: string;
  mergeRationale?: string;
  reuse?: ReuseDecision;
};

type UnmappedChunk =
  | string
  | {
      id?: string;
      chunks?: string[];
      reason?: string;
    };

type Coverage = {
  projectName: string;
  features: CoverageFeature[];
  unmappedChunks: UnmappedChunk[];
};

type Finding = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";
const ALLOWED_AREAS = new Set(["admin", "site", "server", "app", "ai-runtime"]);
const ALLOWED_REUSE_TYPES = new Set<ReuseType>([
  "complete-reuse",
  "partial-reuse",
  "reuse-with-customization",
  "new-implementation",
  "not-applicable",
]);
const REUSE_HEADERS = ["재사용 유형", "기준 surface", "base 참조", "hard-copy 범위", "커스터마이징 범위", "메모"];
const IMPORTANT_TAGS = [
  "auth-membership",
  "doctor-verification",
  "community-post",
  "review",
  "visit-verification",
  "moderation-reporting",
  "search",
  "mypage-support",
  "ui-feedback",
  "common-system",
  "analytics-privacy-accessibility",
];

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-feature-definition/scripts/review-feature-definition.ts --project-name aiga",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-feature-definition/scripts/review-feature-definition.ts --run-dir ./generated/source-intake/aiga/runs/<run>",
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

function expandChunkToken(token: string): string[] {
  const range = /^CH-(\d{3})\.\.CH-(\d{3})$/.exec(token);
  if (!range) return [token];
  const start = Number(range[1]);
  const end = Number(range[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) return [token];
  const chunks: string[] = [];
  for (let value = start; value <= end; value += 1) {
    chunks.push(`CH-${String(value).padStart(3, "0")}`);
  }
  return chunks;
}

function expandChunkTokens(tokens: string[]): string[] {
  return tokens.flatMap(expandChunkToken);
}

function unmappedTokens(items: UnmappedChunk[]): string[] {
  return items.flatMap((item) => {
    if (typeof item === "string") return [item];
    return [...(item.id ? [item.id] : []), ...(item.chunks ?? [])];
  });
}

function parseMarkdownCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function parseFeatureAreas(markdown: string): Map<string, Set<string>> {
  const areasByFeature = new Map<string, Set<string>>();
  let currentFeatureId: string | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^##\s+(FEA-\d{3})\b/.exec(line);
    if (heading) {
      currentFeatureId = heading[1];
      areasByFeature.set(currentFeatureId, new Set<string>());
      continue;
    }
    if (!currentFeatureId || !line.trim().startsWith("|")) continue;
    const cells = parseMarkdownCells(line);
    const area = cells[0];
    if (ALLOWED_AREAS.has(area)) areasByFeature.get(currentFeatureId)?.add(area);
  }

  return areasByFeature;
}

type ReuseTable = {
  count: number;
  headerOk: boolean;
  rows: string[][];
};

function parseReuseTables(markdown: string): Map<string, ReuseTable> {
  const reuseTables = new Map<string, ReuseTable>();
  const lines = markdown.split(/\r?\n/);
  let currentFeatureId: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const featureHeading = /^##\s+(FEA-\d{3})\b/.exec(line);
    if (featureHeading) {
      currentFeatureId = featureHeading[1];
      if (!reuseTables.has(currentFeatureId)) reuseTables.set(currentFeatureId, { count: 0, headerOk: false, rows: [] });
      continue;
    }
    if (!currentFeatureId || !/^###\s+product-builder-base 재사용 판단\s*$/.test(line.trim())) continue;

    const table = reuseTables.get(currentFeatureId) ?? { count: 0, headerOk: false, rows: [] };
    table.count += 1;
    let cursor = index + 1;
    while (cursor < lines.length && lines[cursor].trim() === "") cursor += 1;

    if (cursor < lines.length && lines[cursor].trim().startsWith("|")) {
      const headerCells = parseMarkdownCells(lines[cursor]);
      if (REUSE_HEADERS.every((header, headerIndex) => headerCells[headerIndex] === header)) {
        table.headerOk = true;
        cursor += 1;
        if (cursor < lines.length && isSeparatorRow(parseMarkdownCells(lines[cursor]))) cursor += 1;
        while (cursor < lines.length && lines[cursor].trim().startsWith("|")) {
          const cells = parseMarkdownCells(lines[cursor]);
          if (!isSeparatorRow(cells)) table.rows.push(cells);
          cursor += 1;
        }
      }
    }
    reuseTables.set(currentFeatureId, table);
  }

  return reuseTables;
}

function sortedValues(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sameStringSet(left: string[], right: string[]): boolean {
  const leftSorted = sortedValues(left);
  const rightSorted = sortedValues(right);
  return leftSorted.length === rightSorted.length && leftSorted.every((value, index) => value === rightSorted[index]);
}

function commaList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(nonEmptyString);
}

function renderReviewMarkdown(input: {
  projectName: string;
  runDir: string;
  totalChunks: number;
  mappedCount: number;
  unmappedCount: number;
  featureCount: number;
  validation: ValidationResult | null;
  findings: Finding[];
}): string {
  const errorCount = input.findings.filter((finding) => finding.severity === "error").length;
  const warningCount = input.findings.filter((finding) => finding.severity === "warning").length;
  const infoCount = input.findings.filter((finding) => finding.severity === "info").length;
  const status = errorCount === 0 ? "pass" : "fail";

  return [
    `# 기능정의서 리뷰 - ${input.projectName}`,
    "",
    `- 상태: ${status}`,
    `- 기능 그룹: ${input.featureCount}`,
    `- 소스 청크: ${input.totalChunks}`,
    `- 매핑 청크: ${input.mappedCount}`,
    `- 미매핑 청크: ${input.unmappedCount}`,
    `- 표 검증: ${input.validation ? (input.validation.ok ? "pass" : "fail") : "not-run"}`,
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
  const analysisPath = join(runDir, "feature-definition-work", "feature-analysis-input.json");
  const definitionPath = join(runDir, "feature-definition.md");
  const coveragePath = join(runDir, "feature-coverage.json");
  const validationPath = join(runDir, "feature-definition.validation.json");
  const reviewJsonPath = join(runDir, "feature-definition.review.json");
  const reviewMarkdownPath = join(runDir, "feature-definition-review.md");
  const scopePath = join(runDir, "feature-definition-scope.json");

  const analysis = await readJson<AnalysisInput>(analysisPath);
  const definition = await readFile(definitionPath, "utf8");
  const coverage = await readJson<Coverage>(coveragePath);
  const validation = await readJsonIfExists<ValidationResult>(validationPath);
  const scope = await readJsonIfExists<FeatureScope>(scopePath);
  const selectedAreas = scope?.selectedAreas?.length ? scope.selectedAreas : analysis.selectedAreas?.length ? analysis.selectedAreas : [...ALLOWED_AREAS];
  const selectedAreaSet = new Set(selectedAreas);
  const findings: Finding[] = [];

  if (!validation) {
    findings.push({ severity: "warning", code: "validation-missing", message: "feature-definition.validation.json is missing; run validate-feature-definition.ts first." });
  } else if (!validation.ok) {
    findings.push({ severity: "error", code: "validation-failed", message: `Markdown table validation failed with ${validation.findings.length} finding(s).` });
  }

  if (!coverage.features.length) {
    findings.push({ severity: "error", code: "coverage-empty", message: "feature-coverage.json has no feature entries." });
  }

  const knownChunks = new Set(analysis.chunks.map((chunk) => chunk.id));
  const featureAreas = parseFeatureAreas(definition);
  const reuseTables = parseReuseTables(definition);
  const mappedChunks = new Map<string, string[]>();
  const mappedChunkIds: string[] = [];

  for (const feature of coverage.features) {
    if (!/^FEA-\d{3}$/.test(feature.featureId)) {
      findings.push({ severity: "error", code: "feature-id-format", message: `${feature.featureId} does not match FEA-###.` });
    }
    if (!feature.featureName.trim()) {
      findings.push({ severity: "error", code: "feature-name-empty", message: `${feature.featureId} has an empty featureName.` });
    }
    if (!feature.sourceChunks.length) {
      findings.push({ severity: "error", code: "feature-source-empty", message: `${feature.featureId} has no sourceChunks.` });
    }
    const featureAreaSet = new Set(feature.areas);
    for (const area of feature.areas) {
      if (!ALLOWED_AREAS.has(area)) {
        findings.push({ severity: "error", code: "coverage-area-invalid", message: `${feature.featureId} uses invalid area "${area}".` });
      } else if (!selectedAreaSet.has(area)) {
        findings.push({ severity: "error", code: "coverage-area-out-of-scope", message: `${feature.featureId} uses area "${area}" outside selected scope: ${selectedAreas.join(", ")}.` });
      }
    }
    const tableAreas = featureAreas.get(feature.featureId);
    if (!tableAreas) {
      findings.push({ severity: "error", code: "feature-table-missing", message: `${feature.featureId} is in coverage but not in feature-definition.md.` });
    } else {
      const outOfScopeTableAreas = [...tableAreas].filter((area) => !selectedAreaSet.has(area));
      if (outOfScopeTableAreas.length) {
        findings.push({ severity: "error", code: "markdown-area-out-of-scope", message: `${feature.featureId} has Markdown area(s) outside selected scope: ${outOfScopeTableAreas.join(", ")}. Selected: ${selectedAreas.join(", ")}.` });
      }
      const coverageAreaSet = new Set(feature.areas);
      const missingFromCoverage = [...tableAreas].filter((area) => !coverageAreaSet.has(area));
      const missingFromTable = feature.areas.filter((area) => !tableAreas.has(area));
      if (missingFromCoverage.length || missingFromTable.length) {
        findings.push({
          severity: "warning",
          code: "area-mismatch",
          message: `${feature.featureId} area mismatch. Markdown=[${[...tableAreas].join(", ")}], coverage=[${feature.areas.join(", ")}].`,
        });
      }
    }

    const reuse = feature.reuse;
    if (!reuse) {
      findings.push({ severity: "error", code: "reuse-missing", message: `${feature.featureId} is missing a product-builder-base reuse decision in feature-coverage.json.` });
    } else {
      if (!reuse.type || !ALLOWED_REUSE_TYPES.has(reuse.type as ReuseType)) {
        findings.push({
          severity: "error",
          code: "reuse-type-invalid",
          message: `${feature.featureId} has invalid reuse.type "${reuse.type ?? ""}". Allowed: ${[...ALLOWED_REUSE_TYPES].join(", ")}.`,
        });
      }
      if (!nonEmptyStringArray(reuse.surfaces)) {
        findings.push({ severity: "error", code: "reuse-surfaces-missing", message: `${feature.featureId} reuse.surfaces must include one or more selected feature areas.` });
      } else {
        const invalidSurfaces = reuse.surfaces.filter((surface) => !ALLOWED_AREAS.has(surface));
        const outOfScopeSurfaces = reuse.surfaces.filter((surface) => !selectedAreaSet.has(surface));
        const outsideFeatureAreas = reuse.surfaces.filter((surface) => !featureAreaSet.has(surface));
        if (invalidSurfaces.length) {
          findings.push({ severity: "error", code: "reuse-surface-invalid", message: `${feature.featureId} reuse.surfaces has invalid area(s): ${invalidSurfaces.join(", ")}.` });
        }
        if (outOfScopeSurfaces.length) {
          findings.push({ severity: "error", code: "reuse-surface-out-of-scope", message: `${feature.featureId} reuse.surfaces is outside selected scope: ${outOfScopeSurfaces.join(", ")}.` });
        }
        if (outsideFeatureAreas.length) {
          findings.push({ severity: "error", code: "reuse-surface-area-mismatch", message: `${feature.featureId} reuse.surfaces must be a subset of feature areas. Extra: ${outsideFeatureAreas.join(", ")}.` });
        }
      }
      if (!nonEmptyString(reuse.hardCopyScope)) {
        findings.push({ severity: "error", code: "reuse-hard-copy-empty", message: `${feature.featureId} reuse.hardCopyScope is required.` });
      }
      if (!nonEmptyString(reuse.customizationScope)) {
        findings.push({ severity: "error", code: "reuse-customization-empty", message: `${feature.featureId} reuse.customizationScope is required.` });
      }
      if (!nonEmptyString(reuse.reason)) {
        findings.push({ severity: "error", code: "reuse-reason-empty", message: `${feature.featureId} reuse.reason is required.` });
      }
      if (reuse.type !== "new-implementation" && reuse.type !== "not-applicable" && !nonEmptyStringArray(reuse.baseReferences)) {
        findings.push({ severity: "error", code: "reuse-base-references-empty", message: `${feature.featureId} reuse.baseReferences is required unless reuse.type is new-implementation or not-applicable.` });
      }
    }

    const reuseTable = reuseTables.get(feature.featureId);
    if (!reuseTable || reuseTable.count === 0) {
      findings.push({ severity: "error", code: "reuse-table-missing", message: `${feature.featureId} is missing a product-builder-base 재사용 판단 table in feature-definition.md.` });
    } else {
      if (reuseTable.count !== 1) {
        findings.push({ severity: "error", code: "reuse-table-count", message: `${feature.featureId} must have exactly one reuse table, found ${reuseTable.count}.` });
      }
      if (!reuseTable.headerOk) {
        findings.push({ severity: "error", code: "reuse-table-header", message: `${feature.featureId} reuse table must use headers: ${REUSE_HEADERS.join(" | ")}.` });
      }
      if (reuseTable.rows.length !== 1) {
        findings.push({ severity: "error", code: "reuse-table-row-count", message: `${feature.featureId} reuse table must have exactly one data row, found ${reuseTable.rows.length}.` });
      } else {
        const reuseRow = reuseTable.rows[0];
        const reuseType = reuseRow[0] ?? "";
        const surfaceCell = reuseRow[1] ?? "";
        const hardCopyScope = reuseRow[3] ?? "";
        const customizationScope = reuseRow[4] ?? "";
        const memo = reuseRow[5] ?? "";
        if (reuse?.type && reuseType !== reuse.type) {
          findings.push({ severity: "error", code: "reuse-table-type-mismatch", message: `${feature.featureId} Markdown reuse type "${reuseType}" does not match coverage reuse.type "${reuse.type}".` });
        }
        const markdownSurfaces = commaList(surfaceCell);
        if (reuse?.surfaces && !sameStringSet(markdownSurfaces, reuse.surfaces)) {
          findings.push({
            severity: "error",
            code: "reuse-table-surface-mismatch",
            message: `${feature.featureId} Markdown reuse surfaces [${markdownSurfaces.join(", ")}] do not match coverage reuse.surfaces [${reuse.surfaces.join(", ")}].`,
          });
        }
        if (!nonEmptyString(hardCopyScope)) {
          findings.push({ severity: "error", code: "reuse-table-hard-copy-empty", message: `${feature.featureId} Markdown reuse hard-copy scope is empty.` });
        }
        if (!nonEmptyString(customizationScope)) {
          findings.push({ severity: "error", code: "reuse-table-customization-empty", message: `${feature.featureId} Markdown reuse customization scope is empty.` });
        }
        if (memo.trim().length > 0) {
          findings.push({ severity: "error", code: "reuse-table-memo-not-empty", message: `${feature.featureId} Markdown reuse memo must be empty because the user writes it.` });
        }
      }
    }

    const expanded = expandChunkTokens(feature.sourceChunks);
    if (expanded.length > 60) {
      findings.push({ severity: "warning", code: "feature-broad-coverage", message: `${feature.featureId} maps ${expanded.length} chunks; check that this group is not too broad.` });
    }
    for (const chunkId of expanded) {
      mappedChunkIds.push(chunkId);
      const owners = mappedChunks.get(chunkId) ?? [];
      owners.push(feature.featureId);
      mappedChunks.set(chunkId, owners);
    }
  }

  for (const [chunkId, owners] of mappedChunks) {
    if (owners.length > 2) {
      findings.push({ severity: "warning", code: "chunk-overlap", message: `${chunkId} is mapped to ${owners.length} features: ${owners.join(", ")}.` });
    }
  }

  const unmappedChunkIds = expandChunkTokens(unmappedTokens(coverage.unmappedChunks));
  const referencedChunks = new Set([...mappedChunkIds, ...unmappedChunkIds]);
  const unknownChunks = [...referencedChunks].filter((chunkId) => !knownChunks.has(chunkId));
  if (unknownChunks.length) {
    findings.push({ severity: "error", code: "unknown-chunk", message: `Coverage references unknown chunks: ${unknownChunks.slice(0, 20).join(", ")}${unknownChunks.length > 20 ? "..." : ""}.` });
  }

  const missingImportant = analysis.chunks
    .filter((chunk) => !referencedChunks.has(chunk.id))
    .filter((chunk) => chunk.charCount >= 120 || chunk.candidateTags.length > 0 || chunk.areaHints.length > 0);
  if (missingImportant.length) {
    findings.push({
      severity: "error",
      code: "important-chunk-uncovered",
      message: `${missingImportant.length} important chunk(s) are neither mapped nor explicitly unmapped: ${missingImportant.slice(0, 30).map((chunk) => chunk.id).join(", ")}${missingImportant.length > 30 ? "..." : ""}.`,
    });
  }

  const tagCoverage = new Map<string, number>();
  for (const chunkId of mappedChunkIds) {
    const chunk = analysis.chunks.find((item) => item.id === chunkId);
    if (!chunk) continue;
    for (const tag of chunk.candidateTags) {
      tagCoverage.set(tag, (tagCoverage.get(tag) ?? 0) + 1);
    }
  }
  const uncoveredTags = IMPORTANT_TAGS.filter((tag) => !tagCoverage.has(tag));
  if (uncoveredTags.length) {
    findings.push({ severity: "warning", code: "topic-uncovered", message: `No mapped feature covers tags: ${uncoveredTags.join(", ")}.` });
  }

  if (validation?.rowCount && coverage.features.length > validation.rowCount) {
    findings.push({ severity: "warning", code: "feature-row-ratio", message: "Feature count is higher than table row count; check that each feature has implementation-facing rows." });
  }

  findings.push({
    severity: "info",
    code: "coverage-summary",
    message: `${new Set(mappedChunkIds).size}/${analysis.chunks.length} chunks mapped to features; ${new Set(unmappedChunkIds).size} chunks explicitly unmapped.`,
  });

  const result = {
    ok: findings.every((finding) => finding.severity !== "error"),
    projectName: analysis.projectName,
    runDir,
    featureDefinition: definitionPath,
    featureCoverage: coveragePath,
    scope: scope ? scopePath : null,
    selectedAreas,
    validation: validationPath,
    reviewMarkdown: reviewMarkdownPath,
    featureCount: coverage.features.length,
    totalChunks: analysis.chunks.length,
    mappedChunkCount: new Set(mappedChunkIds).size,
    unmappedChunkCount: new Set(unmappedChunkIds).size,
    findings,
  };

  await writeFile(reviewJsonPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  await writeFile(reviewMarkdownPath, renderReviewMarkdown({
    projectName: analysis.projectName,
    runDir,
    totalChunks: analysis.chunks.length,
    mappedCount: result.mappedChunkCount,
    unmappedCount: result.unmappedChunkCount,
    featureCount: coverage.features.length,
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
