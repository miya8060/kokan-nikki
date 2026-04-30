import { PrismaClient } from "@prisma/client";

import { resolveDatabaseUrl } from "./db-url";

// In dev, Next.js HMR re-evaluates this module on every change. Without a
// global cache we'd leak a new connection pool per reload until Postgres
// rejects new connections. The pattern is from Prisma's Next.js guide.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasourceUrl: databaseUrl } : {}),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
