import "server-only";
import path from "node:path";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { env, isProduction } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle database. Production uses node-postgres; local development and tests use PGlite
 * (Postgres compiled to WASM), so the same SQL and migrations run everywhere.
 * The PGlite and node-postgres databases share one query API, so both are exposed under one type.
 */
export type Database = NodePgDatabase<typeof schema>;

const MIGRATIONS_FOLDER = path.join(/*turbopackIgnore: true*/ process.cwd(), "drizzle");

type Handle = { db: Database; migrate: () => Promise<void> };

function create(): Handle {
  const url = env.DATABASE_URL;

  if (url && url !== "memory://") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg") as typeof import("pg");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_SIZE ?? 10) });
    const db = drizzle({ client: pool, schema, casing: "snake_case" });
    return {
      db,
      async migrate() {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { migrate } = require("drizzle-orm/node-postgres/migrator") as typeof import("drizzle-orm/node-postgres/migrator");
        await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
      },
    };
  }

  if (isProduction && !env.ALLOW_EMBEDDED_DB) {
    throw new Error("DATABASE_URL must be set in production.");
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
  const client =
    url === "memory://" ? new PGlite() : new PGlite(path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "pglite"));
  const db = drizzle({ client, schema, casing: "snake_case" });
  return {
    db: db as unknown as Database,
    async migrate() {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { migrate } = require("drizzle-orm/pglite/migrator") as typeof import("drizzle-orm/pglite/migrator");
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    },
  };
}

// One handle per process, surviving dev hot reloads.
const g = globalThis as unknown as { __evermoreDb?: Handle; __evermoreMigrated?: Promise<void> };
const handle = (g.__evermoreDb ??= create());

export const db = handle.db;

/** Apply pending migrations once per process. Called from instrumentation (server start) and test setup. */
export function migrateDatabase() {
  g.__evermoreMigrated ??= handle.migrate().catch((err) => {
    g.__evermoreMigrated = undefined;
    throw err;
  });
  return g.__evermoreMigrated;
}

export { schema };
