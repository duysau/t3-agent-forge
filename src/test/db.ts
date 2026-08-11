import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as schema from "~/server/db/schema";
import type { Db } from "~/server/db/types";

const MIGRATIONS_DIR = join(process.cwd(), "drizzle");

function migrationSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n")
    .replaceAll("--> statement-breakpoint", "");
}

export async function makeTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite();
  await client.exec(migrationSql());
  const db = drizzle(client, { schema }) as unknown as Db;
  return { db, close: () => client.close() };
}
