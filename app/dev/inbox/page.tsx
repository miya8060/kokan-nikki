import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { notFound } from "next/navigation";

import { Sticker } from "@/components/ui/Sticker";
import { Tag } from "@/components/ui/Tag";
import { DEV_MAILBOX_DIR, type MailKind } from "@/lib/mailer";

// /dev/inbox は dev でのみ可視。prod では 404。
// lib/mailer.ts が tmp/dev-mailbox/*.json に書いた送信内容を一覧する。

export const dynamic = "force-dynamic";

type MailRecord = {
  fileName: string;
  sentAt: string;
  kind: MailKind;
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
};

export default async function DevInboxPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const records = await loadMailbox();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="text-center">
        <Tag style={{ background: "var(--lemon)" }}>★ dev only</Tag>
        <h1 className="text-ink mt-3 font-[family-name:var(--font-mochi)] text-3xl">
          ✉ dev inbox
        </h1>
        <p className="text-ink-soft mt-2 text-sm">
          RESEND_API_KEY が空のとき、送信されるはずだったメールがここに落ちます。
        </p>
        <p className="text-ink-soft mt-1 font-[family-name:var(--font-pixel)] text-xs">
          {DEV_MAILBOX_DIR}
        </p>
      </header>

      {records.length === 0 ? (
        <Sticker tape className="p-8 text-center">
          <p className="text-ink-soft text-sm">まだ なにも 届いてない よ。</p>
        </Sticker>
      ) : (
        <ul className="flex flex-col gap-5">
          {records.map((r) => (
            <li key={r.fileName}>
              <MailCard record={r} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function MailCard({ record }: { record: MailRecord }) {
  const link = extractFirstUrl(record.text);
  return (
    <Sticker className="p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Tag>{record.kind}</Tag>
        <span className="text-ink-soft font-[family-name:var(--font-pixel)] text-xs">
          {record.sentAt}
        </span>
      </div>
      <h2 className="text-ink mt-3 font-[family-name:var(--font-mochi)] text-lg">
        {record.subject}
      </h2>
      <dl className="text-ink-soft mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
        <dt>to</dt>
        <dd className="text-ink">{record.to}</dd>
        <dt>from</dt>
        <dd>{record.from}</dd>
      </dl>
      {link ? (
        <p className="mt-4 text-sm">
          <a
            href={link}
            className="text-pink-2 break-all underline underline-offset-4"
          >
            {link}
          </a>
        </p>
      ) : null}
      <pre className="border-ink text-ink mt-4 max-h-72 overflow-auto rounded-2xl border-2 bg-white/70 p-4 text-xs whitespace-pre-wrap">
        {record.text}
      </pre>
    </Sticker>
  );
}

async function loadMailbox(): Promise<MailRecord[]> {
  let files: string[];
  try {
    files = await readdir(DEV_MAILBOX_DIR);
  } catch (err) {
    // tmp/dev-mailbox/ がまだ存在しないだけのケースは空扱い。
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();
  const records = await Promise.all(
    jsonFiles.map(async (fileName) => {
      const raw = await readFile(path.join(DEV_MAILBOX_DIR, fileName), "utf8");
      const parsed = JSON.parse(raw) as Omit<MailRecord, "fileName">;
      return { fileName, ...parsed };
    }),
  );
  return records;
}

function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/\S+/);
  return m ? m[0] : null;
}
