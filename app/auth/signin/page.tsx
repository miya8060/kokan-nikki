import Link from "next/link";
import { redirect } from "next/navigation";

import { requestSignIn, signInWithOAuth } from "@/app/_actions/auth";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { auth, oauthProviders } from "@/lib/auth";
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
      <Sticker tape className="w-full max-w-md p-10 sm:p-12">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl sm:text-4xl">
          ♡ さいんいん
        </h1>
        <p className="text-ink-soft mt-3 text-sm leading-7 sm:text-base sm:leading-8">
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

        {(oauthProviders.google ||
          oauthProviders.line ||
          oauthProviders.twitter) && (
          <>
            <div className="text-ink-soft mt-8 flex items-center gap-3 text-xs tracking-wider uppercase">
              <span className="bg-ink-soft/30 h-px flex-1" />
              <span>または</span>
              <span className="bg-ink-soft/30 h-px flex-1" />
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {oauthProviders.google && (
                <form action={signInWithOAuth}>
                  <input type="hidden" name="provider" value="google" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <PuffButton type="submit" variant="alt" className="w-full">
                    ♡ Google で さいんいん
                  </PuffButton>
                </form>
              )}
              {oauthProviders.line && (
                <form action={signInWithOAuth}>
                  <input type="hidden" name="provider" value="line" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <PuffButton type="submit" variant="alt" className="w-full">
                    ♡ LINE で さいんいん
                  </PuffButton>
                </form>
              )}
              {oauthProviders.twitter && (
                <form action={signInWithOAuth}>
                  <input type="hidden" name="provider" value="twitter" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <PuffButton type="submit" variant="alt" className="w-full">
                    ♡ X で さいんいん
                  </PuffButton>
                </form>
              )}
            </div>
          </>
        )}

        <p className="text-ink-soft mt-8 text-center text-xs leading-6">
          サインインすると{" "}
          <Link
            href="/legal/terms"
            className="text-pink-2 underline underline-offset-4"
          >
            利用規約
          </Link>{" "}
          と{" "}
          <Link
            href="/legal/privacy"
            className="text-pink-2 underline underline-offset-4"
          >
            プライバシーポリシー
          </Link>{" "}
          に同意したものとみなされます。
        </p>
      </Sticker>
    </main>
  );
}
