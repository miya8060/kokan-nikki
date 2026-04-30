import { redirect } from "next/navigation";

import { setDisplayName } from "@/app/_actions/profile";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { auth } from "@/lib/auth";
import { pickInternalCallbackUrl } from "@/lib/safe-redirect";
import { DISPLAY_NAME_MAX } from "@/lib/schemas/user";

// F-USER-01 初回オンボーディング: 新規ログイン直後で User.name が null の
// ユーザーに表示名を入力させる。auth-gated な各ページで session.user.name の
// 有無を判定し、未設定なら callbackUrl 付きでこのページに redirect される。
//
// 既に名前が設定されているユーザーがこの URL を踏んだ場合は、そのまま
// callbackUrl (または /notebooks) に冪等遷移する。

export default async function OnboardingNamePage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/onboarding/name");
  }

  const params = await searchParams;
  const callbackUrl = pickInternalCallbackUrl(params.callbackUrl, "/notebooks");

  // 既に名前があるなら onboarding をスキップ。空白のみは displayNameSchema で
  // 弾いている前提だが、DB の旧データが空白文字列のときの保険として trim して
  // 判定する。
  if (session.user.name && session.user.name.trim().length > 0) {
    redirect(callbackUrl);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="text-center">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl">
          ♡ おなまえを おしえて
        </h1>
        <p className="text-ink-soft mt-3 text-sm leading-7">
          こうかんにっきの メンバーに みえる ひょうじめい だよ。
          <br />
          あとから せってい から かえられるから あんしん してね ♡
        </p>
      </header>

      <Sticker tape className="p-8">
        <form
          action={setDisplayName}
          className="flex flex-col gap-4"
          data-testid="onboarding-name-form"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label className="flex flex-col gap-2 text-left">
            <span className="text-ink-soft text-xs tracking-wider uppercase">
              display name
            </span>
            <input
              type="text"
              name="displayName"
              required
              maxLength={DISPLAY_NAME_MAX}
              autoComplete="nickname"
              autoFocus
              placeholder="あすか"
              data-testid="onboarding-display-name"
              className="border-ink text-ink focus:ring-pink rounded-2xl border-2 bg-white px-4 py-3 text-base shadow-[0_3px_0_var(--ink)] outline-none focus:ring-2"
            />
          </label>
          <p className="text-ink-soft text-xs">
            さいだい {DISPLAY_NAME_MAX} もじ。あとから かえられるよ。
          </p>
          <div className="flex justify-center pt-2">
            <PuffButton type="submit" data-testid="onboarding-submit">
              ♡ きめた
            </PuffButton>
          </div>
        </form>
      </Sticker>
    </main>
  );
}
