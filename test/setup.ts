import { beforeAll } from "vitest";

// Database-backed tests get a freshly migrated in-memory database per file.
beforeAll(async () => {
  const { migrateDatabase } = await import("@/db");
  await migrateDatabase();
});
