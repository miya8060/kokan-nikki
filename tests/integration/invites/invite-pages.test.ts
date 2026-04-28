// vi.mock("@/lib/auth") は session helper の import で発火する。auth() を触る
// page module より先に読み込ませる必要があるため、最初の import に置いている
// (write-page-guard.test.ts と同じ理由)。
import { clearMockSession, setMockSession } from "@/tests/helpers/session";

import { beforeEach, describe, expect, it, vi } from "vitest";

import InviteAcceptPage from "@/app/invite/[code]/page";
import NotebookInvitePage from "@/app/notebooks/[id]/invite/page";
import { generateInviteCode, NOTEBOOK_MAX_MEMBERS } from "@/lib/invites";
import { makeInvite, makeNotebook, makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

// 招待発行ページは「既存 invite あり」分岐で next/headers の headers() を読む。
// これは Next の request context が無いと throw するため、テスト中はダミーを
// 返すモックに差し替える。host / x-forwarded-proto を返す Headers 互換オブジェクト
// で、URL の組み立てが落ちないだけを目的にしている。
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ host: "test.local", "x-forwarded-proto": "https" }),
}));

const REDIRECT_DIGEST_PREFIX = "NEXT_REDIRECT;";
const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";

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
  // digest = "NEXT_REDIRECT;<type>;<url>;<status>;" — 末尾の空要素ぶん -2。
  return err.digest.split(";").slice(2, -2).join(";");
}

function isNotFound(err: unknown): err is { digest: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    (err as { digest: unknown }).digest === NOT_FOUND_DIGEST
  );
}

beforeEach(() => {
  clearMockSession();
});

describe("NotebookInvitePage (F-INV-01 / NF-SEC-04)", () => {
  it("未ログインは /auth/signin?callbackUrl=... に redirect する", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    // setMockSession を呼ばないので auth() は null。

    let caught: unknown;
    try {
      await NotebookInvitePage({
        params: Promise.resolve({ id: notebook.id }),
      });
    } catch (e) {
      caught = e;
    }
    expect(isRedirect(caught)).toBe(true);
    if (!isRedirect(caught)) return;
    expect(redirectUrlFrom(caught)).toBe(
      `/auth/signin?callbackUrl=/notebooks/${notebook.id}/invite`,
    );
  });

  it("非メンバーの直アクセスは notFound になる (NF-SEC-04)", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const stranger = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(stranger);

    let caught: unknown;
    try {
      await NotebookInvitePage({
        params: Promise.resolve({ id: notebook.id }),
      });
    } catch (e) {
      caught = e;
    }
    expect(isNotFound(caught)).toBe(true);
  });

  it("メンバーで未発行のときは form 表示の Server Component が描画される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(owner);

    const result = await NotebookInvitePage({
      params: Promise.resolve({ id: notebook.id }),
    });
    // throw されない = redirect / notFound が走っていない。
    expect(result).toBeDefined();
  });

  it("メンバーで既存 invite があると URL 表示の Server Component が描画される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    await makeInvite(prisma, { notebook });
    setMockSession(owner);

    const result = await NotebookInvitePage({
      params: Promise.resolve({ id: notebook.id }),
    });
    // headers() モックが効いて URL 組み立てまで到達できていれば throw しない。
    expect(result).toBeDefined();
  });
});

describe("InviteAcceptPage (F-INV-05 / F-INV-06)", () => {
  it("未ログインは /auth/signin?callbackUrl=/invite/[code] に redirect する (F-INV-05)", async () => {
    const code = generateInviteCode();

    let caught: unknown;
    try {
      await InviteAcceptPage({ params: Promise.resolve({ code }) });
    } catch (e) {
      caught = e;
    }
    expect(isRedirect(caught)).toBe(true);
    if (!isRedirect(caught)) return;
    expect(redirectUrlFrom(caught)).toBe(`/auth/signin?callbackUrl=/invite/${code}`);
  });

  it("既メンバーは /notebooks/{id} へ idempotent redirect する (F-INV-06)", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const member = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner, members: [member] });
    const invite = await makeInvite(prisma, { notebook });
    setMockSession(member);

    let caught: unknown;
    try {
      await InviteAcceptPage({ params: Promise.resolve({ code: invite.code }) });
    } catch (e) {
      caught = e;
    }
    expect(isRedirect(caught)).toBe(true);
    if (!isRedirect(caught)) return;
    expect(redirectUrlFrom(caught)).toBe(`/notebooks/${notebook.id}`);

    // F-INV-06: 既メンバーは招待を消費していないこと。
    const after = await prisma.invite.findUnique({
      where: { code: invite.code },
    });
    expect(after?.usedAt).toBeNull();
  });

  it("形式不正なコードはエラー UI を描画する (throw しない)", async () => {
    const prisma = getPrisma();
    const joiner = await makeUser(prisma);
    setMockSession(joiner);

    const result = await InviteAcceptPage({
      params: Promise.resolve({ code: "garbage" }),
    });
    expect(result).toBeDefined();
  });

  it("存在しないコードはエラー UI を描画する", async () => {
    const prisma = getPrisma();
    const joiner = await makeUser(prisma);
    setMockSession(joiner);

    const result = await InviteAcceptPage({
      params: Promise.resolve({ code: generateInviteCode() }),
    });
    expect(result).toBeDefined();
  });

  it("期限切れの invite はエラー UI を描画する (F-INV-02)", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const joiner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    const invite = await makeInvite(prisma, {
      notebook,
      expiresAt: new Date(Date.now() - 60_000),
    });
    setMockSession(joiner);

    const result = await InviteAcceptPage({
      params: Promise.resolve({ code: invite.code }),
    });
    expect(result).toBeDefined();
    // ページ側が throw しない = redirect / acceptInvite に進んでいない。
    const after = await prisma.invite.findUnique({
      where: { code: invite.code },
    });
    expect(after?.usedAt).toBeNull();
  });

  it("使用済み invite はエラー UI を描画する (F-INV-03)", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const joiner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    const invite = await makeInvite(prisma, { notebook });
    await prisma.invite.update({
      where: { code: invite.code },
      data: { usedAt: new Date(Date.now() - 1000) },
    });
    setMockSession(joiner);

    const result = await InviteAcceptPage({
      params: Promise.resolve({ code: invite.code }),
    });
    expect(result).toBeDefined();
  });

  it("満員ノートの invite はエラー UI を描画する (F-INV-07)", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const fillers = [];
    for (let i = 0; i < NOTEBOOK_MAX_MEMBERS - 1; i += 1) {
      fillers.push(await makeUser(prisma));
    }
    const seventh = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner, members: fillers });
    const invite = await makeInvite(prisma, { notebook });
    setMockSession(seventh);

    const result = await InviteAcceptPage({
      params: Promise.resolve({ code: invite.code }),
    });
    expect(result).toBeDefined();
    // ページ側で弾いているので acceptInvite は走らず invite は未消費。
    const after = await prisma.invite.findUnique({
      where: { code: invite.code },
    });
    expect(after?.usedAt).toBeNull();
  });

  it("通常の有効な invite を非メンバーが踏むと確認画面が描画される", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const joiner = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    const invite = await makeInvite(prisma, { notebook });
    setMockSession(joiner);

    const result = await InviteAcceptPage({
      params: Promise.resolve({ code: invite.code }),
    });
    expect(result).toBeDefined();
    // 描画されるだけ = まだ submit していないので invite は未消費。
    const after = await prisma.invite.findUnique({
      where: { code: invite.code },
    });
    expect(after?.usedAt).toBeNull();
  });
});
