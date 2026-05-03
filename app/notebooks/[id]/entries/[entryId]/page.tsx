import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Sticker } from "@/components/ui/Sticker";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { auth } from "@/lib/auth";
import { getNotebookDetail } from "@/lib/notebooks";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  // C-04: 表示は Asia/Tokyo、内部は UTC のまま。
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function NotebookEntryDetailPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id, entryId } = await params;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/auth/signin?callbackUrl=/notebooks/${id}/entries/${entryId}`);
  }
  if (!session.user?.name || session.user.name.trim().length === 0) {
    redirect(
      `/onboarding/name?callbackUrl=/notebooks/${id}/entries/${entryId}`,
    );
  }

  // 認可は detail と同じ「ノート存在 + viewer がメンバー」を再利用する。
  // 専用 query を切らないのは、認可ロジックを 1 箇所にまとめるため。
  const detail = await getNotebookDetail(id, userId);
  if (!detail) notFound();

  const entry = detail.entries.find((e) => e.id === entryId);
  if (!entry) notFound();

  const heading =
    entry.title ??
    entry.body.slice(0, 30) + (entry.body.length > 30 ? "…" : "");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-16 sm:px-6">
      <header className="text-center">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-2xl break-words sm:text-3xl">
          ♡ {heading}
        </h1>
        <p className="text-ink-soft mt-2 text-sm break-words">{detail.name}</p>
      </header>

      <Sticker className="p-4 sm:p-6">
        <div className="text-ink-soft flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-ink inline-flex min-w-0 items-center gap-2 font-[family-name:var(--font-mochi)] text-base break-words">
            <UserAvatar
              imageValue={entry.authorImageUrl}
              displayName={entry.authorDisplayName}
            />
            {entry.authorDisplayName}
          </span>
          <time dateTime={entry.createdAt.toISOString()}>
            {dateFormatter.format(entry.createdAt)}
          </time>
        </div>
        <p className="text-ink mt-4 text-sm leading-7 whitespace-pre-wrap [overflow-wrap:anywhere]">
          {entry.body}
        </p>
      </Sticker>

      <p className="text-center">
        <Link
          href={`/notebooks/${detail.id}`}
          className="text-ink-soft hover:text-pink-2 text-sm underline-offset-4 hover:underline"
        >
          ← にっき いちらん へ もどる
        </Link>
      </p>
    </main>
  );
}
