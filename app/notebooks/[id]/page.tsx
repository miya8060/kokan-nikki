import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getNotebookDetail } from "@/lib/notebooks";
import { prisma } from "@/lib/prisma";

import { DiaryHero } from "./_components/DiaryHero";
import { EntriesList } from "./_components/EntriesList";
import { StatusCard } from "./_components/StatusCard";
import styles from "./notebook-detail.module.css";

// F-TURN-04: タイムラインは新しい順。F-TURN-05 の UI 側ガードは /write 側で
// 行うため、ここでは「自分のターンのときだけ書き込み導線を出す」までに留める。
// F-NUDGE-01〜02: ターン外のメンバーには「もう書いた？」ボタンを出す。
// 24h 以内に送信済みならボタンを無効化して案内を出す (NUDGE_RATE_LIMIT_MS)。

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
  if (!session.user?.name || session.user.name.trim().length === 0) {
    redirect(`/onboarding/name?callbackUrl=/notebooks/${id}`);
  }

  // 非メンバー / 存在しないノートはどちらも notFound。NF-SEC-04 の観点で
  // 「このノートはあるが入れない」を漏らさないため。
  const detail = await getNotebookDetail(id, userId);
  if (!detail) notFound();

  // No.XX 表示用の通し番号は viewer の参加ノート全体での位置 (joinedAt ASC、
  // 一覧画面と同じ順序)。ID だけ引いて index を取る軽い query。
  const memberships = await prisma.notebookMember.findMany({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    select: { notebookId: true },
  });
  const serialNo =
    Math.max(
      0,
      memberships.findIndex((m) => m.notebookId === detail.id),
    ) + 1;

  return (
    <main className={styles.page}>
      <Link href="/notebooks" className={styles.backPill}>
        <span className={styles.backPillArrow} aria-hidden="true">
          ←
        </span>
        にっき いちらん
      </Link>

      <DiaryHero notebook={detail} serialNo={serialNo} />

      <StatusCard notebook={detail} viewerUserId={userId} />

      {detail.entries.length === 0 ? (
        <section className={styles.entries}>
          <h2 className={styles.entriesTitle}>
            <span className={styles.entriesStar} aria-hidden="true">
              ★
            </span>
            これまでの にっき
            <span className={styles.entriesBadge}>0</span>
          </h2>
          <div className={styles.entriesEmpty}>
            まだ なにも かかれて いないよ。
            <br />
            さいしょの 1 ぺーじを かいてみよう ♡
          </div>
        </section>
      ) : (
        <EntriesList
          entries={detail.entries}
          notebookId={detail.id}
          viewerUserId={userId}
        />
      )}

      <Link href="/notebooks" className={styles.bottomBack}>
        <span className={styles.bottomBackArrow} aria-hidden="true">
          ←
        </span>
        にっき いちらん へ もどる
      </Link>
    </main>
  );
}
