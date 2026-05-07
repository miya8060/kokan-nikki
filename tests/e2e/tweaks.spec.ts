import { expect, test } from "@playwright/test";

import { loginAs, seedUser } from "@/tests/e2e/helpers/auth";
import { truncateAll } from "@/tests/e2e/helpers/db";

// #92 Tweaks panel
//   /settings の sticker トグルを 1 度押すと、SSR で <html data-stickers> が
//   "off" に倒れ、再 reload 後の /notebooks でも維持されることを確認する。
//   これで AC の「cookie 永続化」「<html data-...> に SSR 反映 / FOUC 無し」が
//   1 経路で踏めるので、残り (sparkle / tape / pageFlip) は cookie / 描画分岐の
//   ロジックが共通の parseTweak / setTweak を経由している前提で integration /
//   unit テスト側に寄せる。

test.beforeEach(async () => {
  await truncateAll();
});

test("tweaks: /settings で stickers を OFF にすると <html data-stickers> が反映される", async ({
  browser,
  baseURL,
}) => {
  expect(baseURL).toBeDefined();
  const url = baseURL!;

  const user = await seedUser({ name: "つぼみ" });
  const ctx = await browser.newContext();
  await loginAs(ctx, user, url);
  const page = await ctx.newPage();

  // 初期状態: cookie 未設定 → handoff default の ON。
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "⚙ せってい" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-stickers", "on");
  await expect(page.locator("html")).toHaveAttribute("data-page-flip", "off");

  // sticker の toggle を踏む。Server Action で cookie が書かれ、
  // revalidatePath("/", "layout") で <html> ごと SSR し直されるはず。
  await page
    .getByTestId("tweak-toggle-stickers")
    .click({ trial: false });

  await expect(page.locator("html")).toHaveAttribute("data-stickers", "off");
  // 同じ操作で other toggle が変わっていないこと。
  await expect(page.locator("html")).toHaveAttribute("data-tape", "on");

  // /notebooks に遷移しても OFF が維持される (= cookie 永続)。
  await page.goto("/notebooks");
  await expect(page.locator("html")).toHaveAttribute("data-stickers", "off");

  await ctx.close();
});
