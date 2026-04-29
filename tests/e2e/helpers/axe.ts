import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// testing.md §4.5: 各シナリオ末尾で axe を流し、serious 以上の違反を fail に
// する。Auth.js が挟む iframe や Next の dev banner など除外したい要素が出たら
// excludes を使うが、現状は対象画面が薄いので未指定でよい。

export async function checkA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );

  if (blocking.length > 0) {
    // expect の diff として読みやすくするため id + nodes だけ抜き出す。
    const summary = blocking.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => n.target),
    }));
    expect(summary, "axe violations (serious/critical)").toEqual([]);
  }
}
