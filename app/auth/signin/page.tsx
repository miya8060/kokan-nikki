import { redirect } from "next/navigation";

import { requestSignIn } from "@/app/_actions/auth";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { auth } from "@/lib/auth";
import { pickInternalCallbackUrl } from "@/lib/safe-redirect";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/notebooks");
  }

  // NF-SEC: //evil.example のような protocol-relative URL を弾く。
  // 単純な startsWith("/") だと open redirect になる。
  const params = await searchParams;
  const redirectTo = pickInternalCallbackUrl(params.callbackUrl, "/notebooks");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <Sticker tape className="w-full max-w-md p-10">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl">
          ♡ さいんいん
        </h1>
        <p className="text-ink-soft mt-3 text-sm leading-7">
          メールアドレスを入れてね。マジックリンクを送るよ。
        </p>

        <form action={requestSignIn} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <label className="flex flex-col gap-2 text-left">
            <span className="text-ink-soft text-xs tracking-wider uppercase">
              email
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="border-ink text-ink focus:ring-pink rounded-2xl border-2 bg-white px-4 py-3 text-base shadow-[0_3px_0_var(--ink)] outline-none focus:ring-2"
            />
          </label>
          <div className="flex justify-center pt-2">
            <PuffButton type="submit">♡ リンクを おくる</PuffButton>
          </div>
        </form>
      </Sticker>
    </main>
  );
}
