import { describe, expect, it } from "vitest";

import * as notebooksActions from "@/app/_actions/notebooks";

// testing.md §5 / docs/remaining-features.md F-EDIT-03 — エントリの編集・削除が
// 「実装されていないこと」自体で要件を担保しているため、scope creep 検知用の
// guard test を 1 本置く。ここを通せば、誰かが `updateEntry` / `deleteEntry`
// を `app/_actions/notebooks` に追加した瞬間に CI が落ちる。
//
// 本テストは DB を触らないが、testing.md §5 上の主担当が「結合」レイヤなので
// tests/integration/ 配下に置く。globalSetup の代金はファイル単位ではなく
// プロジェクト単位なので増えない。

const FORBIDDEN_ENTRY_MUTATIONS = ["updateEntry", "deleteEntry"] as const;

describe("F-EDIT-03 entry edit/delete endpoints must not exist", () => {
  it("app/_actions/notebooks は updateEntry / deleteEntry を export しない", () => {
    const exported = Object.keys(notebooksActions);
    for (const name of FORBIDDEN_ENTRY_MUTATIONS) {
      expect(
        exported,
        `F-EDIT-03: '${name}' is not allowed as a Server Action. ` +
          `Entry editing / deletion is intentionally out of scope for the MVP. ` +
          `If this is a deliberate scope change, update docs/requirements.md ` +
          `(F-EDIT-03) and docs/remaining-features.md before removing this guard.`,
      ).not.toContain(name);
    }
  });
});
