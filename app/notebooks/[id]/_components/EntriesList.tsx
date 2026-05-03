"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Sticker } from "@/components/ui/Sticker";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { NotebookDetailEntry } from "@/lib/notebooks";

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
}: {
  entries: NotebookDetailEntry[];
  notebookId: string;
}) {
  const router = useRouter();
  // ページを開いた瞬間を mount 時に固定する。router.refresh() で
  // Server Component が再レンダされても state は保持されるので、
  // 「自分が開いてからの新着」を境界として ♪ NEW バッジを出せる。
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

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => {
        // title 必須化前に投稿された本番 entry は title=null。その場合は
        // body 先頭 30 文字 + … で代替表示する。
        const display =
          entry.title ??
          entry.body.slice(0, 30) + (entry.body.length > 30 ? "…" : "");
        const isNew = entry.createdAt > pageOpenedAt;
        return (
          <li key={entry.id}>
            <Link
              href={`/notebooks/${notebookId}/entries/${entry.id}`}
              className="block transition hover:-translate-y-0.5"
            >
              <Sticker className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-ink inline-flex items-center gap-2 font-[family-name:var(--font-mochi)] text-base">
                    <UserAvatar
                      imageValue={entry.authorImageUrl}
                      displayName={entry.authorDisplayName}
                    />
                    {isNew && (
                      <span className="text-pink-2 text-xs">♪ NEW</span>
                    )}
                    <span className="truncate">{display}</span>
                  </span>
                  <time
                    dateTime={entry.createdAt.toISOString()}
                    className="text-ink-soft text-xs"
                  >
                    {dateFormatter.format(entry.createdAt)}
                  </time>
                </div>
              </Sticker>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
