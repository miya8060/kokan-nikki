import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, inject } from "vitest";

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
