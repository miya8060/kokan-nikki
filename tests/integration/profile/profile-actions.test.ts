// vi.mock("@/lib/auth") は session helper の import で発火する。auth() を触る
// action module より先に読み込ませる必要があるため、最初の import に置いている
// (settings-actions.test.ts と同じ理由)。
import { clearMockSession, setMockSession } from "@/tests/helpers/session";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { UpdateProfileError } from "@/app/_actions/errors";
import { setDisplayName, setIcon } from "@/app/_actions/profile";
import { makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

// F-USER-01 の Server Action を統合テスト。
// - DB を実際に引いて User.name が更新されることを確認する。
// - callbackUrl 付きで呼ばれた場合は NEXT_REDIRECT が throw される。redirect()
//   は次の SSR レンダで処理される副作用なので、ここでは throw された digest
//   を見て遷移先 URL を検証する。
// - 外部 URL は internal 判定で弾かれて /notebooks に倒す (NF-SEC: open
//   redirect 防御)。

const REDIRECT_DIGEST_PREFIX = "NEXT_REDIRECT;";

function isRedirect(err: unknown): err is { digest: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith(REDIRECT_DIGEST_PREFIX)
  );
}

function redirectUrlFrom(err: { digest: string }): string {
  return err.digest.split(";").slice(2, -2).join(";");
}

beforeEach(() => {
  clearMockSession();
  mocks.revalidatePath.mockClear();
});

describe("setDisplayName (F-USER-01)", () => {
  it("未ログインなら UpdateProfileError('unauthenticated') を投げる", async () => {
    const fd = new FormData();
    fd.set("displayName", "あすか");

    await expect(setDisplayName(fd)).rejects.toMatchObject({
      name: "UpdateProfileError",
      reason: "unauthenticated",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("displayName が空なら UpdateProfileError('invalid-input') を投げる", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma, { name: null });
    setMockSession(user);

    const fd = new FormData();
    fd.set("displayName", "   ");

    await expect(setDisplayName(fd)).rejects.toBeInstanceOf(UpdateProfileError);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();

    const reread = await prisma.user.findUnique({ where: { id: user.id } });
    expect(reread?.name).toBeNull();
  });

  it("正常系: User.name を更新して revalidatePath('/', 'layout') を呼ぶ", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma, { name: null });
    setMockSession(user);

    const fd = new FormData();
    fd.set("displayName", "  あすか  ");

    await setDisplayName(fd);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.name).toBe("あすか");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("internal な callbackUrl があれば更新後にそこへ redirect する", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma, { name: null });
    setMockSession(user);

    const fd = new FormData();
    fd.set("displayName", "あすか");
    fd.set("callbackUrl", "/invite/abc123");

    let caught: unknown;
    try {
      await setDisplayName(fd);
    } catch (e) {
      caught = e;
    }

    expect(isRedirect(caught)).toBe(true);
    if (!isRedirect(caught)) return;
    expect(redirectUrlFrom(caught)).toBe("/invite/abc123");

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.name).toBe("あすか");
  });

  it("外部 URL は弾いて /notebooks に倒す (NF-SEC open redirect 防御)", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma, { name: null });
    setMockSession(user);

    const fd = new FormData();
    fd.set("displayName", "あすか");
    fd.set("callbackUrl", "//evil.example/foo");

    let caught: unknown;
    try {
      await setDisplayName(fd);
    } catch (e) {
      caught = e;
    }

    expect(isRedirect(caught)).toBe(true);
    if (!isRedirect(caught)) return;
    expect(redirectUrlFrom(caught)).toBe("/notebooks");
  });

  it("callbackUrl 無しなら revalidate のみで redirect しない (/settings 用)", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma, { name: "あすか" });
    setMockSession(user);

    const fd = new FormData();
    fd.set("displayName", "ひびき");

    await setDisplayName(fd);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.name).toBe("ひびき");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

// F-USER-02: アイコン更新の Server Action。/settings からのみ呼ばれるため
// callbackUrl 経路は持たず、常に revalidatePath のみ。
describe("setIcon (F-USER-02)", () => {
  it("未ログインなら UpdateProfileError('unauthenticated') を投げる", async () => {
    const fd = new FormData();
    fd.set("icon", "heart");

    await expect(setIcon(fd)).rejects.toMatchObject({
      name: "UpdateProfileError",
      reason: "unauthenticated",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("未知のキーは UpdateProfileError('invalid-input') を投げる", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma);
    setMockSession(user);

    const fd = new FormData();
    fd.set("icon", "rocket");

    await expect(setIcon(fd)).rejects.toMatchObject({
      name: "UpdateProfileError",
      reason: "invalid-input",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();

    const reread = await prisma.user.findUnique({ where: { id: user.id } });
    expect(reread?.image).toBeNull();
  });

  it('保存形式 ("preset:heart") をフォーム値として受けても弾く (form schema は raw キーのみ)', async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma);
    setMockSession(user);

    const fd = new FormData();
    fd.set("icon", "preset:heart");

    await expect(setIcon(fd)).rejects.toMatchObject({
      reason: "invalid-input",
    });
  });

  it("プリセット選択は preset:KEY として保存される", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma);
    setMockSession(user);

    const fd = new FormData();
    fd.set("icon", "heart");

    await setIcon(fd);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.image).toBe("preset:heart");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it('"" を送ると User.image を null に戻す (デフォルトアイコン)', async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma, { image: "preset:star" });
    setMockSession(user);

    const fd = new FormData();
    fd.set("icon", "");

    await setIcon(fd);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.image).toBeNull();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
