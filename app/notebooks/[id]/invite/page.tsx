import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { createInviteFromForm } from "@/app/_actions/invites";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { auth } from "@/lib/auth";
import { getNotebookDetail } from "@/lib/notebooks";
import { prisma } from "@/lib/prisma";

// F-INV-01: ノートメンバーは招待 URL を発行できる。
// F-INV-04: 同じノートで複数の有効な招待コードを同時保持しない (既存があれば
// 再利用)。createInvite アクションがその挙動を担保しているので、ここでは
// 「既に有効なコードがあれば URL を表示」「無ければ発行ボタン」の二値表示で
// よい。発行ボタンは createInviteFromForm を呼び、revalidate 後の再描画で
// URL が出る。

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  // C-04: 表示は Asia/Tokyo、内部は UTC のまま。
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function NotebookInvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/auth/signin?callbackUrl=/notebooks/${id}/invite`);
  }

  // 詳細ページと同じ判定 (NF-SEC-04): 非メンバー / 存在しない id は notFound。
  const detail = await getNotebookDetail(id, userId);
  if (!detail) notFound();

  const now = new Date();
  const active = await prisma.invite.findFirst({
    where: {
      notebookId: detail.id,
      usedAt: null,
      expiresAt: { gt: now },
    },
    select: { code: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });

  let inviteUrl: string | null = null;
  if (active) {
    // 共有用の絶対 URL を組み立てる。Vercel / 開発で proto / host が違うため
    // x-forwarded-proto を優先しつつ host header から origin を作る。
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("host") ?? "localhost:3000";
    inviteUrl = `${proto}://${host}/invite/${active.code}`;
  }

  const submitAction = createInviteFromForm.bind(null, detail.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="text-center">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl">
          ♡ しょうたい りんく
        </h1>
        <p className="text-ink-soft mt-2 text-sm">{detail.name}</p>
      </header>

      <Sticker tape className="p-8">
        {active && inviteUrl ? (
          <div className="flex flex-col gap-4">
            <p className="text-ink-soft text-sm leading-7">
              この URL を ともだち に おくると、おなじ にっきに さんかして
              もらえるよ ♡
            </p>
            <input
              readOnly
              value={inviteUrl}
              aria-label="しょうたい URL"
              className="border-ink text-ink rounded-2xl border-2 bg-white px-4 py-3 font-mono text-sm shadow-[0_3px_0_var(--ink)] outline-none"
            />
            <p className="text-ink-soft text-xs">
              ゆうこう きげん: {dateFormatter.format(active.expiresAt)}
            </p>
          </div>
        ) : (
          <form action={submitAction} className="flex flex-col gap-4">
            <p className="text-ink-soft text-sm leading-7">
              まだ しょうたい りんくが ないよ。
              <br />
              はっこう すると 7 にちかん つかえる コードが できるよ。
            </p>
            <div className="flex justify-center pt-2">
              <PuffButton type="submit">♡ はっこう する</PuffButton>
            </div>
          </form>
        )}
      </Sticker>

      <div className="text-center">
        <Link
          href={`/notebooks/${detail.id}`}
          className="text-ink-soft text-xs underline"
        >
          ← もどる
        </Link>
      </div>
    </main>
  );
}
