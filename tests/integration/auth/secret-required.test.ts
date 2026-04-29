// NF-SEC-01: AUTH_SECRET が無い (空 / 欠落) 状態で @/lib/auth を import すると
// 落ちることを保証する。`.env.local` 設定漏れや Vercel 側の env 不足を、
// 最初の magic-link リクエストではなく CI の段階で気付ける装置にする。
//
// `_setup.ts` は他の auth integration テスト用に AUTH_SECRET をセット (= 共有
// 状態を変える) する副作用 import なので、ここでは取り込まない。env と module
// cache を per-test に独立 reset することで他テストのトレースに影響されない。
//
// なお、本来は `delete process.env.AUTH_SECRET` で「未設定」を再現したいが、
// vite/vitest は dynamic import の解決パスで `.env` 由来の env を process.env
// に再注入してくる (setupCommonEnv → setupEnv の sync ループ) ため、delete
// した値が import 評価時に復活する。`vi.stubEnv` 経由で空文字をセットすると
// 再注入には負けず stub 値が pin される。guard は `!process.env.AUTH_SECRET`
// で undefined / "" を同じ分岐で弾くので、empty string ケースで十分担保できる。
import { afterEach, describe, expect, it, vi } from "vitest";

describe("@/lib/auth は AUTH_SECRET 必須 (NF-SEC-01)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("AUTH_SECRET が空 (= 未設定相当) だと import が reject する", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    vi.resetModules();
    await expect(import("@/lib/auth")).rejects.toThrow(/AUTH_SECRET/);
  });

  it("AUTH_SECRET があれば import は成功する (sanity check)", async () => {
    vi.stubEnv("AUTH_SECRET", "kokan-secret-required-test-deadbeef");
    vi.resetModules();
    const mod = await import("@/lib/auth");
    expect(mod.handlers).toBeDefined();
    expect(mod.auth).toBeTypeOf("function");
  });
});
