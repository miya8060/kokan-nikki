"use server";

import { redirect } from "next/navigation";

import { auth, signIn } from "@/lib/auth";
import {
  clearLinkIntent,
  generateCsrfToken,
  readLinkIntent,
  setLinkIntentStarted,
} from "@/lib/auth/link-intent";
import { mergeUsers } from "@/lib/auth/merge-user";
import { prisma } from "@/lib/prisma";

// F-AUTH-06 / issue #68 Stage 2
// /settings からの linking flow の入口/出口になる server actions。

const LINKABLE_PROVIDERS = ["twitter"] as const;
type LinkableProvider = (typeof LINKABLE_PROVIDERS)[number];

function isLinkableProvider(value: unknown): value is LinkableProvider {
  return (
    typeof value === "string" &&
    (LINKABLE_PROVIDERS as readonly string[]).includes(value)
  );
}

/**
 * /settings の「X を連携」ボタンから呼ばれる。signed cookie に「現 User#A が
 * X 連携を開始した」状態を立て、Auth.js の signIn() で OAuth flow を開始する。
 *
 * 結果は signIn callback (lib/auth.ts) と /settings/link/* ページが処理する。
 */
export async function startLinkAccount(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/settings");
  }

  const provider = formData.get("provider");
  if (!isLinkableProvider(provider)) {
    throw new Error(`Unsupported link provider: ${String(provider)}`);
  }

  // 既に同 provider が link 済なら開始しない (UI 側でも非表示だが多重防御)。
  const already = await prisma.account.findFirst({
    where: { userId: session.user.id, provider },
    select: { id: true },
  });
  if (already) {
    redirect("/settings?link=already");
  }

  await setLinkIntentStarted({
    toUserId: session.user.id,
    csrf: generateCsrfToken(),
  });

  await signIn(provider, { redirectTo: "/settings/link/result" });
}

/**
 * /settings/link/confirm の「統合する」最終ボタンから呼ばれる。
 *
 * 多重防御:
 *  1. cookie が pending-confirm 状態か
 *  2. cookie の csrf と form の csrf が一致するか
 *  3. cookie の toUserId と現 session の userId が一致するか
 *  4. cookie の fromUserId に X account が現在も link 済か (signIn callback
 *     後に何かが起こった場合の保険)
 */
export async function confirmLinkMerge(formData: FormData) {
  const intent = await readLinkIntent();
  if (!intent || intent.state !== "pending-confirm") {
    await clearLinkIntent();
    redirect("/settings?link=expired");
  }

  const csrf = formData.get("csrf");
  if (typeof csrf !== "string" || csrf !== intent.csrf) {
    await clearLinkIntent();
    redirect("/settings?link=error");
  }

  const session = await auth();
  if (!session?.user?.id || session.user.id !== intent.toUserId) {
    await clearLinkIntent();
    redirect("/settings?link=error");
  }

  const stillLinked = await prisma.account.findFirst({
    where: { userId: intent.fromUserId, provider: intent.provider },
    select: { id: true },
  });
  if (!stillLinked) {
    await clearLinkIntent();
    redirect("/settings?link=expired");
  }

  const result = await mergeUsers({
    prisma,
    fromUserId: intent.fromUserId,
    toUserId: intent.toUserId,
  });

  await clearLinkIntent();

  if (result.status !== "ok") {
    redirect(`/settings?link=merge-${result.reason}`);
  }
  redirect("/settings?link=merged");
}

/**
 * /settings/link/confirm の「やめる」ボタンから呼ばれる。
 * cookie を破棄して /settings に戻すだけ。
 */
export async function cancelLinkMerge() {
  await clearLinkIntent();
  redirect("/settings?link=cancelled");
}
