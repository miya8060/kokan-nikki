import { expect, test } from "@playwright/test";

import { loginAs, seedUser } from "@/tests/e2e/helpers/auth";
import { checkA11y } from "@/tests/e2e/helpers/axe";
import { getE2EPrisma, truncateAll } from "@/tests/e2e/helpers/db";

// e2e-01 (testing.md §4.3 / docs/requirements.md):
//   F-NB-01〜04 / F-INV-01〜06 / F-TURN-01〜04 を貫通する。
//
//   1. A がノートを作成 (作成者が orderIndex=0 で同時登録: F-NB-03)
//   2. A が招待リンクを発行 (F-INV-01 / F-INV-04)
//   3. B がリンクを踏んで受諾、メンバーが 2 人になる (F-INV-05 / F-INV-06)
//   4. A は最初のターン担当 (entries 0 件 → orderIndex=0: F-TURN-03)
//   5. A が投稿、次のターンが B に回る (F-TURN-02)
//   6. B が投稿、次のターンが A に戻る (F-TURN-04)

test.beforeEach(async () => {
  await truncateAll();
});

test("notebook → invite → accept → A→B 投稿でターンが回る", async ({
  browser,
  baseURL,
}) => {
  expect(
    baseURL,
    "baseURL は playwright.config.ts で設定されている必要",
  ).toBeDefined();
  const url = baseURL!;

  const userA = await seedUser({ name: "あすか" });
  const userB = await seedUser({ name: "びおら" });

  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  await loginAs(ctxA, userA, url);
  await loginAs(ctxB, userB, url);

  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // --- (1) A がノートを作る ----------------------------------------------
  await pageA.goto("/notebooks");
  await expect(
    pageA.getByRole("heading", { name: "♡ にっき いちらん" }),
  ).toBeVisible();
  await checkA11y(pageA);

  await pageA.getByLabel("name").fill("ひみつ こうかんにっき");
  await pageA.getByRole("button", { name: /つくる/ }).click();
  // revalidate + redirect で /notebooks に戻り、新規ノートのカードが見える。
  await expect(
    pageA.getByRole("link", { name: /ひみつ こうかんにっき/ }),
  ).toBeVisible();

  // --- (2) A がノート詳細から招待リンクを発行 ----------------------------
  await pageA.getByRole("link", { name: /ひみつ こうかんにっき/ }).click();
  await expect(
    pageA.getByRole("heading", { name: "♡ ひみつ こうかんにっき" }),
  ).toBeVisible();
  // 自分しかメンバーが居ない状態では A が次のターン (F-TURN-03)。
  await expect(pageA.getByText("あなた ♡")).toBeVisible();
  await checkA11y(pageA);

  await pageA
    .getByRole("link", { name: /しょうたい りんくを はっこう/ })
    .click();
  await pageA.getByRole("button", { name: /はっこう する/ }).click();
  await expect(pageA.getByLabel("しょうたい URL")).toBeVisible();

  const inviteUrl = await pageA.getByLabel("しょうたい URL").inputValue();
  expect(inviteUrl).toMatch(/\/invite\/[A-Za-z0-9_-]+$/);
  const inviteCode = inviteUrl.split("/invite/")[1];
  expect(inviteCode.length).toBeGreaterThan(0);

  // DB 側でも invite が 1 本だけ生きていることを確認 (F-INV-04)。
  const prisma = getE2EPrisma();
  const liveInvites = await prisma.invite.findMany({
    where: { usedAt: null },
  });
  expect(liveInvites).toHaveLength(1);

  // --- (3) B が招待を踏んで受諾 -----------------------------------------
  await pageB.goto(`/invite/${inviteCode}`);
  await expect(
    pageB.getByRole("heading", { name: "♡ しょうたい とどいた" }),
  ).toBeVisible();
  await pageB.getByRole("button", { name: /さんか する/ }).click();
  // acceptInvite は notebookId に redirect する (F-INV-05/F-INV-06 と同じ動線)。
  await expect(pageB).toHaveURL(/\/notebooks\/[a-z0-9]+$/);
  await expect(
    pageB.getByRole("heading", { name: "♡ ひみつ こうかんにっき" }),
  ).toBeVisible();
  await expect(pageB.getByText(/2 にん で こうかんちゅう/)).toBeVisible();

  // --- (4) A はまだ次のターン (entries 0 件) -----------------------------
  await pageA.goto("/notebooks");
  // 一覧の next-turn 表示が「あなた ♡」のまま。
  await expect(pageA.getByText("あなた ♡")).toBeVisible();
  await pageA.getByRole("link", { name: /ひみつ こうかんにっき/ }).click();
  await expect(
    pageA.getByRole("link", { name: /きょうの にっきを かく/ }),
  ).toBeVisible();

  // --- (5) A が投稿 → 次のターンが B に渡る (F-TURN-02) ------------------
  await pageA.getByRole("link", { name: /きょうの にっきを かく/ }).click();
  await expect(pageA).toHaveURL(/\/write$/);
  await pageA
    .getByLabel("body")
    .fill("きょうは A が さいしょの ぺーじを かいたよ ♡");
  await pageA.getByRole("button", { name: /かきおわった/ }).click();
  // 投稿後は詳細画面に戻り、A は次のターンではなくなる。
  await expect(pageA).toHaveURL(/\/notebooks\/[a-z0-9]+$/);
  // A 視点では「びおら が次のターン」表示 (= ナッジブロックが見える)。
  await expect(pageA.getByText(/つぎの ばんは/)).toBeVisible();
  await expect(
    pageA.getByRole("button", { name: /もう かいた/ }),
  ).toBeVisible();

  // B 視点でも自分のターンに変わっている。
  await pageB.reload();
  await expect(pageB.getByText("あなた ♡")).toBeVisible();
  await expect(
    pageB.getByRole("link", { name: /きょうの にっきを かく/ }),
  ).toBeVisible();
  // 直前に A が投稿したエントリがタイムラインに見える (F-TURN-04: 新しい順)。
  await expect(
    pageB.getByText("きょうは A が さいしょの ぺーじを かいたよ ♡"),
  ).toBeVisible();

  // --- (6) B が投稿 → 次のターンが A に戻る (F-TURN-04 cyclic) -----------
  await pageB.getByRole("link", { name: /きょうの にっきを かく/ }).click();
  await pageB.getByLabel("body").fill("つぎは わたし、B からだよ ♡");
  await pageB.getByRole("button", { name: /かきおわった/ }).click();
  await expect(pageB).toHaveURL(/\/notebooks\/[a-z0-9]+$/);
  // B はもう次のターンではない。
  await expect(pageB.getByText("あなた ♡")).not.toBeVisible();

  await pageA.reload();
  await expect(pageA.getByText("あなた ♡")).toBeVisible();
  // タイムラインは新しい順なので B の投稿が一番上。
  const entries = pageA.locator("section ul li");
  await expect(entries.nth(0)).toContainText("つぎは わたし、B からだよ");
  await expect(entries.nth(1)).toContainText(
    "きょうは A が さいしょの ぺーじを かいたよ",
  );

  await checkA11y(pageA);

  await ctxA.close();
  await ctxB.close();
});

// 補助: 認証されていないアクセスは /auth/signin に redirect される (F-AUTH-04)。
test("未ログインで /notebooks を踏むと サインインに誘導される", async ({
  browser,
}) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/notebooks");
  await expect(page).toHaveURL(/\/auth\/signin/);
  await expect(page.getByRole("heading", { name: /さいんいん/ })).toBeVisible();
  await ctx.close();
});
