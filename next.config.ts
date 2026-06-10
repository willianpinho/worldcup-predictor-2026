import type { NextConfig } from "next";

// Security headers applied to every response. Hardening + trust signals for
// web-reputation scanners; none of these change how the app renders.
// HSTS is intentionally omitted — Cloudflare already adds it at the edge.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      // Next.js injects inline bootstrap/runtime styles and scripts.
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework/version in the X-Powered-By header.
  poweredByHeader: false,
  // Keep Prisma client + libSQL native addon out of the bundler so the
  // platform-specific .node binary resolves correctly at runtime.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
