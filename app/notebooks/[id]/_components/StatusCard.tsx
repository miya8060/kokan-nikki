import Link from "next/link";

import { sendNudgeFromForm } from "@/app/_actions/nudges";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { NotebookDetail } from "@/lib/notebooks";
import { NUDGE_RATE_LIMIT_MS } from "@/lib/nudges";

import styles from "../notebook-detail.module.css";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  // C-04: 表示は Asia/Tokyo、内部は UTC のまま。
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type Props = {
  notebook: NotebookDetail;
  viewerUserId: string;
};

export function StatusCard({ notebook, viewerUserId }: Props) {
  const isYou = notebook.isYourTurn;
  const next = notebook.nextTurnUserId
    ? notebook.members.find((m) => m.userId === notebook.nextTurnUserId)
    : null;
  const totalPages = notebook.entries.length;
  // lint: Date.now は impure (react-hooks/purity) なので new Date() を使う。
  const elapsedDays = Math.max(
    0,
    Math.floor(
      (new Date().getTime() - notebook.createdAt.getTime()) / ONE_DAY_MS,
    ),
  );

  return (
    <section className={styles.status}>
      <div className={styles.statusHead}>
        <span
          className={`${styles.turnBadge} ${
            isYou ? styles.turnBadgeYou : styles.turnBadgeThem
          }`}
        >
          <span className={styles.turnBadgeDot} aria-hidden="true" />
          {isYou
            ? "あなたの ばん!"
            : next
              ? `${next.displayName}の ばん`
              : "—"}
        </span>
        <span className={styles.statusSub}>
          {isYou
            ? "つぎは あなたが かく ばん だよ ♡"
            : next
              ? `${next.displayName}が かいてる の まってる…`
              : ""}
        </span>
      </div>

      <div className={styles.statusGrid}>
        <div className={styles.statusCell}>
          <span className={styles.cellLabel}>つぎの ばん</span>
          <div className={styles.cellBody}>
            {next ? (
              <>
                <span className={styles.nextAvatarWrap}>
                  <UserAvatar
                    imageValue={next.imageUrl}
                    displayName={next.displayName}
                    size="md"
                  />
                  <span
                    className={styles.nextAvatarPulse}
                    aria-hidden="true"
                  />
                </span>
                <div className={styles.cellWho}>
                  <b className={styles.cellWhoName}>{next.displayName}</b>
                  <small className={styles.cellWhoSub}>
                    {isYou ? "= あなた" : "= ともだち"}
                  </small>
                </div>
              </>
            ) : (
              <span className={styles.cellWhoSub}>—</span>
            )}
          </div>
        </div>

        <div className={styles.statusCell}>
          <span className={styles.cellLabel}>メンバー</span>
          <div className={styles.cellBody}>
            <div className={styles.memberStack}>
              {notebook.members.map((m) => (
                <span key={m.userId} className={styles.memberChip}>
                  <UserAvatar
                    imageValue={m.imageUrl}
                    displayName={m.displayName}
                    size="sm"
                  />
                  {m.displayName}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.statusCell}>
          <span className={styles.cellLabel}>これまで</span>
          <div className={styles.cellBody}>
            <div className={styles.counts}>
              <div className={styles.count}>
                <b className={styles.countNum}>{totalPages}</b>
                <small className={styles.countLabel}>ぺーじ</small>
              </div>
              <div className={styles.count}>
                <b className={styles.countNum}>{elapsedDays}</b>
                <small className={styles.countLabel}>にち</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.statusActions}>
        {isYou ? (
          <Link href={`/notebooks/${notebook.id}/write`} className={styles.btnWrite}>
            <span className={styles.btnWriteHeart} aria-hidden="true">
              ♥
            </span>
            あたらしい ページを かく
            <span className={styles.btnWriteArrow} aria-hidden="true">
              →
            </span>
          </Link>
        ) : next && next.userId !== viewerUserId ? (
          <NudgeForm
            notebookId={notebook.id}
            viewerLastNudgeAt={notebook.viewerLastNudgeAt}
          />
        ) : (
          <p className={styles.nudgeNote}>
            つぎの ばんの ひとが かいたら じゅんばんが まわってくるよ
          </p>
        )}

        <Link
          href={`/notebooks/${notebook.id}/invite`}
          className={styles.btnInvite}
        >
          <span className={styles.btnInviteIcon} aria-hidden="true">
            ♡
          </span>
          しょうたい りんくを はっこう する
        </Link>
      </div>
    </section>
  );
}

function NudgeForm({
  notebookId,
  viewerLastNudgeAt,
}: {
  notebookId: string;
  viewerLastNudgeAt: Date | null;
}) {
  // F-NUDGE-02: 24h 以内に送信済みなら disable + 次回送信可能時刻を表示する。
  // race を弾くのはサーバー側 (sendNudge) なので UX ヒント止まり。
  const nextSendableAt =
    viewerLastNudgeAt === null
      ? null
      : new Date(viewerLastNudgeAt.getTime() + NUDGE_RATE_LIMIT_MS);
  const rateLimited =
    nextSendableAt !== null && nextSendableAt.getTime() > new Date().getTime();
  const submitAction = sendNudgeFromForm.bind(null, notebookId);

  return (
    <>
      <form action={submitAction}>
        <button type="submit" className={styles.btnPoke} disabled={rateLimited}>
          <span className={styles.btnPokeHeart} aria-hidden="true">
            ♡
          </span>
          「もう かいた?」って つつく
        </button>
      </form>
      {rateLimited && nextSendableAt && (
        <p className={styles.nudgeNote}>
          つぎに つつけるのは {dateFormatter.format(nextSendableAt)} から
        </p>
      )}
    </>
  );
}
