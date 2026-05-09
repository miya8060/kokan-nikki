"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ToggleNotebookFavoriteError } from "@/app/_actions/errors";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// issue #129: notebook 一覧 ♡ favorite トグル。
// - 状態は (userId, notebookId) で persist (UserNotebookFavorite)
// - revalidatePath("/notebooks") で SSR の isFavorite を更新する。client 側で
//   useOptimistic を使うので、success path での視覚的なちらつきはほぼ無いが、
//   別タブ navigate 時に整合させるため revalidate も必須。

const toggleNotebookFavoriteInputSchema = z.object({
  notebookId: z.string().min(1),
});

type ToggleNotebookFavoriteInput = z.infer<
  typeof toggleNotebookFavoriteInputSchema
>;

export async function toggleNotebookFavorite(
  input: ToggleNotebookFavoriteInput,
): Promise<{ favorited: boolean }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new ToggleNotebookFavoriteError("unauthenticated");
  }

  const parsed = toggleNotebookFavoriteInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ToggleNotebookFavoriteError("invalid-input");
  }
  const { notebookId } = parsed.data;

  // NF-SEC-04: 自分が member の notebook しか favorite に出来ない。一覧 UI 上は
  // そもそも自分の memberships しか並ばないので普通は不要だが、Server Action は
  // notebookId を直で叩けるので server 側でも検証する。
  const member = await prisma.notebookMember.findUnique({
    where: { notebookId_userId: { notebookId, userId } },
    select: { userId: true },
  });
  if (!member) {
    throw new ToggleNotebookFavoriteError("not-member");
  }

  // create / delete の往復で「いま ON か」を決め、結果の favorited を返す。
  // 同 row への並列 toggle は P2002 / P2025 で例外になりうるが、UI の useTransition
  // が直列化してくれる前提でリトライはしない。エラー時 client 側で巻き戻す。
  const existing = await prisma.userNotebookFavorite.findUnique({
    where: { userId_notebookId: { userId, notebookId } },
    select: { userId: true },
  });

  if (existing) {
    await prisma.userNotebookFavorite.delete({
      where: { userId_notebookId: { userId, notebookId } },
    });
    revalidatePath("/notebooks");
    return { favorited: false };
  }

  await prisma.userNotebookFavorite.create({
    data: { userId, notebookId },
  });
  revalidatePath("/notebooks");
  return { favorited: true };
}
