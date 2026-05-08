"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { formatJpDateTime } from "@/app/notebooks/_lib/cover";

import styles from "../notebooks.module.css";

export type SpreadOverlayEntry = {
  createdAt: Date;
  title: string | null;
  body: string;
  authorName: string;
  authorIsYou: boolean;
};

// Next 16.2 の TS plugin が "use client" の type alias を直接見ると
// `onClose: () => void` を non-serializable と誤検出する (71007)。interface 経由で
// 宣言すると serializability 判定が抑制される (project_nextjs16_unstable_retry_lint
// と同じ workaround)。
export interface SpreadOverlayProps {
  open: boolean;
  notebookId: string;
  notebookName: string;
  lastEntry: SpreadOverlayEntry | null;
  onClose: () => void;
}

// #91: 一覧 card クリックで開く見開きノート overlay。
// `<dialog>` 標準要素 + showModal() で focus trap / Esc / 背景 inert を browser に
// 任せる。flip animation は CSS @keyframes で 1 回再生し、reduced-motion なら
// CSS 側で animation を打ち消す (即時表示)。
export function SpreadOverlay({
  open,
  notebookId,
  notebookName,
  lastEntry,
  onClose,
}: SpreadOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  // open prop の変化を <dialog> の showModal/close に同期させる。React 19 では
  // showModal を render で呼ぶと "react-hooks/refs" lint と DOM の不整合に
  // なるため effect で副作用化する。
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // 詳細ページを prefetch しておくと、overlay 内の「ノートを ひらく」リンクや
      // /write 遷移が体感的に速い。
      router.prefetch(`/notebooks/${notebookId}`);
      router.prefetch(`/notebooks/${notebookId}/write`);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, notebookId, router]);

  // Esc / 背景クリックで閉じる。<dialog> の "cancel" event = Esc。
  // 背景クリックは event.target === dialog (= ::backdrop ではなく dialog 自身)
  // のときだけ拾う。spread の中身を click しても閉じないように。
  const handleCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      onClose();
    },
    [onClose],
  );
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  return (
    <dialog
      ref={dialogRef}
      className={styles.notebookOverlay}
      aria-label={`${notebookName} の 見開き`}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className={styles.nbSpread} role="document">
        <button
          type="button"
          onClick={onClose}
          className={styles.nbClose}
          aria-label="とじる"
        >
          ×
        </button>

        {/* 左ページ = 直近 entry。entries 0 件の notebook は「まだ にっきが ない」
            placeholder。 */}
        <article
          className={`${styles.nbPage} ${styles.nbPageLeft}`}
          aria-label="さいきん の ぺーじ"
        >
          <span className={styles.nbMargin} aria-hidden="true" />
          <h2 className={styles.nbTitle}>{notebookName}</h2>
          {lastEntry ? (
            <>
              <div className={styles.nbMeta}>
                <span className={styles.nbDate}>
                  {formatJpDateTime(lastEntry.createdAt)}
                </span>
                <span className={styles.nbAuthor}>
                  {lastEntry.authorIsYou
                    ? "あなた"
                    : `${lastEntry.authorName} さん`}
                </span>
              </div>
              {lastEntry.title && (
                <h3 className={styles.nbEntryTitle}>{lastEntry.title}</h3>
              )}
              <p className={styles.nbBody}>{lastEntry.body}</p>
            </>
          ) : (
            <p className={styles.nbEmpty}>
              まだ なにも かかれて ないよ。
              <br />
              さいしょの ぺーじを かいてみよう ♡
            </p>
          )}
        </article>

        {/* 右ページ = "つぎの ぺーじ" 一枚モノ。spine (左端) を pivot にして
            rotateY(-178deg → 0deg) で「閉じた状態から バッと開く」演出。終了状態
            で右半分に正しく着地し、左ページ (直近 entry) を覆わない。右ページ
            ぜんたいが /write への CTA リンクで、薄字テンプレ + ♡ doodle が透ける。 */}
        <div className={styles.nbFlipWrap} aria-hidden="false">
          <Link
            href={`/notebooks/${notebookId}/write`}
            className={`${styles.nbPage} ${styles.nbPageRight} ${styles.nbFlip} ${styles.nbCtaPage}`}
            aria-label="きょうの にっきを かく"
          >
            <span className={styles.nbMargin} aria-hidden="true" />
            <p className={styles.nbTemplateHint}>ここに かいてね…</p>
            <span className={styles.nbCtaPill}>
              きょうの にっきを かく →
            </span>
            <span className={styles.nbDoodle} aria-hidden="true">
              ♡
            </span>
          </Link>
        </div>

        <Link
          href={`/notebooks/${notebookId}`}
          className={styles.nbAltLink}
        >
          ノートを ひらく ↗
        </Link>
      </div>
    </dialog>
  );
}
