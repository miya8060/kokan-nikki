"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { UpdateProfileError } from "@/app/_actions/errors";
import { auth } from "@/lib/auth";
import { serializePreset } from "@/lib/icons/presets";
import { prisma } from "@/lib/prisma";
import { isInternalCallbackUrl } from "@/lib/safe-redirect";
import { displayNameSchema, iconFormValueSchema } from "@/lib/schemas/user";

// F-USER-01: 表示名 (User.name) を更新する Server Action。
// onboarding (/onboarding/name) と /settings の両方から呼ばれる:
//   - onboarding 経由: hidden input "callbackUrl" で続きの遷移先を持ってきて、
//     更新成功後にそこへ redirect する。NF-SEC: open redirect 防御のため
//     internal URL でなければ無視して /notebooks に倒す。
//   - /settings 経由: callbackUrl を渡さないので revalidate して同ページに
//     留まる。
// SSR 側で session.user.name や member.user.name を直接読んでいる経路が複数
// あるので、層を絞った revalidatePath ではなく root layout を再検証する。

export async function setDisplayName(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new UpdateProfileError("unauthenticated");
  }

  const raw = formData.get("displayName");
  const parsed = displayNameSchema.safeParse(raw);
  if (!parsed.success) {
    throw new UpdateProfileError("invalid-input");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data },
  });

  revalidatePath("/", "layout");

  const callbackRaw = formData.get("callbackUrl");
  if (typeof callbackRaw === "string" && callbackRaw.length > 0) {
    redirect(isInternalCallbackUrl(callbackRaw) ? callbackRaw : "/notebooks");
  }
}

// F-USER-02: アイコン (User.image) を更新する Server Action。/settings からのみ
// 呼ばれる (onboarding 必須ではない / 未設定はデフォルトアイコンで成立)。
// 受理する値:
//   - "" : デフォルトアイコンに戻す (User.image = null)
//   - "heart" | "star" | "plus" | "dot" : preset:KEY を保存
// SSR 側 (notebooks 一覧 / 詳細) で member.user.image を直接参照するため
// revalidatePath は root layout で行う。
export async function setIcon(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new UpdateProfileError("unauthenticated");
  }

  const raw = formData.get("icon");
  const parsed = iconFormValueSchema.safeParse(raw);
  if (!parsed.success) {
    throw new UpdateProfileError("invalid-input");
  }

  const image = parsed.data === "" ? null : serializePreset(parsed.data);

  await prisma.user.update({
    where: { id: userId },
    data: { image },
  });

  revalidatePath("/", "layout");
}
