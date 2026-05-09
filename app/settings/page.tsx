import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/_actions/auth";
import { startLinkAccount } from "@/app/_actions/link-account";
import { setDisplayName, setIcon } from "@/app/_actions/profile";
import { setCursor, setPalette, setTweak } from "@/app/_actions/settings";
import { IconUploadForm } from "@/app/settings/IconUploadForm";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sticker } from "@/components/ui/Sticker";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { auth, oauthProviders } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ICON_PRESET_KEYS,
  ICON_PRESET_LABELS,
  parseIconValue,
  serializePreset,
  type IconPresetKey,
} from "@/lib/icons/presets";
import {
  CURSOR_COOKIE,
  PALETTE_COOKIE,
  PALETTE_KEYS,
  PALETTE_LABELS,
  TWEAK_COOKIES,
  TWEAK_KEYS,
  TWEAK_LABELS,
  parseCursorEnabled,
  parsePalette,
  parseTweak,
  type PaletteKey,
  type TweakKey,
} from "@/lib/palette";
import { DISPLAY_NAME_MAX } from "@/lib/schemas/user";

// F-SET-01 / F-SET-02 / NF-A11Y-03
// 設定画面は cookie の現在値を SSR で読み、フォーム submit で Server Action に渡す。
// MCP 用の data-testid は testing.md §4.4 の規約に揃える。
// F-USER-01: 表示名 (User.name) もここから編集できる。初回設定は
// /onboarding/name 経由なので、このページに辿り着いた時点で name は設定済み。

const LINK_STATUS_LABELS: Record<string, string> = {
  merged: "♡ X アカウントを 統合 したよ",
  already: "もう 連携済 だった",
  cancelled: "連携を やめたよ",
  expired: "連携の しくみが 切れたよ。もう一度 やってね",
  error: "エラーが おきたよ。もう一度 ためしてね",
  "merge-account-conflict":
    "別の 連携と ぶつかったので 統合できなかった。先に X 連携を 解除してから やってね",
  "merge-self-merge": "自分を 自分に 統合する ことは できない",
  "merge-missing-user": "対象の アカウントが もう 見つからない",
};

function pickLinkStatus(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v !== "string") return null;
  return Object.prototype.hasOwnProperty.call(LINK_STATUS_LABELS, v) ? v : null;
}

type SettingsPageProps = {
  searchParams?: Promise<{ link?: string | string[] }>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/settings");
  }
  if (!session.user.name || session.user.name.trim().length === 0) {
    redirect("/onboarding/name?callbackUrl=/settings");
  }

  const params = (await searchParams) ?? {};
  const linkStatus = pickLinkStatus(params.link);
  const linkStatusLabel = linkStatus ? LINK_STATUS_LABELS[linkStatus] : null;

  const linkedAccounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { provider: true },
  });
  const linkedProviders = new Set(linkedAccounts.map((a) => a.provider));

  const cookieStore = await cookies();
  const currentPalette = parsePalette(cookieStore.get(PALETTE_COOKIE)?.value);
  const cursorEnabled = parseCursorEnabled(
    cookieStore.get(CURSOR_COOKIE)?.value,
  );
  const tweaks: Record<TweakKey, boolean> = Object.fromEntries(
    TWEAK_KEYS.map((key) => [
      key,
      parseTweak(key, cookieStore.get(TWEAK_COOKIES[key])?.value),
    ]),
  ) as Record<TweakKey, boolean>;
  const currentIcon = parseIconValue(session.user.image ?? null);
  const currentIconKey =
    currentIcon.kind === "preset" ? currentIcon.key : null;
  const currentIconLabel =
    currentIcon.kind === "preset"
      ? ICON_PRESET_LABELS[currentIcon.key]
      : currentIcon.kind === "url"
        ? "じぶんで えらんだ がぞう"
        : "デフォルト";
  const displayName = session.user.name;
  // F-USER-03: Vercel Blob の token が無い環境 (Preview / 一部 dev) では
  // アップロード経路を UI でも disable する。Server 側でも同じ env を見て 422
  // を返すので、UI を信用源にしない多重防御。
  const uploadEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="text-center">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl sm:text-4xl">
          ⚙ せってい
        </h1>
        <p className="text-ink-soft mt-2 text-sm sm:text-base">
          みための こうかん と カーソル を きりかえる ♡
        </p>
      </header>

      {linkStatusLabel && (
        <p
          className="text-ink border-ink rounded-2xl border-2 bg-white px-4 py-3 text-center text-sm shadow-[0_3px_0_var(--ink)]"
          data-testid="link-status"
          data-link-status={linkStatus}
        >
          {linkStatusLabel}
        </p>
      )}

      <Sticker tape className="p-8 sm:p-10">
        <h2 className="text-ink font-[family-name:var(--font-mochi)] text-xl sm:text-2xl">
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

      <Sticker tape className="p-8 sm:p-10">
        <h2 className="text-ink font-[family-name:var(--font-mochi)] text-xl sm:text-2xl">
          ☆ アイコン
        </h2>
        <p className="text-ink-soft mt-1 text-xs">
          メンバー欄や にっきの ヘッダーに でるよ
        </p>
        <div className="mt-4 flex items-center gap-3">
          <UserAvatar
            imageValue={session.user.image ?? null}
            displayName={displayName}
            size="md"
          />
          <span className="text-ink-soft text-xs">
            いま: <strong className="text-ink">{currentIconLabel}</strong>
          </span>
        </div>
        <form
          action={setIcon}
          className="mt-5 flex flex-col gap-4"
          data-testid="icon-form"
        >
          <fieldset className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            <legend className="sr-only">プリセットから アイコンを選ぶ</legend>
            <IconOption
              presetKey={null}
              displayName={displayName}
              checked={currentIcon.kind === "default"}
            />
            {ICON_PRESET_KEYS.map((key) => (
              <IconOption
                key={key}
                presetKey={key}
                displayName={displayName}
                checked={key === currentIconKey}
              />
            ))}
          </fieldset>
          <div className="flex justify-center">
            <PuffButton type="submit" data-testid="icon-save">
              ♡ ほぞん
            </PuffButton>
          </div>
        </form>
        <IconUploadForm uploadEnabled={uploadEnabled} />
      </Sticker>

      <Sticker tape className="p-8 sm:p-10">
        <h2 className="text-ink font-[family-name:var(--font-mochi)] text-xl sm:text-2xl">
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

      {oauthProviders.twitter && !linkedProviders.has("twitter") && (
        <Sticker tape className="p-8 sm:p-10">
          <h2 className="text-ink font-[family-name:var(--font-mochi)] text-xl sm:text-2xl">
            ☆ ほかの サインイン方法 を つなぐ
          </h2>
          <p className="text-ink-soft mt-1 text-xs">
            X アカウントを 連携 して ふくすうの 方法で さいんいん できる ように
            する。
          </p>
          <form
            action={startLinkAccount}
            className="mt-5 flex flex-col gap-4"
            data-testid="link-twitter-form"
          >
            <input type="hidden" name="provider" value="twitter" />
            <div className="flex justify-center">
              <PuffButton
                type="submit"
                variant="alt"
                data-testid="link-twitter-start"
              >
                ♡ X を 連携 する
              </PuffButton>
            </div>
          </form>
        </Sticker>
      )}

      <Sticker tape className="p-8 sm:p-10">
        <h2 className="text-ink font-[family-name:var(--font-mochi)] text-xl sm:text-2xl">
          ✦ ちょうせつ
        </h2>
        <p className="text-ink-soft mt-1 text-xs">
          にっき いちらん の シール / マステ / ぱきぱき などを きりかえる
        </p>
        <ul
          className="mt-5 flex flex-col gap-3"
          data-testid="tweaks-list"
        >
          {TWEAK_KEYS.map((key) => (
            <TweakToggle key={key} tweakKey={key} enabled={tweaks[key]} />
          ))}
        </ul>
      </Sticker>

      <Sticker className="p-8 sm:p-10">
        <h2 className="text-ink font-[family-name:var(--font-mochi)] text-xl sm:text-2xl">
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
            <PuffButton type="submit" variant="alt" data-testid="cursor-toggle">
              {cursorEnabled ? "★ OFF にする" : "★ ON にする"}
            </PuffButton>
          </div>
        </form>
      </Sticker>

      <Sticker className="p-8 sm:p-10">
        <h2 className="text-ink font-[family-name:var(--font-mochi)] text-xl sm:text-2xl">
          ✿ サインアウト
        </h2>
        <p className="text-ink-soft mt-1 text-xs">
          このたんまつから ぬける。また サインインで もどってこれるよ。
        </p>
        <form
          action={signOutAction}
          className="mt-5 flex justify-center"
          data-testid="signout-form"
        >
          <PuffButton type="submit" variant="alt" data-testid="signout-button">
            ✦ サインアウト
          </PuffButton>
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

