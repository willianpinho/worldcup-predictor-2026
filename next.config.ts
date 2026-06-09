import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  // Keep Prisma client + libSQL native addon out of the bundler so the
  // platform-specific .node binary resolves correctly at runtime.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
  ],
};

export default nextConfig;
