import { expect, test } from "@playwright/test";

// issue #64: 独自エラーページ
//   not-found は app/not-found.tsx, ランタイム error は app/error.tsx,
//   root layout も巻き込むケースは app/global-error.tsx で受ける。
//   未マッチ URL を踏んだ時に Next.js デフォルトの "404: This page could
//   not be found" ではなく独自の "みつからない" / "トップに もどる" が
//   出ることを smoke で検証する。
//   error.tsx / global-error.tsx は production build で意図的に throw
//   するルートを持たないため、e2e は not-found のみ。

test("未マッチ URL は独自 not-found ページを返す", async ({ page }) => {
  const res = await page.goto("/this-route-does-not-exist-xyz", {
    waitUntil: "domcontentloaded",
  });
  expect(res?.status(), "404 ステータスで応答する").toBe(404);

  await expect(
    page.getByRole("heading", { level: 1, name: "みつからない" }),
  ).toBeVisible();
  // 「♡ トップに もどる」リンク (PuffButton / next/link) が描画されている
  await expect(page.getByRole("link", { name: /トップに もどる/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /にっき よむ/ })).toBeVisible();
});

test("not-found ページの 'トップに もどる' でランディングへ遷移する", async ({
  page,
}) => {
  await page.goto("/another-missing-route");
  await page.getByRole("link", { name: /トップに もどる/ }).click();
  await page.waitForURL("**/");
  // 未ログインなら / はランディング (page.tsx) を出す。Marquee の
  // 「DREAMY ♡ PIXEL」は LP 専用なのでこれで LP に着いたことを確認できる。
  await expect(page.getByText("DREAMY ♡ PIXEL").first()).toBeVisible();
});
