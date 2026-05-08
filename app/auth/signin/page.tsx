import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requestSignIn, signInWithOAuth } from "@/app/_actions/auth";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { auth, oauthProviders } from "@/lib/auth";
import {
  detectInAppBrowser,
  shouldShowOAuthProvider,
} from "@/lib/in-app-browser";
import { pickInternalCallbackUrl } from "@/lib/safe-redirect";

import { InAppBrowserNotice } from "./_components/InAppBrowserNotice";

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

  // NF-AUTH: SNS アプリの内蔵 WebView (LINE / X / Instagram / FB) から踏むと
  // Google が "disallowed_useragent" で 403 を返す。UA を見て検出した場合は
  // 外部ブラウザへ誘導する banner を出す (詳細は lib/in-app-browser.ts)。
  const headerStore = await headers();
  const detection = detectInAppBrowser(headerStore.get("user-agent"));
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const host = headerStore.get("host") ?? "kokannikki.app";
  const callbackQuery =
    typeof params.callbackUrl === "string"
      ? `?callbackUrl=${encodeURIComponent(params.callbackUrl)}`
      : "";
  const currentUrl = `${proto}://${host}/auth/signin${callbackQuery}`;

  // in-app browser 検出時は、provider 側で動かない OAuth ボタンを隠して
  // 「押したら 403」を踏ませない。同 app の provider (LINE-in-LINE / X-in-X)
  // だけ残す。Google は SNS WebView 全般で disallowed_useragent なので常に隠す。
  const showGoogle =
    oauthProviders.google && shouldShowOAuthProvider("google", detection);
  const showLine =
    oauthProviders.line && shouldShowOAuthProvider("line", detection);
  const showTwitter =
    oauthProviders.twitter && shouldShowOAuthProvider("twitter", detection);

  // banner には「env で enable されているが今 hide した provider」のラベルを
  // 渡して、ユーザーが見えていたはずのボタンが消えた事実を文言に反映する。
  const blockedProviderLabels: string[] = [];
  if (oauthProviders.google && !showGoogle) blockedProviderLabels.push("Google");
  if (oauthProviders.line && !showLine) blockedProviderLabels.push("LINE");
  if (oauthProviders.twitter && !showTwitter) blockedProviderLabels.push("X");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <Sticker tape className="w-full max-w-md p-10 sm:p-12">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl sm:text-4xl">
          ♡ さいんいん
        </h1>
        <p className="text-ink-soft mt-3 text-sm leading-7 sm:text-base sm:leading-8">
          メールアドレスを入れてね。マジックリンクを送るよ。
        </p>

        {detection ? (
          <InAppBrowserNotice
            detection={detection}
            currentUrl={currentUrl}
            blockedProviderLabels={blockedProviderLabels}
          />
        ) : null}

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

        {(showGoogle || showLine || showTwitter) && (
          <>
            <div className="text-ink-soft mt-8 flex items-center gap-3 text-xs tracking-wider uppercase">
              <span className="bg-ink-soft/30 h-px flex-1" />
              <span>または</span>
              <span className="bg-ink-soft/30 h-px flex-1" />
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {showGoogle && (
                <form action={signInWithOAuth}>
                  <input type="hidden" name="provider" value="google" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <PuffButton type="submit" variant="alt" className="w-full">
                    ♡ Google で さいんいん
                  </PuffButton>
                </form>
              )}
              {showLine && (
                <form action={signInWithOAuth}>
                  <input type="hidden" name="provider" value="line" />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <PuffButton type="submit" variant="alt" className="w-full">
                    ♡ LINE で さいんいん
                  </PuffButton>
                </form>
              )}
              {showTwitter && (
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
