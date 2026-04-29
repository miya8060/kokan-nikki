import { expect, test } from "@playwright/test";

import { checkA11y } from "@/tests/e2e/helpers/axe";

// e2e-04 (testing.md §4.3 / docs/requirements.md):
//   F-LP-01〜03 (9 セクション構成) + NF-A11Y-01〜02 (装飾アニメ停止 / a11y) を
//   未ログイン状態で `/` を開いて検証する。`/` は session があると /notebooks に
//   redirect されるが、新規 context は cookie を持たないのでそのままランディング
//   が描画される。
//
//   検証 1: 9 セクションがすべて DOM に出ていること (F-LP-01)
//   検証 2: axe (wcag2a/wcag2aa, serious 以上) で違反 0 (NF-A11Y-02)
//   検証 3: prefers-reduced-motion=reduce で
//     - ランディング配下の装飾アニメ (.marquee / .cutie-float) が animation: none
//     - 機能 transition (.btn-puff の transform transition) は生きていること
//       — testing.md §6.4 の「`*{animation:none}` 過剰適用バグ再発防止」

const SECTION_TESTIDS = [
  "lp-boot",
  "lp-hero",
  "lp-marquee-a",
  "lp-typewriter",
  "lp-photostack",
  "lp-marquee-b",
  "lp-scatter",
  "lp-message",
  "lp-outro",
] as const;

test("9 セクションが mount + axe 違反 0 (F-LP-01〜03 / NF-A11Y-02)", async ({
  page,
}) => {
  await page.goto("/");

  for (const id of SECTION_TESTIDS) {
    await expect(page.getByTestId(id), `section ${id} should be mounted`)
      .toBeVisible();
  }

  await checkA11y(page);
});

test("prefers-reduced-motion=reduce でランディングのみアニメ停止 (NF-A11Y-01)", async ({
  browser,
}) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  try {
    await page.goto("/");

    // 装飾アニメ: .landing-section 配下の .marquee / .cutie-float は
    // animation: none に倒れる。最低 2 系統 assert することで CSS の
    // スコープが壊れていないか担保する。
    const marqueeAnim = await page
      .locator(".marquee")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(marqueeAnim, ".marquee の装飾アニメは reduce で停止").toBe("none");

    const cutieAnim = await page
      .locator(".cutie-float")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(cutieAnim, ".cutie-float の装飾アニメは reduce で停止").toBe(
      "none",
    );

    // 機能 transition は生きていること (testing.md §6.4)。
    // HeroSection の PuffButton は href ありなので Link → <a class="btn-puff">。
    // `transition: transform 0.15s ...` が消えていない = transitionDuration が 0s 以外。
    const btnTransition = await page
      .locator(".btn-puff")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(
      btnTransition,
      "btn-puff の機能 transition は reduce でも維持されるべき",
    ).not.toBe("0s");
  } finally {
    await ctx.close();
  }
});
