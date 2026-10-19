// Make an existing account an EverMore admin (or remove admin with --remove).
//
// Locally (with `npm run dev` running):   npm run make-admin -- you@example.com
// Production: set DATABASE_URL to the live database first, e.g. from Vercel:
//   vercel env pull .env.production.local --environment=production
//   node --env-file=.env.production.local scripts/make-admin.mjs you@example.com
// The person must have signed up first.

import pg from "pg";

const args = process.argv.slice(2);
const remove = args.includes("--remove");
const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- someone@example.com [--remove]");
  process.exit(1);
}

const url = process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:54329/postgres?sslmode=disable";
const client = new pg.Client({ connectionString: url });
await client.connect();
const { rows } = await client.query(`UPDATE "user" SET role = $1, updated_at = now() WHERE lower(email) = $2 RETURNING name, email, role`, [remove ? "user" : "admin", email]);
await client.end();

if (!rows.length) {
  console.error(`No account found for ${email}. Sign up first, then run this again.`);
  process.exit(1);
}
console.log(`${rows[0].name} <${rows[0].email}> is now ${rows[0].role === "admin" ? "an admin" : "a regular user"}.`);
