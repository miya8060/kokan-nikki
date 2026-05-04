import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Sticker } from "@/components/ui/Sticker";
import { Tag } from "@/components/ui/Tag";
import { unwrapCallbackUrl } from "@/lib/safe-redirect";

// Next.js Link はビューポート侵入時にプリフェッチするため、確認ボタンは
// プレーン <a> で組む。Link 経由で /api/auth/callback/* にプリフェッチが
// 走ると two-click パターンの目的 (本人クリックまで token を温存) が崩れる。

type ConfirmPageProps = {
  searchParams: Promise<{ to?: string | string[] }>;
};

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;
  const host = (await headers()).get("host") ?? "";
  const signinUrl = unwrapCallbackUrl(params.to, host);

  if (!signinUrl) {
    redirect("/auth/signin");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <Sticker tape className="w-full max-w-md p-10 text-center sm:p-12">
        <Tag
          className="px-4 py-1.5 text-sm"
          style={{ background: "var(--mint)" }}
        >
          ★ confirm to sign in
        </Tag>
        <h1 className="text-ink mt-4 font-[family-name:var(--font-mochi)] text-3xl sm:text-4xl">
          ろぐいん する？
        </h1>
        <p className="text-ink-soft mt-3 text-sm leading-7 sm:text-base sm:leading-8">
          下の ボタンを ふんで ろぐいん してね ♡
          <br />
          リンクは 1かいだけ つかえるよ。
        </p>
        <div className="mt-6 flex justify-center">
          <a className="btn-puff" href={signinUrl}>
            ♡ ろぐいん する
          </a>
        </div>
        <p className="text-ink-soft mt-6 font-[family-name:var(--font-pixel)] text-xs tracking-wider uppercase">
          こうかい しちゃった とき → もう いっかい さいんいんから やりなおして ね
        </p>
      </Sticker>
    </main>
  );
}
