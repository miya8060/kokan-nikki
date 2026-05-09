"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { UserAvatar } from "@/components/ui/UserAvatar";
import type { NotebookDetailEntry } from "@/lib/notebooks";

import styles from "../notebook-detail.module.css";

const REFRESH_INTERVAL_MS = 15_000;

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  // C-04: 表示は Asia/Tokyo、内部は UTC のまま。
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function EntriesList({
  entries,
  notebookId,
  viewerUserId,
}: {
  entries: NotebookDetailEntry[];
  notebookId: string;
  viewerUserId: string;
}) {
  const router = useRouter();
  // ページを開いた瞬間を mount 時に固定する。router.refresh() で
  // Server Component が再レンダされても state は保持されるので、
  // 「自分が開いてからの新着」を境界として NEW! バッジを出せる。
  // useRef だと react-hooks/refs で render 中に読めないので useState を使う。
  const [pageOpenedAt] = useState(() => new Date());

  useEffect(() => {
    // 15s ごとに RSC payload を取り直す。revalidatePath は自タブにしか
    // 効かないので、別タブで投稿された entry を拾うにはこの polling が必要。
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(() => {
        router.refresh();
      }, REFRESH_INTERVAL_MS);
    };
    const stop = () => {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    if (document.visibilityState === "visible") start();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  const total = entries.length;

  return (
    <section className={styles.entries} aria-labelledby="d-entries-title">
      <h2 id="d-entries-title" className={styles.entriesTitle}>
        <span className={styles.entriesStar} aria-hidden="true">
          ★
        </span>
        これまでの にっき
        <span className={styles.entriesBadge}>{total}</span>
      </h2>

      <ol className={styles.entryList}>
        {entries.map((entry, index) => {
          // 配列は新しい順なので 「P. 通し番号」 は (total - index) で出す。
          const pageNo = total - index;
          // title 必須化前に投稿された本番 entry は title=null。その場合は
          // body 先頭を代替表示する。
          const titleText =
            entry.title ??
            entry.body.slice(0, 30) + (entry.body.length > 30 ? "…" : "");
          // F-TURN: side-* は author が viewer か否かで切り替え (= 自分は右)。
          const isMine = entry.authorId === viewerUserId;
          const sideClass = isMine ? styles.entryRight : styles.entryLeft;
          const isNew = entry.createdAt > pageOpenedAt;
          const previewSource = entry.body.replace(/\s+/g, " ").trim();
          const wordCount = entry.body.length;

          return (
            <li key={entry.id}>
              <Link
                href={`/notebooks/${notebookId}/entries/${entry.id}`}
                className={`${styles.entry} ${sideClass}`}
              >
                <span className={styles.entryNo} aria-hidden="true">
                  P.{String(pageNo).padStart(2, "0")}
                </span>

                <div className={styles.entryAuthor}>
                  <UserAvatar
                    imageValue={entry.authorImageUrl}
                    displayName={entry.authorDisplayName}
                    size="md"
                  />
                  <div className={styles.entryAuthorText}>
                    <b className={styles.entryAuthorName}>
                      {entry.authorDisplayName}
                    </b>
                    <small className={styles.entryAuthorDate}>
                      {dateFormatter.format(entry.createdAt)}
                    </small>
                  </div>
                </div>

                <div className={styles.entryBody}>
                  <h3 className={styles.entryTitle}>{titleText}</h3>
                  <p className={styles.entryPreview}>{previewSource}</p>
                </div>

                <div className={styles.entryFoot}>
                  <span className={styles.entryMeta}>{wordCount}もじ</span>
                  {isNew && <span className={styles.entryNew}>NEW!</span>}
                  <span className={styles.entryArrow} aria-hidden="true">
                    よむ →
                  </span>
                </div>

                <span className={styles.entryTape} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ol>

      <div className={styles.entriesEnd}>── ここまで ──</div>
    </section>
  );
}
