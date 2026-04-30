import { PrismaClient } from "@prisma/client";

// In dev, Next.js HMR re-evaluates this module on every change. Without a
// global cache we'd leak a new connection pool per reload until Postgres
// rejects new connections. The pattern is from Prisma's Next.js guide.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Neon's pooled endpoint runs PgBouncer in transaction mode, which breaks
// Prisma's default prepared-statement cache (statements don't survive across
// backend reuses). Setting pgbouncer=true tells Prisma to skip prepared
// statements. Detect by the `-pooler` host marker so direct/local URLs
// stay unaffected. We mutate the URL in code rather than editing the env
// value so the Vercel-Neon integration can keep managing DATABASE_URL.
function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  if (!raw.includes("-pooler") || raw.includes("pgbouncer=true")) return raw;
  const sep = raw.includes("?") ? "&" : "?";
  return `${raw}${sep}pgbouncer=true&connect_timeout=15`;
}

const databaseUrl = resolveDatabaseUrl();

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
