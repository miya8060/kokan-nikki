// NF-AUTH: Google は 2021-08 以降、SNS アプリ (LINE / X / Instagram / Facebook
// / Messenger) の in-app WebView から OAuth flow を開くと
// "Error 403: disallowed_useragent" で弾く (「安全なブラウザの使用」ポリシー)。
// kokannikki.app の signin ページでは UA から in-app browser を識別して、
// 外部ブラウザに誘導する banner を出す。
//
// ロジックは UA 文字列の signature 検出に依存する。完璧な検出ではないが、
// 主要 SNS アプリは識別可能なシグネチャを残しているので実用的にカバーできる。

export type InAppBrowserKind = "line" | "twitter" | "instagram" | "facebook";

export type InAppPlatform = "ios" | "android" | "unknown";

export type InAppBrowserDetection = {
  browser: InAppBrowserKind;
  platform: InAppPlatform;
};

export function detectInAppBrowser(
  userAgent: string | null | undefined,
): InAppBrowserDetection | null {
  if (!userAgent) return null;
  const browser = matchBrowser(userAgent);
  if (!browser) return null;
  return { browser, platform: matchPlatform(userAgent) };
}

function matchBrowser(ua: string): InAppBrowserKind | null {
  // LINE: "Line/14.5.0" (iOS) / "Line/14.5.0/IAB" (Android)
  if (/\bLine\//.test(ua)) return "line";
  // X (旧 Twitter): "Twitter for iPhone/10.55" (iOS) / "TwitterAndroid" (Android)
  if (/\bTwitter\b|TwitterAndroid/.test(ua)) return "twitter";
  // Instagram: "Instagram 308.0.0.13.110 ..."
  if (/\bInstagram\b/.test(ua)) return "instagram";
  // Facebook 系 (FB / Messenger): [FBAN/FBIOS;...] [FB_IAB/FB4A;...]
  if (/\bFBAN\b|\bFB_IAB\b|\bFBAV\b/.test(ua)) return "facebook";
  return null;
}

function matchPlatform(ua: string): InAppPlatform {
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "unknown";
}

// LINE は同じ URL に ?openExternalBrowser=1 を付けるだけで LINE 側が
// 自動で外部ブラウザに切り替えてくれる (LINE 公式仕様)。
// Android (非 LINE) は intent:// URL で Chrome を直接起動できる。
// iOS (非 LINE) は確実な scheme jump が無い (x-safari-https:// は非公式
// かつ iOS バージョン依存) ので null を返し、UI 側で手動誘導文に倒す。

export function buildExternalBrowserUrl(
  currentUrl: string,
  detection: InAppBrowserDetection,
): string | null {
  if (detection.browser === "line") {
    return appendQuery(currentUrl, "openExternalBrowser", "1");
  }
  if (detection.platform === "android") {
    return toAndroidIntentUrl(currentUrl);
  }
  return null;
}

function appendQuery(url: string, key: string, value: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
  } catch {
    return url;
  }
}

function toAndroidIntentUrl(httpsUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(httpsUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const scheme = parsed.protocol.replace(":", "");
  const hostPath = `${parsed.host}${parsed.pathname}${parsed.search}`;
  return `intent://${hostPath}#Intent;scheme=${scheme};package=com.android.chrome;end`;
}

export type OAuthProviderId = "google" | "line" | "twitter";

// signin ページで OAuth ボタンを出してよいか。in-app browser 検出時は、
// provider 側で確実に弾かれる組み合わせのボタンを隠してユーザーが
// 踏んで 403 になるのを防ぐ。
//
// ルール:
// - 通常ブラウザ (detection === null) なら全 provider を表示
// - Google は SNS WebView 全般を disallowed_useragent で弾くので常に非表示
// - LINE / Twitter (X) は同じ app の WebView (LINE-in-LINE / X-in-X) なら
//   provider 自身が webview を許容する想定で残す
// - それ以外 (cross-app, Instagram / Facebook) は安全側に倒して非表示

export function shouldShowOAuthProvider(
  provider: OAuthProviderId,
  detection: InAppBrowserDetection | null,
): boolean {
  if (!detection) return true;
  if (provider === "google") return false;
  return detection.browser === provider;
}