function IconOption({
  presetKey,
  displayName,
  checked,
}: {
  presetKey: IconPresetKey | null;
  displayName: string;
  checked: boolean;
}) {
  // value = "" がデフォルト (User.image を null に戻す) を表す。Server Action 側
  // の iconFormValueSchema で union(literal(""), preset) として受け取る。
  const value = presetKey === null ? "" : presetKey;
  const label =
    presetKey === null ? "デフォルト" : ICON_PRESET_LABELS[presetKey];
  const imageValue = presetKey === null ? null : serializePreset(presetKey);
  return (
    <label
      data-testid={`icon-option-${presetKey ?? "default"}`}
      data-checked={checked || undefined}
      className="border-ink flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 bg-white p-3 shadow-[0_3px_0_var(--ink)] transition has-checked:-translate-y-0.5 has-checked:shadow-[0_5px_0_var(--ink)]"
    >
      <input
        type="radio"
        name="icon"
        value={value}
        defaultChecked={checked}
        className="sr-only"
        required
      />
      <UserAvatar imageValue={imageValue} displayName={displayName} size="md" />
      <span className="text-ink text-xs">{label}</span>
    </label>
  );
}

function TweakToggle({
  tweakKey,
  enabled,
}: {
  tweakKey: TweakKey;
  enabled: boolean;
}) {
  // 1 アクションで全 toggle を捌くので、name に key を hidden で同梱。
  // 現在値の反転を value に持たせると、submit 1 回でトグルが完結し noscript でも動く。
  const label = TWEAK_LABELS[tweakKey];
  return (
    <li
      data-testid={`tweak-row-${tweakKey}`}
      data-state={enabled ? "on" : "off"}
      className="border-ink flex items-start justify-between gap-4 rounded-2xl border-2 bg-white px-4 py-3 shadow-[0_3px_0_var(--ink)]"
    >
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-ink text-sm font-bold">{label.name}</span>
        <span className="text-ink-soft text-xs">{label.hint}</span>
      </div>
      <form
        action={setTweak}
        className="flex shrink-0 items-center"
        data-testid={`tweak-form-${tweakKey}`}
      >
        <input type="hidden" name="name" value={tweakKey} />
        <input type="hidden" name="enabled" value={enabled ? "off" : "on"} />
        <PuffButton
          type="submit"
          variant="alt"
          data-testid={`tweak-toggle-${tweakKey}`}
        >
          {enabled ? "★ ON" : "OFF"}
        </PuffButton>
      </form>
    </li>
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
