import { notFound, redirect } from "next/navigation";

import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { auth } from "@/lib/auth";
import { getNotebookDetail } from "@/lib/notebooks";

// F-TURN-04: タイムラインは新しい順。F-TURN-05 の UI 側ガードは /write 側で
// 行うため、ここでは「自分のターンのときだけ書き込み導線を出す」までに留める。

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  // C-04: 表示は Asia/Tokyo、内部は UTC のまま。
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function NotebookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/auth/signin?callbackUrl=/notebooks/${id}`);
  }

  // 非メンバー / 存在しないノートはどちらも notFound。NF-SEC-04 の観点で
  // 「このノートはあるが入れない」を漏らさないため。
  const detail = await getNotebookDetail(id, userId);
  if (!detail) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="text-center">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl">
          ♡ {detail.name}
        </h1>
        <p className="text-ink-soft mt-2 text-sm">
          {detail.members.length} にん で こうかんちゅう
        </p>
      </header>

      <Sticker className="p-6">
        <dl className="text-ink-soft grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt>つぎの ばん</dt>
          <dd>
            {detail.isYourTurn ? (
              <strong className="text-pink-2">あなた ♡</strong>
            ) : (
              (detail.nextTurnDisplayName ?? "—")
            )}
          </dd>
          <dt>メンバー</dt>
          <dd>{detail.members.map((m) => m.displayName).join(" / ")}</dd>
        </dl>
        {detail.isYourTurn ? (
          <div className="flex justify-center pt-4">
            <PuffButton href={`/notebooks/${detail.id}/write`}>
              ♡ きょうの にっきを かく
            </PuffButton>
          </div>
        ) : (
          <p className="text-ink-soft mt-4 text-center text-xs">
            つぎの ばんの ひとが かいたら じゅんばんが まわってくるよ
          </p>
        )}
      </Sticker>

      <section className="flex flex-col gap-4">
        <h2 className="text-ink font-[family-name:var(--font-mochi)] text-xl">
          ★ これまでの にっき
        </h2>
        {detail.entries.length === 0 ? (
          <Sticker className="p-8 text-center">
            <p className="text-ink-soft text-sm leading-7">
              まだ なにも かかれて いないよ。
              <br />
              さいしょの 1 ぺーじを かいてみよう ♡
            </p>
          </Sticker>
        ) : (
          <ul className="flex flex-col gap-4">
            {detail.entries.map((entry) => (
              <li key={entry.id}>
                <Sticker className="p-6">
                  <header className="text-ink-soft flex flex-wrap items-baseline justify-between gap-2 text-xs">
                    <span className="text-ink font-[family-name:var(--font-mochi)] text-base">
                      {entry.authorDisplayName}
                    </span>
                    <time dateTime={entry.createdAt.toISOString()}>
                      {dateFormatter.format(entry.createdAt)}
                    </time>
                  </header>
                  <p className="text-ink mt-3 text-sm leading-7 whitespace-pre-wrap">
                    {entry.body}
                  </p>
                </Sticker>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
