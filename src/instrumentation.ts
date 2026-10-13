// Runs once when a server instance starts: apply pending database migrations before handling requests.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { migrateDatabase } = await import("@/db");
  await migrateDatabase();
}
