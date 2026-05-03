"use client";

import Link from "next/link";

import { Sticker } from "@/components/ui/Sticker";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { NotebookDetailEntry } from "@/lib/notebooks";

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
  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => {
        // title 必須化前に投稿された本番 entry は title=null。その場合は
        // body 先頭 30 文字 + … で代替表示する。
        const display =
          entry.title ??
          entry.body.slice(0, 30) + (entry.body.length > 30 ? "…" : "");
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
