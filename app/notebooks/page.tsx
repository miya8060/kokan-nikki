import Link from "next/link";
import { redirect } from "next/navigation";

import { createNotebookFromForm } from "@/app/_actions/notebooks";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NOTEBOOK_NAME_MAX } from "@/lib/schemas/notebook";
import { getNextTurnUserId } from "@/lib/turn";

// F-NB-04: 自分が参加しているノートの一覧を最終更新日時 + 次のターン者と一緒に
// 表示する。一覧にぶら下げる新規作成フォームは F-NB-01 / F-NB-03 を満たす。

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  // C-04: 表示は Asia/Tokyo、内部は UTC のまま。
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function NotebooksPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/auth/signin?callbackUrl=/notebooks");
  }
  if (!session.user?.name || session.user.name.trim().length === 0) {
    redirect("/onboarding/name?callbackUrl=/notebooks");
  }

  const memberships = await prisma.notebookMember.findMany({
    where: { userId },
    select: {
      joinedAt: true,
      notebook: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          entries: {
            select: { createdAt: true },
            // NF-CON-02: 同 createdAt のときも一意な順序にするため id を併用。
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 1,
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const items = await Promise.all(
    memberships.map(async ({ notebook }) => {
      const lastUpdatedAt =
        notebook.entries[0]?.createdAt ?? notebook.createdAt;
      const nextTurnUserId = await getNextTurnUserId(notebook.id);
      const nextTurnUser = nextTurnUserId
        ? await prisma.user.findUnique({
            where: { id: nextTurnUserId },
            select: { id: true, name: true, email: true },
          })
        : null;
      return {
        id: notebook.id,
        name: notebook.name,
        lastUpdatedAt,
        nextTurnLabel: nextTurnUser
          ? (nextTurnUser.name ?? nextTurnUser.email)
          : "—",
        isYourTurn: nextTurnUserId === userId,
      };
    }),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="relative text-center">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl">
          ♡ にっき いちらん
        </h1>
        <p className="text-ink-soft mt-2 text-sm">
          {items.length} さつ の こうかんにっき
        </p>
        <Link
          href="/settings"
          data-testid="nav-settings"
          className="text-ink-soft hover:text-pink-2 absolute top-0 right-0 text-xs underline-offset-4 hover:underline"
        >
          ⚙ せってい
        </Link>
      </header>

      <Sticker tape className="p-8">
        <h2 className="text-ink font-[family-name:var(--font-mochi)] text-xl">
          ★ あたらしい にっき
        </h2>
        <form
          action={createNotebookFromForm}
          className="mt-4 flex flex-col gap-3"
        >
          <label className="flex flex-col gap-2 text-left">
            <span className="text-ink-soft text-xs tracking-wider uppercase">
              name
            </span>
            <input
              type="text"
              name="name"
              required
              maxLength={NOTEBOOK_NAME_MAX}
              placeholder="ひみつ こうかんにっき"
              className="border-ink text-ink focus:ring-pink rounded-2xl border-2 bg-white px-4 py-3 text-base shadow-[0_3px_0_var(--ink)] outline-none focus:ring-2"
            />
          </label>
          <div className="flex justify-center pt-2">
            <PuffButton type="submit">♡ つくる</PuffButton>
          </div>
        </form>
      </Sticker>

      {items.length === 0 ? (
        <Sticker className="p-8 text-center">
          <p className="text-ink-soft text-sm leading-7">
            まだ にっきが ないよ。
            <br />
            さいしょの 1 さつを つくってみよう ♡
          </p>
        </Sticker>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/notebooks/${item.id}`}
                className="block transition hover:-translate-y-0.5"
              >
                <Sticker className="p-6">
                  <h3 className="text-ink font-[family-name:var(--font-mochi)] text-lg">
                    {item.name}
                  </h3>
                  <dl className="text-ink-soft mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt>さいしゅう こうしん</dt>
                    <dd>{dateFormatter.format(item.lastUpdatedAt)}</dd>
                    <dt>つぎの ばん</dt>
                    <dd>
                      {item.isYourTurn ? (
                        <strong className="text-pink-2">あなた ♡</strong>
                      ) : (
                        item.nextTurnLabel
                      )}
                    </dd>
                  </dl>
                </Sticker>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
