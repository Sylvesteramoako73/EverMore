import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Next's runtime needs inline scripts/styles; 'unsafe-eval' only in development for fast refresh.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self' https://www.openstreetmap.org https://www.youtube-nocookie.com",
  "frame-ancestors 'self'", // the dashboard previews pages in a same-origin frame
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
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
  // One address only in production. Sign-in cookies belong to the address you signed in on, so
  // Vercel's extra addresses (per-deployment URLs, the team alias) would look "signed out" whenever
  // a link took you to the main address. Send them all to APP_URL. The cron path is left alone
  // because Vercel's scheduler calls the deployment directly.
  async redirects() {
    if (process.env.VERCEL_ENV !== "production" || !process.env.APP_URL) return [];
    const canonical = new URL(process.env.APP_URL);
    return [
      {
        source: "/:path((?!api/cron).*)",
        missing: [{ type: "host", value: canonical.host }],
        destination: `${canonical.origin}/:path`,
        permanent: false,
      },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
