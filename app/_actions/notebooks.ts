"use server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entryBodySchema } from "@/lib/schemas/entry";
import { isUsersTurn } from "@/lib/turn";

const postEntryInputSchema = z.object({
  notebookId: z.string().min(1),
  body: entryBodySchema,
});

export type PostEntryInput = z.infer<typeof postEntryInputSchema>;

export type PostEntryReason =
  | "unauthenticated"
  | "invalid-input"
  | "not-member"
  | "not-your-turn";

// Action-specific error so tests (and future UI handlers) can discriminate on
// `reason` instead of brittle message matching. UI layer decides whether to
// redirect to /auth/signin (unauthenticated) or render a 403 page.
export class PostEntryError extends Error {
  readonly reason: PostEntryReason;

  constructor(reason: PostEntryReason) {
    super(reason);
    this.name = "PostEntryError";
    this.reason = reason;
  }
}

export async function postEntry(
  input: PostEntryInput,
): Promise<{ entryId: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new PostEntryError("unauthenticated");
  }

  const parsed = postEntryInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new PostEntryError("invalid-input");
  }
  const { notebookId, body } = parsed.data;

  // NF-SEC-04: membership is verified server-side, independent of the UI's
  // turn check. Non-members must not even reach the turn predicate.
  const member = await prisma.notebookMember.findUnique({
    where: { notebookId_userId: { notebookId, userId } },
    select: { userId: true },
  });
  if (!member) {
    throw new PostEntryError("not-member");
  }

  // F-TURN-05 server-side guard: even members can only post on their turn.
  if (!(await isUsersTurn(notebookId, userId))) {
    throw new PostEntryError("not-your-turn");
  }

  const entry = await prisma.entry.create({
    data: { notebookId, authorId: userId, body },
    select: { id: true },
  });
  return { entryId: entry.id };
}
