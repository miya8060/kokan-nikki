import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { setDisplayName } from "@/app/_actions/profile";
import { setCursor, setPalette } from "@/app/_actions/settings";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { auth } from "@/lib/auth";
import {
  CURSOR_COOKIE,
  PALETTE_COOKIE,
  PALETTE_KEYS,
  PALETTE_LABELS,
  parseCursorEnabled,
  parsePalette,
  type PaletteKey,
} from "@/lib/palette";
import { DISPLAY_NAME_MAX } from "@/lib/schemas/user";

// F-SET-01 / F-SET-02 / NF-A11Y-03
// 設定画面は cookie の現在値を SSR で読み、フォーム submit で Server Action に渡す。
// MCP 用の data-testid は testing.md §4.4 の規約に揃える。
// F-USER-01: 表示名 (User.name) もここから編集できる。初回設定は
// /onboarding/name 経由なので、このページに辿り着いた時点で name は設定済み。

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/settings");
  }
  if (!session.user.name || session.user.name.trim().length === 0) {
    redirect("/onboarding/name?callbackUrl=/settings");
  }

  const cookieStore = await cookies();
  const currentPalette = parsePalette(cookieStore.get(PALETTE_COOKIE)?.value);
  const cursorEnabled = parseCursorEnabled(
    cookieStore.get(CURSOR_COOKIE)?.value,
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="text-center">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl">
          ⚙ せってい
        </h1>
        <p className="text-ink-soft mt-2 text-sm">
          みための こうかん と カーソル を きりかえる ♡
        </p>
      </header>

      <Sticker tape className="p-8">
        <h2 className="text-ink font-[family-name:var(--font-mochi)] text-xl">
          ☆ ひょうじめい
        </h2>
        <p className="text-ink-soft mt-1 text-xs">
          メンバーに みえる おなまえ。さいだい {DISPLAY_NAME_MAX} もじ。
        </p>
        <form
          action={setDisplayName}
          className="mt-5 flex flex-col gap-4"
          data-testid="display-name-form"
        >
          <label className="flex flex-col gap-2 text-left">
            <span className="sr-only">ひょうじめい</span>
            <input
              type="text"
              name="displayName"
              required
              maxLength={DISPLAY_NAME_MAX}
              autoComplete="nickname"
              defaultValue={session.user.name}
              data-testid="display-name-input"
              className="border-ink text-ink focus:ring-pink rounded-2xl border-2 bg-white px-4 py-3 text-base shadow-[0_3px_0_var(--ink)] outline-none focus:ring-2"
            />
          </label>
          <div className="flex justify-center">
            <PuffButton type="submit" data-testid="display-name-save">
              ♡ ほぞん
            </PuffButton>
          </div>
        </form>
      </Sticker>

      <Sticker tape className="p-8">
        <h2 className="text-ink font-[family-name:var(--font-mochi)] text-xl">
          ★ パレット
        </h2>
        <p className="text-ink-soft mt-1 text-xs">
          いまは「{PALETTE_LABELS[currentPalette].name}」
        </p>
        <form action={setPalette} className="mt-5">
          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <legend className="sr-only">パレットを選ぶ</legend>
            {PALETTE_KEYS.map((key) => (
              <PaletteOption
                key={key}
                paletteKey={key}
                checked={key === currentPalette}
              />
            ))}
          </fieldset>
          <div className="mt-6 flex justify-center">
            <PuffButton type="submit" data-testid="palette-save">
              ♡ ほぞん
            </PuffButton>
          </div>
        </form>
      </Sticker>

      <Sticker className="p-8">
        <h2 className="text-ink font-[family-name:var(--font-mochi)] text-xl">
          ✿ カスタムカーソル
        </h2>
        <p className="text-ink-soft mt-1 text-xs">
          ピンクの やじるしが マウスを おいかけるよ
        </p>
        <form action={setCursor} className="mt-5 flex flex-col gap-4">
          {/* 現状とは反対の値だけを送る単純なトグル。隠し input + submit ボタン
              にすることで noscript でも動く。 */}
          <input
            type="hidden"
            name="enabled"
            value={cursorEnabled ? "off" : "on"}
          />
          <p
            className="text-ink text-sm"
            data-testid="cursor-state"
            data-state={cursorEnabled ? "on" : "off"}
          >
            いま:{" "}
            <strong className="text-pink-2">
              {cursorEnabled ? "ON" : "OFF"}
            </strong>
          </p>
          <div className="flex justify-center">
            <PuffButton
              type="submit"
              variant="alt"
              data-testid="cursor-toggle"
            >
              {cursorEnabled ? "★ OFF にする" : "★ ON にする"}
            </PuffButton>
          </div>
        </form>
      </Sticker>

      <p className="text-center">
        <Link
          href="/notebooks"
          className="text-ink-soft hover:text-pink-2 text-sm underline-offset-4 hover:underline"
        >
          ← にっき いちらん へ もどる
        </Link>
      </p>
    </main>
  );
}

function PaletteOption({
  paletteKey,
  checked,
}: {
  paletteKey: PaletteKey;
  checked: boolean;
}) {
  const swatch = PALETTE_LABELS[paletteKey];
  return (
    <label
      data-testid={`palette-option-${paletteKey}`}
      data-checked={checked || undefined}
      className="border-ink flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 bg-white p-3 shadow-[0_3px_0_var(--ink)] transition has-checked:-translate-y-0.5 has-checked:shadow-[0_5px_0_var(--ink)]"
    >
      <input
        type="radio"
        name="palette"
        value={paletteKey}
        defaultChecked={checked}
        className="sr-only"
        required
      />
      <span
        aria-hidden
        className="flex h-10 w-full overflow-hidden rounded-full border-2 border-[color:var(--ink)]"
      >
        <span className="flex-1" style={{ background: swatch.a }} />
        <span className="flex-1" style={{ background: swatch.b }} />
        <span className="flex-1" style={{ background: swatch.c }} />
      </span>
      <span className="text-ink text-xs">{swatch.name}</span>
    </label>
  );
}
