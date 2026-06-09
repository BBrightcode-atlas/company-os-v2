import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { newDb } from "pg-mem";
import type { Db } from "../../src/db.js";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(here, "../../migrations");

/** Build an in-memory Postgres-backed `Db` with the chat schema applied. */
export function createMemDb(): Db {
  const mem = newDb();
  mem.public.registerFunction({
    name: "now",
    returns: "timestamptz" as never,
    implementation: () => new Date(),
  });
  // Apply every migration in filename order. The prod migrations are schema-qualified to the
  // host-derived plugin namespace; tests run against the in-memory public schema (matching the
  // runtime search_path), so strip the namespace prefix before applying the DDL.
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8").replace(
      /plugin_flotter_agent_chat_9c7a1f643c\./g,
      "",
    );
    mem.public.none(sql);
  }
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  return {
    namespace: "public",
    async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
      const r = await pool.query(sql, params as unknown[]);
      return r.rows as T[];
    },
    async execute(sql: string, params?: unknown[]): Promise<{ rowCount: number }> {
      const r = await pool.query(sql, params as unknown[]);
      return { rowCount: r.rowCount ?? 0 };
    },
  };
}
