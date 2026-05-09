"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { UpdateProfileError } from "@/app/_actions/errors";
import { auth } from "@/lib/auth";
import { isUploadedIconUrl, serializePreset } from "@/lib/icons/presets";
import { prisma } from "@/lib/prisma";
import { isInternalCallbackUrl } from "@/lib/safe-redirect";
import {
  displayNameSchema,
  iconFormValueSchema,
  iconUploadSchema,
} from "@/lib/schemas/user";

// F-USER-03: 旧アップロード画像が残っていれば Vercel Blob から削除する。
// 削除失敗 (既に消えている / 別 store の URL 等) は新画像の保存を邪魔しないよう
// 飲み込む (孤児 blob は残るが致命的ではない)。
async function deleteOldUploadedIcon(image: string | null): Promise<void> {
  if (!isUploadedIconUrl(image)) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(image);
  } catch (e) {
    console.warn("[profile] failed to delete old icon blob", {
      image,
      error: e,
    });
  }
}

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
// F-USER-03: 旧 image がアップロード URL なら Vercel Blob からも削除して孤児を残さない。
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

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { image },
  });

  await deleteOldUploadedIcon(current?.image ?? null);

  revalidatePath("/", "layout");
}

// F-USER-03: アイコン画像をアップロードする Server Action。/settings の
// IconUploadForm (Client Component) が canvas で 256x256 jpeg に正規化した
// File を multipart で送ってくる。Server 側でも mime / size を再検証 (信頼源)。
//   - BLOB_READ_WRITE_TOKEN 未設定 (Preview / 一部 dev): "upload-disabled" で
//     422 相当を返す。preset 経路はこのとき通常通り使える。
//   - put は addRandomSuffix:true 必須。@vercel/blob v1 まではデフォルト true
//     だったが v2 で false に変わったため、明示しないと 2 回目以降の同 key put
//     が "blob already exists" で 500 になる。random suffix で URL が毎回変わる
//     = CDN/<img> キャッシュも汚染されないので副次的に都合が良い。
//   - put 成功後、旧 image がアップロード URL なら同期 del() で消す。失敗は
//     ログだけ残して続行 (孤児 blob を許容)。
export async function uploadIcon(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new UpdateProfileError("unauthenticated");
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new UpdateProfileError("upload-disabled");
  }

  const parsed = iconUploadSchema.safeParse({ file: formData.get("file") });
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message;
    if (code === "too-large") {
      throw new UpdateProfileError("upload-too-large");
    }
    if (code === "invalid-type") {
      throw new UpdateProfileError("upload-invalid-type");
    }
    throw new UpdateProfileError("upload-failed");
  }

  const { file } = parsed.data;

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });

  const { put } = await import("@vercel/blob");
  const result = await put(`users/${userId}/icon.jpg`, file, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: true,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { image: result.url },
  });

  await deleteOldUploadedIcon(current?.image ?? null);

  revalidatePath("/", "layout");
}
