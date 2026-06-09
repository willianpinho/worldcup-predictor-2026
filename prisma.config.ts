import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 reads connection settings from this file (not from schema env()).
// dotenv is imported explicitly because Prisma 7 does not auto-load .env here.
// A fallback keeps `prisma generate` working at build time when no .env is present.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/data.db",
  },
});
