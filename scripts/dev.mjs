// Local development: runs an embedded Postgres (PGlite) as its own small server, then Next.js
// connected to it with the normal Postgres driver, just as production connects to a real database.
// Keeping the database out of the Next.js process avoids WASM crashes we saw when PGlite ran
// inside the dev server.
//
// Usage: npm run dev            (set DATABASE_URL in .env.local to use a real Postgres instead)

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const port = Number(process.env.PGLITE_PORT ?? 54329);
const appPort = process.env.PORT ?? "3000";
let databaseUrl = process.env.DATABASE_URL;
let server;

if (!databaseUrl) {
  const { PGlite } = await import("@electric-sql/pglite");
  const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");
  const dir = path.join(process.cwd(), "data", "pglite");
  mkdirSync(dir, { recursive: true });
  const db = await PGlite.create(dir);
  server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 4 });
  await server.start();
  databaseUrl = `postgres://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`;
  console.log(`[dev] Local database (PGlite) on 127.0.0.1:${port}, stored in data/pglite`);
}

const next = spawn(process.execPath, [path.join("node_modules", "next", "dist", "bin", "next"), "dev", "-p", appPort], {
  stdio: "inherit",
  // One pooled connection: PGlite runs a single session, so transactions must not interleave.
  env: { ...process.env, DATABASE_URL: databaseUrl, DATABASE_POOL_SIZE: process.env.DATABASE_POOL_SIZE ?? "1" },
});

const shutdown = async (code = 0) => {
  next.kill();
  await server?.stop().catch(() => {});
  process.exit(code);
};
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
next.on("exit", (code) => shutdown(code ?? 0));
