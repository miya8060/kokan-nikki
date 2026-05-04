import Link from "next/link";
import { redirect } from "next/navigation";

import { acceptInviteFromForm } from "@/app/_actions/invites";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { auth } from "@/lib/auth";
import { INVITE_CODE_PATTERN, NOTEBOOK_MAX_MEMBERS } from "@/lib/invites";
import { prisma } from "@/lib/prisma";

// F-INV-05: 未ログインで /invite/[code] を踏んだ場合はサインインに飛ばし、
// 認証後に同じ URL に戻して受諾フローを再開させる。サインインページの
// callbackUrl 側で /invite/* を許可するための明示的な誘導でもある。
//
// F-INV-06: 既メンバーが踏んだ場合は招待を消費せず、ノート詳細に冪等遷移する
// — その判定はこのページのレンダー時にも、acceptInvite アクション側にも
// 二重に置かれている (UI で一発リダイレクトしつつ、サーバーアクション側でも
// もう一度安全側に倒す)。
//
// F-INV-02 / F-INV-03 / F-INV-07: 期限切れ・使用済み・満員の状態は、専用の
// エラー UI を出してユーザーに次のアクションを示す。実際の claim はフォーム
// 送信時の acceptInvite が atomic に行うため、ここでの状態表示は best-effort。

type InviteErrorReason =
  | "invalid-code"
  | "expired"
  | "already-used"
  | "notebook-full";

const errorMessages: Record<
  InviteErrorReason,
  { title: string; description: string }
> = {
  "invalid-code": {
    title: "♡ みつから ない みたい",
    description:
      "この しょうたい リンクは そんざい しないか、もう つかえなく なって いるよ。",
  },
  expired: {
    title: "♡ ゆうこう きげん ぎれ",
    description:
      "この しょうたい リンクは ゆうこう きげんが すぎて しまった よ。にっきの メンバーに あたらしい リンクを はっこう して もらおう。",
  },
  "already-used": {
    title: "♡ もう つかわれて いるよ",
    description:
      "この しょうたい リンクは ほかの ひとが つかった あとだよ。あたらしい リンクを はっこう して もらおう。",
  },
  "notebook-full": {
    title: "♡ いっぱい だよ",
    description: `この にっきは すでに ${NOTEBOOK_MAX_MEMBERS} にん で いっぱい だから、これ いじょう さんか でき ない みたい。`,
  },
};

function InviteErrorView({ reason }: { reason: InviteErrorReason }) {
  const { title, description } = errorMessages[reason];
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <Sticker className="p-8 text-center sm:p-10">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-2xl sm:text-3xl">
          {title}
        </h1>
        <p className="text-ink-soft mt-4 text-sm leading-7 sm:text-base sm:leading-8">
          {description}
        </p>
        <div className="mt-6 flex justify-center">
          <PuffButton href="/notebooks" variant="alt">
            ♡ にっき いちらん へ
          </PuffButton>
        </div>
      </Sticker>
    </main>
  );
}

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    // F-INV-05: サインイン後に同 URL へ戻して受諾フローを継続させる。
    redirect(`/auth/signin?callbackUrl=/invite/${code}`);
  }
  if (!session.user?.name || session.user.name.trim().length === 0) {
    // F-USER-01: 招待 URL 経由の初回ログインも、ペアにメアドが見えないよう
    // 表示名を入れさせてから受諾フローに戻す。
    redirect(`/onboarding/name?callbackUrl=/invite/${code}`);
  }

  // ルートパラメータの形式チェック。zod 検証は acceptInvite 側にもあるが、
  // ここで弾いておけば DB を引かずに friendly エラーを出せる。
  if (!INVITE_CODE_PATTERN.test(code)) {
    return <InviteErrorView reason="invalid-code" />;
  }

  const invite = await prisma.invite.findUnique({
    where: { code },
    select: {
      notebookId: true,
      expiresAt: true,
      usedAt: true,
      notebook: {
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } },
        },
      },
    },
  });
  if (!invite) {
    return <InviteErrorView reason="invalid-code" />;
  }

  // F-INV-06: 既メンバーは招待消費なしで notebook に冪等遷移する。
  const existingMember = await prisma.notebookMember.findUnique({
    where: {
      notebookId_userId: { notebookId: invite.notebookId, userId },
    },
    select: { userId: true },
  });
  if (existingMember) {
    redirect(`/notebooks/${invite.notebookId}`);
  }

  const now = new Date();
  if (invite.usedAt !== null) {
    return <InviteErrorView reason="already-used" />;
  }
  if (invite.expiresAt.getTime() <= now.getTime()) {
    return <InviteErrorView reason="expired" />;
  }
  if (invite.notebook._count.members >= NOTEBOOK_MAX_MEMBERS) {
    return <InviteErrorView reason="notebook-full" />;
  }

  const submitAction = acceptInviteFromForm.bind(null, code);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="text-center">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl sm:text-4xl">
          ♡ しょうたい とどいた
        </h1>
        <p className="text-ink-soft mt-2 text-sm sm:text-base">
          {invite.notebook.name} に さんか しますか?
        </p>
      </header>

      <Sticker tape className="p-8 sm:p-10">
        <p className="text-ink-soft text-sm leading-7 sm:text-base sm:leading-8">
          このノートには いま {invite.notebook._count.members} にんが
          さんかちゅう。
          <br />
          さんか すると、じゅんばんに きみの ばんが まわって くるよ ♡
        </p>
        <form action={submitAction} className="mt-6 flex flex-col gap-3">
          <div className="flex justify-center">
            <PuffButton type="submit">♡ さんか する</PuffButton>
          </div>
        </form>
      </Sticker>

      <div className="text-center">
        <Link
          href="/notebooks"
          className="text-ink-soft text-xs underline"
        >
          いま は やめておく
        </Link>
      </div>
    </main>
  );
}
