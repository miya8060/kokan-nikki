// F-AUTH-01 / F-AUTH-03
// app/_actions/auth.ts は @/lib/auth の signIn / signOut を Server Action 文脈で
// 公開するための薄いラッパ。実体の magic-link 経路は sign-in.test.ts /
// callback.test.ts で網羅済なので、ここでは「Resend provider に FormData が
// そのまま流れる」「サインアウト後はランディングへ戻る」の 2 つの契約だけを
// 固定する smoke として残す。
//
// _setup.ts (AUTH_SECRET 設定) は @/lib/auth を実モジュールとして読み込む
// ためのものだが、本ファイルは @/lib/auth 自体を vi.mock するので不要。
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth", () => ({
  signIn: mocks.signIn,
  signOut: mocks.signOut,
}));

import { requestSignIn, signOutAction } from "@/app/_actions/auth";

beforeEach(() => {
  mocks.signIn.mockClear();
  mocks.signOut.mockClear();
});

describe("requestSignIn (F-AUTH-01)", () => {
  it("forwards the raw FormData to signIn('resend', formData)", async () => {
    const fd = new FormData();
    fd.set("email", "alice@test.local");

    await requestSignIn(fd);

    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    expect(mocks.signIn).toHaveBeenCalledWith("resend", fd);
  });
});

describe("signOutAction (F-AUTH-03)", () => {
  it("invokes signOut with redirectTo: '/' so the user lands on the landing page", async () => {
    await signOutAction();

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });
});
