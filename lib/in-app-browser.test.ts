import { describe, expect, it } from "vitest";

import {
  buildExternalBrowserUrl,
  detectInAppBrowser,
} from "./in-app-browser";

// NF-AUTH: signin ページの「Google で disallowed_useragent」回避のため、
// 主要 SNS アプリの WebView UA を識別できることを境界値で押さえる。

const UA = {
  lineIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/14.5.0",
  lineAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Line/14.5.0/IAB",
  twitterIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/10.55",
  twitterAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 TwitterAndroid",
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 308.0.0.13.110 (iPhone15,2; iOS 17_4; ja_JP; ja; scale=3.00; 1179x2556; 526486896)",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBID/phone;FBLC/ja_JP;FBOP/5;FBRV/0]",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.40.108;]",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  chromeDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

describe("detectInAppBrowser", () => {
  it("LINE iOS / Android を line として識別する", () => {
    expect(detectInAppBrowser(UA.lineIos)).toEqual({
      browser: "line",
      platform: "ios",
    });
    expect(detectInAppBrowser(UA.lineAndroid)).toEqual({
      browser: "line",
      platform: "android",
    });
  });

  it("X (Twitter for iPhone / TwitterAndroid) を twitter として識別する", () => {
    expect(detectInAppBrowser(UA.twitterIos)).toEqual({
      browser: "twitter",
      platform: "ios",
    });
    expect(detectInAppBrowser(UA.twitterAndroid)).toEqual({
      browser: "twitter",
      platform: "android",
    });
  });

  it("Instagram WebView を instagram として識別する", () => {
    expect(detectInAppBrowser(UA.instagramIos)).toEqual({
      browser: "instagram",
      platform: "ios",
    });
  });

  it("Facebook 系 (FBAN / FB_IAB) を facebook として識別する", () => {
    expect(detectInAppBrowser(UA.facebookIos)).toEqual({
      browser: "facebook",
      platform: "ios",
    });
    expect(detectInAppBrowser(UA.facebookAndroid)).toEqual({
      browser: "facebook",
      platform: "android",
    });
  });

  it("通常の Safari / Chrome は in-app browser として検出しない", () => {
    expect(detectInAppBrowser(UA.safariIos)).toBeNull();
    expect(detectInAppBrowser(UA.chromeAndroid)).toBeNull();
    expect(detectInAppBrowser(UA.chromeDesktop)).toBeNull();
  });

  it("UA が無い / 空文字なら null", () => {
    expect(detectInAppBrowser(null)).toBeNull();
    expect(detectInAppBrowser(undefined)).toBeNull();
    expect(detectInAppBrowser("")).toBeNull();
  });
});

describe("buildExternalBrowserUrl", () => {
  const SIGNIN = "https://kokannikki.app/auth/signin";
  const SIGNIN_WITH_QUERY = "https://kokannikki.app/auth/signin?callbackUrl=%2Fnotebooks";

  it("LINE は ?openExternalBrowser=1 を付けるだけ (LINE 公式仕様)", () => {
    expect(
      buildExternalBrowserUrl(SIGNIN, { browser: "line", platform: "ios" }),
    ).toBe("https://kokannikki.app/auth/signin?openExternalBrowser=1");
    expect(
      buildExternalBrowserUrl(SIGNIN, { browser: "line", platform: "android" }),
    ).toBe("https://kokannikki.app/auth/signin?openExternalBrowser=1");
  });

  it("LINE で既存 query があれば & で連結される", () => {
    expect(
      buildExternalBrowserUrl(SIGNIN_WITH_QUERY, {
        browser: "line",
        platform: "ios",
      }),
    ).toBe(
      "https://kokannikki.app/auth/signin?callbackUrl=%2Fnotebooks&openExternalBrowser=1",
    );
  });

  it("Android (非 LINE) は intent:// URL で Chrome を起動できる", () => {
    expect(
      buildExternalBrowserUrl(SIGNIN, {
        browser: "twitter",
        platform: "android",
      }),
    ).toBe(
      "intent://kokannikki.app/auth/signin#Intent;scheme=https;package=com.android.chrome;end",
    );
    expect(
      buildExternalBrowserUrl(SIGNIN_WITH_QUERY, {
        browser: "facebook",
        platform: "android",
      }),
    ).toBe(
      "intent://kokannikki.app/auth/signin?callbackUrl=%2Fnotebooks#Intent;scheme=https;package=com.android.chrome;end",
    );
  });

  it("iOS (非 LINE) は確実な scheme jump が無いので null", () => {
    // X / Instagram / FB の iOS 内蔵ブラウザからは Safari に確実に飛ばせない。
    // UI 側で「メニューから Safari で開く」を案内する方針 (lib/in-app-browser.ts 参照)。
    expect(
      buildExternalBrowserUrl(SIGNIN, { browser: "twitter", platform: "ios" }),
    ).toBeNull();
    expect(
      buildExternalBrowserUrl(SIGNIN, { browser: "instagram", platform: "ios" }),
    ).toBeNull();
    expect(
      buildExternalBrowserUrl(SIGNIN, { browser: "facebook", platform: "ios" }),
    ).toBeNull();
  });

  it("platform が unknown なら null (どの scheme で起こせばよいか分からない)", () => {
    expect(
      buildExternalBrowserUrl(SIGNIN, {
        browser: "twitter",
        platform: "unknown",
      }),
    ).toBeNull();
  });
});
