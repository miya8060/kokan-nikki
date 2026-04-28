// vi.mock("@/lib/auth") は session helper の import で発火する。auth() を
// 触る page module より先に読み込ませる必要があるため、最初の import に
// 置いている (post-entry.test.ts と同じ理由)。
import { clearMockSession, setMockSession } from "@/tests/helpers/session";

import { beforeEach, describe, expect, it } from "vitest";

import NotebookDetailPage from "@/app/notebooks/[id]/page";
import NotebookWritePage from "@/app/notebooks/[id]/write/page";
import { makeEntry, makeNotebook, makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

// e2e-03 の代替カバレッジ。Playwright スタックを抱える前段として、UI 側の
// F-TURN-05 ガードを Server Component を直接呼び出す形で検証する。redirect()
// は NEXT_REDIRECT;<type>;<url>;<status>; の形の digest を持つエラーを throw
// するので、ここでは digest を見て URL を取り出している。

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
  // digest = "NEXT_REDIRECT;<type>;<url>;<status>;" — Next 内部の
  // getURLFromRedirectError と同じ式 (trailing ';' が空要素を生むので -2)。
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

describe("NotebookWritePage UI guard (F-TURN-05 / e2e-03)", () => {
  it("他人のターン中に /notebooks/[id]/write を直アクセスすると詳細ページへ redirect する", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b] });
    // 初回ターンは a (orderIndex=0) なので、b は書けない側。
    setMockSession(b);

    let caught: unknown;
    try {
      await NotebookWritePage({ params: Promise.resolve({ id: notebook.id }) });
    } catch (e) {
      caught = e;
    }

    expect(isRedirect(caught)).toBe(true);
    if (!isRedirect(caught)) return;
    expect(redirectUrlFrom(caught)).toBe(`/notebooks/${notebook.id}`);
  });

  it("自分のターンであれば redirect せず描画される", async () => {
    const prisma = getPrisma();
    const a = await makeUser(prisma);
    const b = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: a, members: [b] });
    // a が初回投稿済み → 次のターンは b。
    await makeEntry(prisma, { notebook, author: a });
    setMockSession(b);

    const result = await NotebookWritePage({
      params: Promise.resolve({ id: notebook.id }),
    });

    // throw されない = redirect/notFound していない。返り値は React 要素。
    expect(result).toBeDefined();
  });

  it("非メンバーの直アクセスは notFound になる (NF-SEC-04)", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const stranger = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(stranger);

    let caught: unknown;
    try {
      await NotebookWritePage({
        params: Promise.resolve({ id: notebook.id }),
      });
    } catch (e) {
      caught = e;
    }

    expect(isNotFound(caught)).toBe(true);
  });
});

describe("NotebookDetailPage membership guard (NF-SEC-04)", () => {
  it("非メンバーが詳細ページを直アクセスしても notFound になる", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma);
    const stranger = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner });
    setMockSession(stranger);

    let caught: unknown;
    try {
      await NotebookDetailPage({
        params: Promise.resolve({ id: notebook.id }),
      });
    } catch (e) {
      caught = e;
    }

    expect(isNotFound(caught)).toBe(true);
  });
});
