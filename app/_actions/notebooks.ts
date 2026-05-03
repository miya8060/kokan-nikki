"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { CreateNotebookError, PostEntryError } from "@/app/_actions/errors";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entryBodySchema, entryTitleSchema } from "@/lib/schemas/entry";
import { notebookNameSchema } from "@/lib/schemas/notebook";
import { isUsersTurn } from "@/lib/turn";

// Next 16 の "use server" 制約: このファイルからは async 関数しか export できない。
// CreateNotebookError / PostEntryError と Reason 型の定義は ./errors.ts に逃がし、
// テストや UI ハンドラはそちらから直接 import する。

const createNotebookInputSchema = z.object({
  name: notebookNameSchema,
});

type CreateNotebookInput = z.infer<typeof createNotebookInputSchema>;

export async function createNotebook(
  input: CreateNotebookInput,
): Promise<{ notebookId: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new CreateNotebookError("unauthenticated");
  }

  const parsed = createNotebookInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new CreateNotebookError("invalid-input");
  }
  const { name } = parsed.data;

  // F-NB-03: 作成者を orderIndex=0 のメンバーとして同時に登録する。
  // nested write で 1 トランザクションに包むことで、Notebook だけ生成されて
  // メンバーが居ない宙ぶらりんな状態にならないようにする。
  const notebook = await prisma.notebook.create({
    data: {
      name,
      createdById: userId,
      members: {
        create: { userId, orderIndex: 0 },
      },
    },
    select: { id: true },
  });
  return { notebookId: notebook.id };
}

// Form-action shim so <form action={createNotebookFromForm}> on the /notebooks
// page can call createNotebook with a typed payload. Validation errors bubble
// up to the framework error boundary; the typed action stays the place where
// reasons are discriminated.
export async function createNotebookFromForm(
  formData: FormData,
): Promise<void> {
  const raw = formData.get("name");
  await createNotebook({ name: typeof raw === "string" ? raw : "" });
  revalidatePath("/notebooks");
  redirect("/notebooks");
}

const postEntryInputSchema = z.object({
  notebookId: z.string().min(1),
  title: entryTitleSchema,
  body: entryBodySchema,
});

type PostEntryInput = z.infer<typeof postEntryInputSchema>;

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
  const { notebookId, title, body } = parsed.data;

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
    data: { notebookId, authorId: userId, title, body },
    select: { id: true },
  });
  return { entryId: entry.id };
}

// Form-action shim for /notebooks/[id]/write. The notebookId is bound at
// render time (`postEntryFromForm.bind(null, notebookId)`) so it cannot be
// spoofed via a hidden input. Validation/auth/turn errors bubble up to the
// framework error boundary; the typed action is still where reasons are
// discriminated by tests and future explicit handlers.
export async function postEntryFromForm(
  notebookId: string,
  formData: FormData,
): Promise<void> {
  const rawTitle = formData.get("title");
  const rawBody = formData.get("body");
  await postEntry({
    notebookId,
    title: typeof rawTitle === "string" ? rawTitle : "",
    body: typeof rawBody === "string" ? rawBody : "",
  });
  revalidatePath(`/notebooks/${notebookId}`);
  redirect(`/notebooks/${notebookId}`);
}
