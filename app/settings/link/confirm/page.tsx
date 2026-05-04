import { redirect } from "next/navigation";

import {
  cancelLinkMerge,
  confirmLinkMerge,
} from "@/app/_actions/link-account";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { auth } from "@/lib/auth";
import { readLinkIntent } from "@/lib/auth/link-intent";
import { prisma } from "@/lib/prisma";

// F-AUTH-06 / issue #68 Stage 2
// Auth.js signIn callback で Case 2 (既存 X account が別 user に link 済) と
// 判定されたときに redirect してくる先。
//
// このページは「2 段階確認」の 1 段目を表示する。step=2 の query が付いている
// ときに 2 段目を出し、そこから confirmLinkMerge server action を叩く。
//
// 攻撃面: cookie が pending-confirm でない / session と toUserId が一致しない
// 場合は表示しない。confirmLinkMerge 側でも同じチェックを行う多重防御。

type LinkConfirmPageProps = {
  searchParams: Promise<{ step?: string | string[] }>;
};

export default async function LinkConfirmPage({
  searchParams,
}: LinkConfirmPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/settings");
  }

  const intent = await readLinkIntent();
  if (!intent || intent.state !== "pending-confirm") {
    redirect("/settings?link=expired");
  }
  if (intent.toUserId !== session.user.id) {
    redirect("/settings?link=error");
  }

  const fromUser = await prisma.user.findUnique({
    where: { id: intent.fromUserId },
    select: {
      id: true,
      name: true,
      _count: {
        select: { entries: true, memberships: true },
      },
    },
  });
  if (!fromUser) {
    redirect("/settings?link=expired");
  }

  const params = await searchParams;
  const step =
    (Array.isArray(params.step) ? params.step[0] : params.step) === "2" ? 2 : 1;

  const fromLabel = fromUser.name?.trim() || "(なまえ なし)";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <Sticker tape className="p-8 sm:p-10">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-2xl sm:text-3xl">
          ♡ 連携 と 統合 を かくにん
        </h1>
        <p className="text-ink-soft mt-3 text-sm leading-7 sm:text-base sm:leading-8">
          この X アカウントは すでに <strong>{fromLabel}</strong>{" "}
          という 別の アカウントに 紐付いて いる。
        </p>
        <p className="text-ink-soft mt-2 text-sm leading-7 sm:text-base sm:leading-8">
          にっき{fromUser._count.entries} こ ・ さんかちゅう の こうかん{" "}
          {fromUser._count.memberships} こ を 今の アカウントに とうごう する。
        </p>

        {step === 1 ? (
          <div
            className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-center"
            data-testid="link-confirm-step-1"
          >
            <form action={cancelLinkMerge}>
              <PuffButton
                type="submit"
                variant="alt"
                data-testid="link-confirm-cancel"
              >
                やめる
              </PuffButton>
            </form>
            <PuffButton
              href="/settings/link/confirm?step=2"
              data-testid="link-confirm-next"
            >
              ♡ つぎへ
            </PuffButton>
          </div>
        ) : (
          <>
            <p className="text-ink mt-6 text-sm leading-7 sm:text-base sm:leading-8">
              <strong>本当に 統合 しますか？</strong> もう 元には もどせない。
            </p>
            <div
              className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-center"
              data-testid="link-confirm-step-2"
            >
              <form action={cancelLinkMerge}>
                <PuffButton
                  type="submit"
                  variant="alt"
                  data-testid="link-confirm-cancel-final"
                >
                  やめる
                </PuffButton>
              </form>
              <form action={confirmLinkMerge}>
                <input type="hidden" name="csrf" value={intent.csrf} />
                <PuffButton type="submit" data-testid="link-confirm-merge">
                  ♡ 統合 する
                </PuffButton>
              </form>
            </div>
          </>
        )}
      </Sticker>
    </main>
  );
}
