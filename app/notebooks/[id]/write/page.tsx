import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { postEntryFromForm } from "@/app/_actions/notebooks";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { auth } from "@/lib/auth";
import { getNotebookDetail } from "@/lib/notebooks";
import { ENTRY_BODY_MAX, ENTRY_TITLE_MAX } from "@/lib/schemas/entry";

// F-TURN-05 の UI 側ガード。サーバー側の postEntry も同じ判定をするので二重に
// なるが、URL を直接叩いた場合に書き込み画面が「描画されてしまう」のを避ける
// ため、ここでもターン外なら詳細ページに redirect する。e2e-03 はこの redirect
// が確かに発火することを検証する。

export default async function NotebookWritePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/auth/signin?callbackUrl=/notebooks/${id}/write`);
  }
  if (!session.user?.name || session.user.name.trim().length === 0) {
    redirect(`/onboarding/name?callbackUrl=/notebooks/${id}/write`);
  }

  const detail = await getNotebookDetail(id, userId);
  if (!detail) notFound();

  if (!detail.isYourTurn) {
    // F-TURN-05 UI ガード: 他人のターン中の直アクセスは詳細ページに戻す。
    // notFound ではなく redirect にしているのは「ノートは存在する／自分は
    // メンバー」が真である情報量を尊重するため (タイムラインは見せたい)。
    redirect(`/notebooks/${detail.id}`);
  }

  const submitAction = postEntryFromForm.bind(null, detail.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="text-center">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl">
          ♡ きょうの にっき
        </h1>
        <p className="text-ink-soft mt-2 text-sm">{detail.name}</p>
      </header>

      <Sticker tape className="p-8">
        <form action={submitAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-left">
            <span className="text-ink-soft text-xs tracking-wider uppercase">
              title
            </span>
            <input
              name="title"
              required
              maxLength={ENTRY_TITLE_MAX}
              placeholder="きょうの にっき タイトル"
              className="border-ink text-ink focus:ring-pink rounded-2xl border-2 bg-white px-4 py-3 text-base shadow-[0_3px_0_var(--ink)] outline-none focus:ring-2"
            />
          </label>
          <label className="flex flex-col gap-2 text-left">
            <span className="text-ink-soft text-xs tracking-wider uppercase">
              body
            </span>
            <textarea
              name="body"
              required
              rows={10}
              maxLength={ENTRY_BODY_MAX}
              placeholder="きょう あった こと、かんじた こと…"
              className="border-ink text-ink focus:ring-pink rounded-2xl border-2 bg-white px-4 py-3 text-base leading-7 shadow-[0_3px_0_var(--ink)] outline-none focus:ring-2"
            />
          </label>
          <div className="flex flex-col items-center gap-3 pt-2">
            <PuffButton type="submit">♡ かきおわった</PuffButton>
            <Link
              href={`/notebooks/${detail.id}`}
              className="text-ink-soft text-xs underline"
            >
              ← もどる
            </Link>
          </div>
        </form>
      </Sticker>
    </main>
  );
}
