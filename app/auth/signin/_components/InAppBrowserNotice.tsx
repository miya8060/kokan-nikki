import {
  type InAppBrowserDetection,
  buildExternalBrowserUrl,
} from "@/lib/in-app-browser";

const APP_LABEL: Record<InAppBrowserDetection["browser"], string> = {
  line: "LINE",
  twitter: "X",
  instagram: "Instagram",
  facebook: "Facebook",
};

// iOS の X / Instagram / FB は scheme jump で外部ブラウザを起こせないので、
// アプリ側のメニュー操作を文字で案内する。
const IOS_OPEN_HINT: Record<InAppBrowserDetection["browser"], string> = {
  line: "「そとのブラウザで ひらく」を おしてね",
  twitter: "右上の「⋯」から「Safari で ひらく」を えらんでね",
  instagram: "右上の「⋯」から「Safari で ひらく」を えらんでね",
  facebook: "右上の「⋯」から「Safari で ひらく」を えらんでね",
};

type Props = {
  detection: InAppBrowserDetection;
  currentUrl: string;
  // page 側で「env で enable されているが filter で hide された provider」
  // のラベルを計算して渡す。空配列のときは fallback で "Google" を使う
  // (Google は SNS WebView 全般で 403 になる典型ケースなので)。
  blockedProviderLabels: string[];
};

export function InAppBrowserNotice({
  detection,
  currentUrl,
  blockedProviderLabels,
}: Props) {
  const externalUrl = buildExternalBrowserUrl(currentUrl, detection);
  const appLabel = APP_LABEL[detection.browser];
  const blockedLabel =
    blockedProviderLabels.length > 0
      ? blockedProviderLabels.join(" や ")
      : "Google";

  return (
    <div
      role="alert"
      className="border-ink mt-6 rounded-2xl border-2 border-dashed bg-white/70 p-4 text-left shadow-[0_3px_0_var(--ink)]"
    >
      <p className="text-ink text-sm font-bold">
        ⚠ {appLabel} の中の ブラウザでは {blockedLabel} さいんいんが
        つかえないよ
      </p>
      <p className="text-ink-soft mt-2 text-xs leading-6">
        Google が SNS の 内蔵ブラウザでの ログインを ことわっているので、
        そとのブラウザで ひらいてからね。
      </p>
      {externalUrl ? (
        <a
          href={externalUrl}
          className="border-ink text-ink mt-3 inline-block rounded-2xl border-2 bg-white px-4 py-2 text-sm font-bold shadow-[0_3px_0_var(--ink)] hover:bg-cream"
        >
          ↗ そとのブラウザで ひらく
        </a>
      ) : (
        <p className="text-ink mt-3 text-xs leading-6">
          {IOS_OPEN_HINT[detection.browser]}
        </p>
      )}
      <p className="text-ink-soft mt-3 text-xs leading-6">
        または、下の メールアドレスで マジックリンクログインも つかえるよ。
      </p>
    </div>
  );
}
