import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";

type CliArgs = {
  projectName?: string;
  runDir?: string;
  areas?: string;
  notes?: string;
  help?: boolean;
};

type LatestRun = {
  projectName?: string;
  runDir?: string;
};

const DEFAULT_SOURCE_ROOT = "generated/source-intake";
const ALLOWED_AREAS = ["admin", "site", "server", "app", "ai-runtime"] as const;
const ALLOWED_AREA_SET = new Set<string>(ALLOWED_AREAS);

function usage(): string {
  return [
    "Usage:",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-feature-definition/scripts/configure-feature-scope.ts --project-name aiga --areas admin,app,server --notes \"mobile app first\"",
    "  node cli/node_modules/tsx/dist/cli.mjs .agents/skills/bbr-feature-definition/scripts/configure-feature-scope.ts --run-dir ./generated/source-intake/aiga/runs/<run> --areas admin,app,server",
    "",
    "Allowed areas:",
    `  ${ALLOWED_AREAS.join(", ")}`,
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
      case "--areas":
        if (!next) throw new Error("--areas requires a comma-separated value");
        args.areas = next;
        index += 1;
        break;
      case "--notes":
        if (!next) throw new Error("--notes requires a value");
        args.notes = next;
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

async function resolveRun(args: CliArgs): Promise<{ projectName: string; runDir: string }> {
  if (args.runDir) {
    return {
      projectName: args.projectName ?? "project",
      runDir: resolve(args.runDir),
    };
  }
  if (!args.projectName) throw new Error("--project-name or --run-dir is required");
  const latestPath = resolve(DEFAULT_SOURCE_ROOT, safeSlug(args.projectName), "latest-run.json");
  const latest = await readJson<LatestRun>(latestPath);
  if (!latest.runDir) throw new Error(`latest-run.json does not include runDir: ${latestPath}`);
  return {
    projectName: latest.projectName ?? args.projectName,
    runDir: resolveProjectPath(args.projectName, latest.runDir),
  };
}

function parseAreas(value?: string): string[] {
  if (!value) throw new Error("--areas is required. Choose one or more of: " + ALLOWED_AREAS.join(", "));
  const areas = value
    .split(",")
    .map((area) => area.trim())
    .filter(Boolean);
  if (areas.length === 0) throw new Error("--areas must include at least one area");
  const invalid = areas.filter((area) => !ALLOWED_AREA_SET.has(area));
  if (invalid.length > 0) {
    throw new Error(`Invalid area(s): ${invalid.join(", ")}. Allowed: ${ALLOWED_AREAS.join(", ")}`);
  }
  return [...new Set(areas)];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const run = await resolveRun(args);
  const selectedAreas = parseAreas(args.areas);
  const scopePath = join(run.runDir, "feature-definition-scope.json");
  const scope = {
    projectName: run.projectName,
    availableAreas: ALLOWED_AREAS,
    selectedAreas,
    extraContext: args.notes ?? "",
    configuredAt: new Date().toISOString(),
  };
  await writeFile(scopePath, JSON.stringify(scope, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({ ok: true, scope: scopePath, ...scope }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
