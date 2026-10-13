import { defineConfig } from "drizzle-kit";

// `npm run db:generate` turns schema changes into a new SQL migration in ./drizzle.
// Migrations are applied automatically when the server starts (src/instrumentation.ts).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  strict: true,
  verbose: true,
});
