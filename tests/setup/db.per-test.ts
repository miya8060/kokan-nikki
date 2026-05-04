import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, inject } from "vitest";

// Bridge the testcontainer URL into process.env BEFORE any test file imports
// production modules: `@/lib/prisma` constructs its singleton from
// `process.env.DATABASE_URL`, so without this hop the code under test would
// silently target the dev DB (or fail to connect). setupFiles run after
// globalSetup in the worker, so inject() is populated by this point.
process.env.DATABASE_URL = inject("DATABASE_URL");

// Lazy singleton: globalSetup provides DATABASE_URL via inject(), but Prisma
// can't be constructed at module load because that would happen before
// globalSetup runs. We build it on first access from a test file instead.
let client: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient({
      datasources: { db: { url: inject("DATABASE_URL") } },
      log: ["error"],
    });
  }
  return client;
}

beforeEach(async () => {
  const prisma = getPrisma();
  // Order matters: child rows before their parents to avoid FK cascades
  // firing mid-truncate. RESTART IDENTITY resets serials in case any model
  // ever switches off cuid().
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE
       "UserMergeLog",
       "Nudge",
       "Invite",
       "Entry",
       "NotebookMember",
       "Notebook",
       "Session",
       "Account",
       "VerificationToken",
       "User"
     RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await client?.$disconnect();
});
