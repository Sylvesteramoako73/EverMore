// Where links point when the public website and the app live on different addresses
// (SITE_URL and APP_URL, see next.config.ts). With one address these return the path unchanged.
// Server components only: the addresses are read from the server environment.

const origin = (value: string | undefined) => (value ? new URL(value).origin : null);

function isSplit() {
  const app = origin(process.env.APP_URL);
  const site = origin(process.env.SITE_URL);
  return app !== null && site !== null && app !== site;
}

/** Link from the website into the app (sign-in, sign-up, dashboard). */
export function appHref(path: string) {
  return isSplit() ? `${origin(process.env.APP_URL)}${path}` : path;
}

/** Address of a website page, for canonical links. */
export function siteHref(path: string) {
  return `${origin(process.env.SITE_URL) ?? origin(process.env.APP_URL) ?? "http://localhost:3000"}${path}`;
}
