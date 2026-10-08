import type { NextConfig } from "next";

/**
 * Baseline security headers for every route (pages and API).
 *
 * A full script/style Content-Security-Policy needs per-request nonces and must
 * allow YouTube embeds and signed R2 image URLs; it is tracked under "Open
 * decisions" in docs/CODEBASE_ARCHITECTURE.md. The directives below are safe
 * today because they do not restrict scripts or styles.
 */
const baselineSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
];

/**
 * Token-bearing pages (guest invitation, gallery, member invitation, password
 * reset): never indexed, and the token must never leak through the Referer
 * header (API_DESIGN §50, PRD §13).
 */
const tokenPagePaths = [
  "/invite/:path*",
  "/gallery/:path*",
  "/join/:path*",
  "/reset-password/:path*",
];
const tokenPageHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Referrer-Policy", value: "no-referrer" },
];

const nextConfig: NextConfig = {
  // Cache Components (default for new Next 16.4 apps): data access is dynamic
  // by default and request-time reads (cookies/session) live behind <Suspense>.
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Tailwind CSS v4 through the Turbopack loader (Next 16.4 generator default).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // mongoose, mongodb and @node-rs/argon2 are already in Next's built-in
  // serverExternalPackages list, so no `serverExternalPackages` entry is needed.
  logging: {
    // Dev request logging must never print secret tokens (API_DESIGN §104).
    incomingRequests: {
      ignore: [
        /\/(invite|gallery|join|reset-password)\//,
        /\/api\/public\/(invitations|galleries|member-invitations)\//,
        /\/api\/member-invitations\//,
      ],
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: baselineSecurityHeaders },
      // Later entries override earlier ones for the same header key.
      ...tokenPagePaths.map((source) => ({ source, headers: tokenPageHeaders })),
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

export default nextConfig;
