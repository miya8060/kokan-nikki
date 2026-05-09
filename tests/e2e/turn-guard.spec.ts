import { expect, test } from "@playwright/test";

import { loginAs, seedUser } from "@/tests/e2e/helpers/auth";
import { getE2EPrisma, truncateAll } from "@/tests/e2e/helpers/db";

// e2e-03 (testing.md §4.3):
//   F-TURN-05 / NF-SEC-04 — 他人のターン中に書き込みページへ直アクセスしても
//   入れない。実装は app/notebooks/[id]/write/page.tsx で:
//     - 非メンバー or ノート不在  → notFound (404)
//     - メンバーだが他人のターン  → /notebooks/[id] へ redirect
//   の二段ガードを敷いている。両方を別ケースで検証する。

test.beforeEach(async () => {
  await truncateAll();
});

test("メンバーでも他人のターン中の /write 直アクセスは詳細ページに redirect", async ({
  browser,
  baseURL,
}) => {
  const url = baseURL!;
  const prisma = getE2EPrisma();

  const userA = await seedUser({ name: "あすか" });
  const userB = await seedUser({ name: "びおら" });

  // A(0) / B(1)。A の投稿が最新 = 次のターンは B (lib/turn.ts)。
  const notebook = await prisma.notebook.create({
    data: {
      name: "ガード確認 にっき",
      createdById: userA.id,
      members: {
        create: [
          { userId: userA.id, orderIndex: 0 },
          { userId: userB.id, orderIndex: 1 },
        ],
      },
    },
  });
  await prisma.entry.create({
    data: {
      notebookId: notebook.id,
      authorId: userA.id,
      body: "A の さいしょの ぺーじ。",
    },
  });

  const ctxA = await browser.newContext();
  await loginAs(ctxA, userA, url);
  const pageA = await ctxA.newPage();

  // A が /write に直アクセス。F-TURN-05 で /notebooks/[id] に redirect されて
  // 「♡ きょうの にっき」見出しは出ず、詳細ページが描画される。
  const response = await pageA.goto(`/notebooks/${notebook.id}/write`);
  expect(response?.status()).toBe(200);
  await expect(pageA).toHaveURL(new RegExp(`/notebooks/${notebook.id}$`));
  await expect(
    pageA.getByRole("heading", { name: "♡ きょうの にっき" }),
  ).toHaveCount(0);
  // 詳細ページの見出し (Yusei Magic タイトル) が代わりに見える。♡ プレフィックスは
  // 旧詳細画面の名残で、新ヒーローはノート名そのものを h1 にする。
  await expect(
    pageA.getByRole("heading", { name: "ガード確認 にっき" }),
  ).toBeVisible();

  await ctxA.close();
});

test("非メンバーが /write を直アクセスすると 404 (NF-SEC-04 漏れ防止)", async ({
  browser,
  baseURL,
}) => {
  const url = baseURL!;
  const prisma = getE2EPrisma();

  const owner = await seedUser({ name: "おーなー" });
  const outsider = await seedUser({ name: "そとのひと" });

  const notebook = await prisma.notebook.create({
    data: {
      name: "ないしょ にっき",
      createdById: owner.id,
      members: { create: { userId: owner.id, orderIndex: 0 } },
    },
  });

  const ctx = await browser.newContext();
  await loginAs(ctx, outsider, url);
  const page = await ctx.newPage();

  // getNotebookDetail は非メンバーには null を返し、page.tsx は notFound() を
  // 叩く。Next.js の not-found.tsx は 404 ステータスで描画される。
  const response = await page.goto(`/notebooks/${notebook.id}/write`);
  expect(response?.status()).toBe(404);

  await ctx.close();
});
