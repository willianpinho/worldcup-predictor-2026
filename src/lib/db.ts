import { PrismaLibSql } from "@prisma/adapter-libsql";
// Relative (not "@/") so this also resolves under tsx (seed) and vitest without path config.
import { PrismaClient } from "../generated/prisma/client";

// Prisma 7: runtime connection is supplied via a driver adapter (libSQL = SQLite file).
const url = process.env.DATABASE_URL ?? "file:./prisma/data.db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaLibSql({ url }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
