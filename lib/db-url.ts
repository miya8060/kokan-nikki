// Neon's pooled endpoint runs PgBouncer in transaction mode, which breaks
// Prisma's default prepared-statement cache (statements don't survive
// across backend reuses). Setting pgbouncer=true tells Prisma to skip
// prepared statements. We detect the pooler by the `-pooler` host marker
// so direct/local URLs stay unaffected. The transformation is in code so
// the Vercel-Neon integration can keep managing DATABASE_URL untouched.
export function resolveDatabaseUrl(
  rawUrl: string | undefined,
): string | undefined {
  if (!rawUrl) return undefined;
  if (!rawUrl.includes("-pooler") || rawUrl.includes("pgbouncer=true")) {
    return rawUrl;
  }
  const sep = rawUrl.includes("?") ? "&" : "?";
  return `${rawUrl}${sep}pgbouncer=true&connect_timeout=15`;
}
