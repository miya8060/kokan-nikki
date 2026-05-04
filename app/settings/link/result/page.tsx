import { redirect } from "next/navigation";

import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { auth } from "@/lib/auth";
import { clearLinkIntent, readLinkIntent } from "@/lib/auth/link-intent";

// F-AUTH-06 / issue #68 Stage 2
// Auth.js signIn callback (lib/auth.ts) が Case 1 (新規 X account を現 user に
// link 成功) で redirect してくる先。Case 2 はここではなく
// /settings/link/confirm に飛ぶ。
//
// このページに来た時点で linking 自体は完了しているので、cookie をクリアして
// 結果メッセージを表示するだけ。

type ResultStatus = "linked" | "already" | "error";

function parseStatus(value: string | string[] | undefined): ResultStatus {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "linked" || v === "already" || v === "error") return v;
  return "error";
}

const STATUS_LABELS: Record<
  ResultStatus,
  { title: string; body: string }
> = {
  linked: {
    title: "♡ X アカウントを 連携 したよ",
    body: "つぎから X でも さいんいん できる。",
  },
  already: {
    title: "もう 連携済 だよ",
    body: "この X アカウントは すでに 同じ アカウントに 紐付いて いる。",
  },
  error: {
    title: "エラー",
    body: "連携 を かんりょう できなかった。もう一度 ためしてね。",
  },
};

type LinkResultPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function LinkResultPage({
  searchParams,
}: LinkResultPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/settings");
  }

  // cookie が start 状態のまま残っていたらここでクリアする (signIn callback で
  // 正常に redirect してきていれば既に cookie は使い切られている前提だが、
  // 念のため)。pending-confirm の cookie はここに来たら不要なのでこれも消す。
  const intent = await readLinkIntent();
  if (intent) {
    await clearLinkIntent();
  }

  const params = await searchParams;
  const status = parseStatus(params.status);
  const { title, body } = STATUS_LABELS[status];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <Sticker tape className="p-8 sm:p-10">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-2xl sm:text-3xl">
          {title}
        </h1>
        <p className="text-ink-soft mt-3 text-sm sm:text-base">{body}</p>
        <div className="mt-6 flex justify-center">
          <PuffButton href="/settings" data-testid="link-result-back">
            ♡ せってい に もどる
          </PuffButton>
        </div>
      </Sticker>
    </main>
  );
}
