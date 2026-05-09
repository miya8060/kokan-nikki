// vi.mock("@/lib/auth") は session helper の import で発火する。auth() を触る
// action module より先に読み込ませる必要があるため、最初の import に置いている
// (settings-actions.test.ts と同じ理由)。
import { clearMockSession, setMockSession } from "@/tests/helpers/session";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

// @vercel/blob は外部 API なので integration からも mock。put / del の呼ばれ方を
// 主張するテストが多いので、戻り値だけ既定値を beforeEach で詰めなおす。
vi.mock("@vercel/blob", () => ({
  put: mocks.put,
  del: mocks.del,
}));

import { UpdateProfileError } from "@/app/_actions/errors";
import { setIcon, setDisplayName, uploadIcon } from "@/app/_actions/profile";
import { makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

const UPLOADED_URL = "https://test.public.blob.vercel-storage.com/users/u/icon.jpg";
const OLD_UPLOADED_URL =
  "https://test.public.blob.vercel-storage.com/users/u/old-icon.jpg";

function makeJpegFile(size = 1024): File {
  return new File([new Uint8Array(size)], "icon.jpg", { type: "image/jpeg" });
}

function makeUploadFormData(file: File): FormData {
  const fd = new FormData();
  fd.set("file", file);
  return fd;
}

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
  mocks.put.mockReset();
  mocks.del.mockReset();
  mocks.put.mockResolvedValue({ url: UPLOADED_URL });
  mocks.del.mockResolvedValue(undefined);
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
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

  it("preset から preset への切替では del() を呼ばない (Blob URL ではないので孤児なし)", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma, { image: "preset:heart" });
    setMockSession(user);

    const fd = new FormData();
    fd.set("icon", "star");

    await setIcon(fd);

    expect(mocks.del).not.toHaveBeenCalled();
  });

  it("URL → preset 遷移では旧 URL を Vercel Blob から削除する (F-USER-03)", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma, { image: OLD_UPLOADED_URL });
    setMockSession(user);

    const fd = new FormData();
    fd.set("icon", "star");

    await setIcon(fd);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.image).toBe("preset:star");
    expect(mocks.del).toHaveBeenCalledWith(OLD_UPLOADED_URL);
  });
});

// F-USER-03: アイコン画像のアップロード Server Action。Vercel Blob は
// vi.mock しているので put() が呼ばれた事実と DB 反映を主張する。
describe("uploadIcon (F-USER-03)", () => {
  it("未ログインなら UpdateProfileError('unauthenticated') を投げる", async () => {
    await expect(uploadIcon(makeUploadFormData(makeJpegFile()))).rejects.toMatchObject({
      name: "UpdateProfileError",
      reason: "unauthenticated",
    });
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("BLOB_READ_WRITE_TOKEN 未設定なら 'upload-disabled' (Preview 経路)", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma);
    setMockSession(user);
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");

    await expect(uploadIcon(makeUploadFormData(makeJpegFile()))).rejects.toMatchObject({
      reason: "upload-disabled",
    });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("正常系 (preset → URL): put が呼ばれて User.image に URL が入り、del は呼ばれない", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma, { image: "preset:heart" });
    setMockSession(user);

    await uploadIcon(makeUploadFormData(makeJpegFile()));

    expect(mocks.put).toHaveBeenCalledTimes(1);
    const [key, body, options] = mocks.put.mock.calls[0]!;
    expect(key).toBe(`users/${user.id}/icon.jpg`);
    expect(body).toBeInstanceOf(File);
    expect(options).toMatchObject({
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: true,
    });

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.image).toBe(UPLOADED_URL);
    expect(mocks.del).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("正常系 (URL → URL): 旧 URL を del() してから新 URL に張り替え", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma, { image: OLD_UPLOADED_URL });
    setMockSession(user);

    await uploadIcon(makeUploadFormData(makeJpegFile()));

    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.del).toHaveBeenCalledWith(OLD_UPLOADED_URL);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.image).toBe(UPLOADED_URL);
  });

  it("del() 失敗時は throw せずログだけ残して新 URL の保存は完了する", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma, { image: OLD_UPLOADED_URL });
    setMockSession(user);
    mocks.del.mockRejectedValueOnce(new Error("blob not found"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await uploadIcon(makeUploadFormData(makeJpegFile()));

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.image).toBe(UPLOADED_URL);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("許可外 mime (text/plain) は 'upload-invalid-type'", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma);
    setMockSession(user);

    const fd = makeUploadFormData(
      new File([new Uint8Array(16)], "x.txt", { type: "text/plain" }),
    );
    await expect(uploadIcon(fd)).rejects.toMatchObject({
      reason: "upload-invalid-type",
    });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("1MB 超過は 'upload-too-large'", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma);
    setMockSession(user);

    const fd = makeUploadFormData(makeJpegFile(1024 * 1024 + 1));
    await expect(uploadIcon(fd)).rejects.toMatchObject({
      reason: "upload-too-large",
    });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("file が無い (空 FormData) は 'upload-failed'", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma);
    setMockSession(user);

    await expect(uploadIcon(new FormData())).rejects.toBeInstanceOf(
      UpdateProfileError,
    );
    expect(mocks.put).not.toHaveBeenCalled();
  });
});
