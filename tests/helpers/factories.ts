import { randomBytes } from "node:crypto";
import type { PrismaClient, User, Notebook, Entry, Invite } from "@prisma/client";

// Factories take a PrismaClient explicitly so they're decoupled from the
// per-test setup module — that lets unit tests construct fixtures in-memory
// without booting the integration container.

const rand = () => randomBytes(6).toString("hex");

export async function makeUser(
  prisma: PrismaClient,
  overrides: Partial<Pick<User, "email" | "name">> = {},
): Promise<User> {
  return prisma.user.create({
    data: {
      email: overrides.email ?? `${rand()}@test.local`,
      name: overrides.name ?? null,
      emailVerified: new Date(),
    },
  });
}

export async function makeNotebook(
  prisma: PrismaClient,
  args: { owner: User; members?: User[]; name?: string },
): Promise<Notebook> {
  const allMembers = [args.owner, ...(args.members ?? [])];
  return prisma.notebook.create({
    data: {
      name: args.name ?? `notebook-${rand()}`,
      createdById: args.owner.id,
      members: {
        create: allMembers.map((u, i) => ({
          userId: u.id,
          orderIndex: i,
        })),
      },
    },
  });
}

export async function makeEntry(
  prisma: PrismaClient,
  args: {
    notebook: Notebook;
    author: User;
    body?: string;
    createdAt?: Date;
  },
): Promise<Entry> {
  return prisma.entry.create({
    data: {
      notebookId: args.notebook.id,
      authorId: args.author.id,
      body: args.body ?? `entry-${rand()}`,
      ...(args.createdAt && { createdAt: args.createdAt }),
    },
  });
}

export async function makeInvite(
  prisma: PrismaClient,
  args: { notebook: Notebook; expiresInDays?: number },
): Promise<Invite> {
  const days = args.expiresInDays ?? 7;
  return prisma.invite.create({
    data: {
      notebookId: args.notebook.id,
      code: rand() + rand(),
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    },
  });
}

export async function makeNudge(
  prisma: PrismaClient,
  args: {
    notebook: Notebook;
    from: User;
    to: User;
    createdAt?: Date;
  },
) {
  return prisma.nudge.create({
    data: {
      notebookId: args.notebook.id,
      fromUserId: args.from.id,
      toUserId: args.to.id,
      ...(args.createdAt && { createdAt: args.createdAt }),
    },
  });
}

export async function makeSession(
  prisma: PrismaClient,
  args: { user: User; expiresInDays?: number },
) {
  const days = args.expiresInDays ?? 30;
  return prisma.session.create({
    data: {
      userId: args.user.id,
      sessionToken: rand() + rand(),
      expires: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    },
  });
}
