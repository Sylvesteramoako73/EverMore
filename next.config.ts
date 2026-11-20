import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// The Leadloop website chat assistant (script, chat API and images).
const CHAT = "https://chatbot-m8tu.onrender.com";
// Google Analytics 4.
const GA_SCRIPT = "https://www.googletagmanager.com";
const GA_CONNECT = "https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com";

// Next's runtime needs inline scripts/styles; 'unsafe-eval' only in development for fast refresh.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${CHAT} ${GA_SCRIPT}${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline' ${CHAT}`,
  `img-src 'self' data: blob: ${CHAT} ${GA_CONNECT}`,
  "font-src 'self' data:",
  `connect-src 'self' ${CHAT} ${GA_CONNECT}`,
  "frame-src 'self' https://www.openstreetmap.org https://www.youtube-nocookie.com",
  "frame-ancestors 'self'", // the dashboard previews pages in a same-origin frame
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com https://checkout.paystack.com",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera only for our own pages (the check-in desk scans entry passes).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  images: { qualities: [75, 90] },
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg", "sharp"],
  // Migrations are read from disk at startup (src/instrumentation.ts), so ship them with the server.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
  experimental: {
    authInterrupts: true,
    // Photos are uploaded one per request and resized on the server.
    serverActions: { bodySizeLimit: "15mb" },
    proxyClientMaxBodySize: "15mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Known addresses only in production. Sign-in cookies belong to the address you signed in on, so
  // Vercel's extra addresses (per-deployment URLs, the team alias) would look "signed out" whenever
  // a link took you to the main address. Send them all to APP_URL. The cron path is left alone
  // because Vercel's scheduler calls the deployment directly.
  //
  // When SITE_URL is set to a different address than APP_URL, the public website lives there
  // (e.g. https://evermoregh.online) and the app lives on APP_URL (e.g. https://app.evermoregh.online):
  // signing in, the dashboard and the admin area always move to the app address.
  async redirects() {
    if (process.env.VERCEL_ENV !== "production" || !process.env.APP_URL) return [];
    const app = new URL(process.env.APP_URL);
    const site = process.env.SITE_URL ? new URL(process.env.SITE_URL) : null;
    const split = site !== null && site.host !== app.host;
    const host = (url: URL) => ({ type: "host" as const, value: url.host.replace(/\./g, "\\.") });
    const known = split ? [host(app), host(site)] : [host(app)];
    const appOnly = "sign-in|sign-up|forgot-password|reset-password|check-email|dashboard|admin|onboarding|join|r";
    return [
      {
        source: "/:path((?!api/cron).*)",
        missing: known,
        destination: `${app.origin}/:path`,
        permanent: false,
      },
      ...(split
        ? [
            { source: `/:section(${appOnly})/:rest*`, has: [host(site)], destination: `${app.origin}/:section/:rest*`, permanent: false },
            { source: "/api/auth/:rest*", has: [host(site)], destination: `${app.origin}/api/auth/:rest*`, permanent: false },
            // The app address has no home page of its own: go straight in (signed-out visitors land on sign-in).
            { source: "/", has: [host(app)], destination: "/dashboard", permanent: false },
          ]
        : []),
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
