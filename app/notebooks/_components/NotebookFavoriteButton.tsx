"use client";

import { useOptimistic, useTransition } from "react";

import { toggleNotebookFavorite } from "@/app/_actions/notebook-favorite";

// issue #129: notebook 一覧 ♡ favorite トグル。
// - 親 <NotebookCardLink> が click を拾って overlay を開くので、stopPropagation
//   と preventDefault で必ず button に止める。
// - 楽観的更新は useOptimistic + useTransition。失敗時は元の状態に戻して
//   console.error する (toast 機構が無いので暫定。F-NUDGE と同じ温度感)。
// - aria-pressed をトグルし、aria-label には現状を含める。
export interface NotebookFavoriteButtonProps {
  notebookId: string;
  notebookName: string;
  isFavorite: boolean;
  className?: string;
  activeClassName?: string;
}

export function NotebookFavoriteButton({
  notebookId,
  notebookName,
  isFavorite,
  className,
  activeClassName,
}: NotebookFavoriteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(
    isFavorite,
    (_prev, next: boolean) => next,
  );

  const label = optimisticFavorite
    ? `${notebookName} を おきにいり から はずす`
    : `${notebookName} を おきにいり に いれる`;

  return (
    <button
      type="button"
      aria-pressed={optimisticFavorite}
      aria-label={label}
      data-testid="notebook-fav-toggle"
      data-favorite={optimisticFavorite ? "on" : "off"}
      disabled={isPending}
      className={`${className ?? ""} ${
        optimisticFavorite ? (activeClassName ?? "") : ""
      }`.trim()}
      onClick={(event) => {
        // 親 NotebookCardLink の onClick / Link 遷移を止める。
        event.preventDefault();
        event.stopPropagation();
        const next = !optimisticFavorite;
        startTransition(async () => {
          setOptimisticFavorite(next);
          try {
            await toggleNotebookFavorite({ notebookId });
          } catch (err) {
            // 失敗時は useOptimistic が transition 終了で勝手に元 prop に戻る。
            // ここで手動巻き戻しは不要。toast 機構ができたら差し替える。
            console.error("toggleNotebookFavorite failed", err);
          }
        });
      }}
    >
      <span aria-hidden="true">♡</span>
    </button>
  );
}
