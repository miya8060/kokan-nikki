import { expect, test } from "@playwright/test";

import { loginAs, seedUser } from "@/tests/e2e/helpers/auth";
import { checkA11y } from "@/tests/e2e/helpers/axe";
import { getE2EPrisma, truncateAll } from "@/tests/e2e/helpers/db";

// e2e-02 (testing.md §4.3):
//   F-NUDGE-01〜03 — 「もう かいた？」を押すと 24h 以内の再押下が UI 上で
//   disabled になる。サーバー側のレートリミットそのものは結合テストで
//   検証済みなので、ここでは UI が rate-limited 表示を出すことを確認する。
//
// 事前条件のセットアップは UI 経由ではなく Prisma で直接組む (ノート作成 →
// 招待 → 投稿 を毎回 UI で踏むと脆くて遅い)。e2e-01 がフローを通している
// ぶん、ここはセットアップを最短にしてシナリオの本質に集中する。

test.beforeEach(async () => {
  await truncateAll();
});

test("ナッジを送ると 24h 以内は同じ送信先へのボタンが disabled になる", async ({
  browser,
  baseURL,
}) => {
  const url = baseURL!;
  const prisma = getE2EPrisma();

  const userA = await seedUser({ name: "あすか" });
  const userB = await seedUser({ name: "びおら" });

  // メンバー A(0) / B(1)。最新エントリを A の投稿にすることで「次のターン = B」を
  // 確定させる (lib/turn.ts の cyclic ロジック)。これで A が B にナッジを送る
  // 立場になる。
  const notebook = await prisma.notebook.create({
    data: {
      name: "ナッジ確認 にっき",
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
      body: "A は さっき かいたから、つぎは B のばん。",
    },
  });

  const ctxA = await browser.newContext();
  await loginAs(ctxA, userA, url);
  const pageA = await ctxA.newPage();

  await pageA.goto(`/notebooks/${notebook.id}`);
  // turn-badge には次のターン者の名前が「{name}の ばん」 で出る。
  await expect(pageA.getByText("びおらの ばん")).toBeVisible();

  const nudgeButton = pageA.getByRole("button", { name: /もう かいた/ });
  await expect(nudgeButton).toBeEnabled();
  await checkA11y(pageA);

  // F-NUDGE-03: クリックで Nudge レコードが残る。送信後は revalidatePath で
  // 詳細ページが再描画されて、F-NUDGE-02 の rateLimited 分岐に入る。
  await nudgeButton.click();
  // revalidate 後の DOM 更新を待つ。disabled の DOM 反映を起点にする。
  await expect(
    pageA.getByRole("button", { name: /もう かいた/ }),
  ).toBeDisabled();
  await expect(pageA.getByText(/つぎに つつけるのは/)).toBeVisible();

  // Nudge 行が DB に残っている (F-NUDGE-03)。
  const nudges = await prisma.nudge.findMany({
    where: {
      notebookId: notebook.id,
      fromUserId: userA.id,
      toUserId: userB.id,
    },
  });
  expect(nudges).toHaveLength(1);

  // ページを直 reload しても disabled が維持される (cookie 経由の永続再現)。
  await pageA.reload();
  await expect(
    pageA.getByRole("button", { name: /もう かいた/ }),
  ).toBeDisabled();
  await expect(pageA.getByText(/つぎに つつけるのは/)).toBeVisible();
  await checkA11y(pageA);

  await ctxA.close();
});
