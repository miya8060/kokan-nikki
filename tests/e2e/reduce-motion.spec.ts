import { expect, test, type Page } from "@playwright/test";

// NF-A11Y-01 (testing.md §6.4):
//   `<html class="reduce-motion">` を明示付与した時のみ装飾アニメ
//   (.marquee / .sparkle / .cutie-float) を停止させる。
//   検証 1: クラス付与時、装飾の animationName === 'none'
//   検証 2: 同条件下でも .btn-puff の transition は生きている
//          (`*{animation:none}` 過剰適用バグの再発防止)
//   検証 3: クラス未付与時は装飾アニメが流れている
//
//   ランディング (/) は未ログインなら Marquee + Sparkle + FloatingCutie +
//   PuffButton を全部描画するので、追加 fixture 無しで全選択子を踏める。

const SELECTORS = [".marquee", ".sparkle", ".cutie-float"] as const;

async function animationNames(page: Page, selector: string): Promise<string[]> {
  return page.$$eval(selector, (els) =>
    els.map((el) => getComputedStyle(el).animationName),
  );
}

test("クラス未付与時は装飾アニメが流れている (検証 3)", async ({ page }) => {
  await page.goto("/");

  for (const sel of SELECTORS) {
    const names = await animationNames(page, sel);
    expect(names.length, `${sel} がランディングに描画されていること`).toBeGreaterThan(0);
    for (const name of names) {
      expect(name, `${sel} の animationName が 'none' でない`).not.toBe("none");
    }
  }
});

test(".reduce-motion 付与で装飾は止まり、ボタンの transition は生存 (検証 1 + 2)", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.classList.add("reduce-motion");
  });

  for (const sel of SELECTORS) {
    const names = await animationNames(page, sel);
    expect(names.length, `${sel} が描画されていること`).toBeGreaterThan(0);
    for (const name of names) {
      expect(name, `${sel} は reduce-motion 下で animation: none`).toBe("none");
    }
  }

  // 機能 transition は生きていること。.btn-puff は globals.css で
  // transition: transform .15s, box-shadow .15s を持つので 0s 以外。
  const transitionDurations = await page.$$eval(".btn-puff", (els) =>
    els.map((el) => getComputedStyle(el).transitionDuration),
  );
  expect(transitionDurations.length, ".btn-puff が描画されていること").toBeGreaterThan(0);
  for (const d of transitionDurations) {
    // "0.15s, 0.15s" のような複数値で来るので、すべての成分が 0s 以外であることを確認。
    const allZero = d.split(",").every((part) => part.trim() === "0s");
    expect(allZero, `.btn-puff transition-duration='${d}' が 0s に倒れていない`).toBe(false);
  }
});
