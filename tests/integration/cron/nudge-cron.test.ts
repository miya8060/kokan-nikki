// vi.mock は vitest が自動で hoist するため、route の import より前に
// 物理的に書いてあれば順序は問題ない。sendMail を捕まえて副作用 (FS 書き込み /
// Resend HTTP) を切り離した状態で route の挙動を検証する。
import { vi, afterEach, beforeEach, describe, expect, it } from "vitest";

vi.mock("@/lib/mailer", () => ({
  sendMail: vi.fn(async () => {}),
}));

import { GET } from "@/app/api/cron/nudge/route";
import { sendMail } from "@/lib/mailer";
import { makeEntry, makeNotebook, makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

const TEST_SECRET = "test-cron-secret-deadbeef-cafef00d";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.mocked(sendMail).mockClear();
  process.env.CRON_SECRET = TEST_SECRET;
  process.env.NUDGE_THRESHOLD_HOURS = "72";
  process.env.EMAIL_FROM = "test <noreply@test.local>";
  delete process.env.AUTH_URL;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function makeReq(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  return new Request("http://localhost/api/cron/nudge", { headers });
}

describe("GET /api/cron/nudge (F-NUDGE-04 / NF-SEC-02)", () => {
  describe("Bearer 認証 (NF-SEC-02)", () => {
    it("Authorization ヘッダ無しは 401, sendMail は呼ばれない", async () => {
      const res = await GET(makeReq(undefined));
      expect(res.status).toBe(401);
      expect(sendMail).not.toHaveBeenCalled();
    });

    it("Bearer 不一致は 401", async () => {
      const res = await GET(makeReq("Bearer wrong-secret"));
      expect(res.status).toBe(401);
      expect(sendMail).not.toHaveBeenCalled();
    });

    it("scheme が Bearer 以外は 401", async () => {
      const res = await GET(makeReq(`Basic ${TEST_SECRET}`));
      expect(res.status).toBe(401);
    });

    it("CRON_SECRET 未設定なら、空文字列 Bearer でも 401 (env 漏れで open にならないこと)", async () => {
      delete process.env.CRON_SECRET;
      const res1 = await GET(makeReq("Bearer "));
      const res2 = await GET(makeReq("Bearer anything"));
      expect(res1.status).toBe(401);
      expect(res2.status).toBe(401);
    });

    it("正しい Bearer は 200", async () => {
      const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
      expect(res.status).toBe(200);
    });
  });

  describe("ナッジ送信 (F-NUDGE-04)", () => {
    it("threshold 超過 notebook の現ターン者にメールを送る", async () => {
      const prisma = getPrisma();
      const a = await makeUser(prisma, { email: "a@test.local" });
      const b = await makeUser(prisma, {
        email: "b@test.local",
        name: "びーさん",
      });
      const nb = await makeNotebook(prisma, {
        owner: a,
        members: [b],
        name: "テストノート",
      });
      // 80h 前 → 72h を超過。a 投稿なので現ターンは b。
      await makeEntry(prisma, {
        notebook: nb,
        author: a,
        createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
      });

      const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        ok: boolean;
        sent: { notebookId: string; toUserId: string }[];
      };
      expect(body.ok).toBe(true);
      expect(body.sent).toEqual([{ notebookId: nb.id, toUserId: b.id }]);

      expect(sendMail).toHaveBeenCalledTimes(1);
      const call = vi.mocked(sendMail).mock.calls[0][0];
      expect(call).toMatchObject({
        to: "b@test.local",
        from: "test <noreply@test.local>",
        kind: "nudge",
      });
      expect(call.subject).toContain("テストノート");
      expect(call.text).toContain("びーさん");
      expect(call.text).toContain(`/notebooks/${nb.id}`);
    });

    it("AUTH_URL があれば本文に絶対 URL を載せる", async () => {
      process.env.AUTH_URL = "https://kokan.example.com/";
      const prisma = getPrisma();
      const a = await makeUser(prisma);
      const b = await makeUser(prisma);
      const nb = await makeNotebook(prisma, { owner: a, members: [b] });
      await makeEntry(prisma, {
        notebook: nb,
        author: a,
        createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
      });

      await GET(makeReq(`Bearer ${TEST_SECRET}`));
      const call = vi.mocked(sendMail).mock.calls[0][0];
      expect(call.text).toContain(
        `https://kokan.example.com/notebooks/${nb.id}`,
      );
    });

    it("threshold 未満の notebook はスキップ", async () => {
      const prisma = getPrisma();
      const a = await makeUser(prisma);
      const b = await makeUser(prisma);
      const nb = await makeNotebook(prisma, { owner: a, members: [b] });
      await makeEntry(prisma, {
        notebook: nb,
        author: a,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      });

      const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
      expect(res.status).toBe(200);
      expect(sendMail).not.toHaveBeenCalled();
    });

    it("entry が 1 件も無い notebook はスキップ", async () => {
      const prisma = getPrisma();
      const a = await makeUser(prisma);
      const b = await makeUser(prisma);
      await makeNotebook(prisma, { owner: a, members: [b] });

      const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
      expect(res.status).toBe(200);
      expect(sendMail).not.toHaveBeenCalled();
    });

    it("複数 notebook: 古いものだけ送られる", async () => {
      const prisma = getPrisma();
      const a = await makeUser(prisma);
      const b = await makeUser(prisma);
      const stale = await makeNotebook(prisma, {
        owner: a,
        members: [b],
        name: "stale",
      });
      const fresh = await makeNotebook(prisma, {
        owner: a,
        members: [b],
        name: "fresh",
      });
      await makeEntry(prisma, {
        notebook: stale,
        author: a,
        createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
      });
      await makeEntry(prisma, {
        notebook: fresh,
        author: a,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      });

      const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
      expect(res.status).toBe(200);
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(vi.mocked(sendMail).mock.calls[0][0].subject).toContain("stale");
    });

    it("NUDGE_THRESHOLD_HOURS は env で上書きできる (1h に縮める)", async () => {
      process.env.NUDGE_THRESHOLD_HOURS = "1";
      const prisma = getPrisma();
      const a = await makeUser(prisma);
      const b = await makeUser(prisma);
      const nb = await makeNotebook(prisma, { owner: a, members: [b] });
      // 2h 前 → 1h 閾値を超過。
      await makeEntry(prisma, {
        notebook: nb,
        author: a,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });

      await GET(makeReq(`Bearer ${TEST_SECRET}`));
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it("notebook 名に改行が混じっていても subject では空白に正規化される (NF-SEC defense in depth)", async () => {
      const prisma = getPrisma();
      const a = await makeUser(prisma);
      const b = await makeUser(prisma);
      // notebookNameSchema は改行を弾くので通常はここに来ないが、route 側にも
      // hardening を入れている。Prisma 直叩きで改行入りの name を埋めて検証。
      const nb = await makeNotebook(prisma, {
        owner: a,
        members: [b],
        name: "stale\r\nlines",
      });
      await makeEntry(prisma, {
        notebook: nb,
        author: a,
        createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
      });

      await GET(makeReq(`Bearer ${TEST_SECRET}`));
      const call = vi.mocked(sendMail).mock.calls[0][0];
      expect(call.subject).not.toMatch(/[\r\n]/);
      expect(call.subject).toContain("stale lines");
    });

    it("name 未設定のユーザでは差し込みが「ななしさん」にフォールバックする (F-AUTH-05)", async () => {
      const prisma = getPrisma();
      const a = await makeUser(prisma);
      const b = await makeUser(prisma, {
        email: "noname@test.local",
        name: null,
      });
      const nb = await makeNotebook(prisma, { owner: a, members: [b] });
      await makeEntry(prisma, {
        notebook: nb,
        author: a,
        createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
      });

      await GET(makeReq(`Bearer ${TEST_SECRET}`));
      const call = vi.mocked(sendMail).mock.calls[0][0];
      expect(call.to).toBe("noname@test.local");
      expect(call.text).toContain("ななしさん さんへ");
    });

    it("email を持たないユーザは silent skip (F-AUTH-05; X 等 email 非提供 OAuth 用)", async () => {
      const prisma = getPrisma();
      const a = await makeUser(prisma);
      const b = await makeUser(prisma, { email: null, name: "びーさん" });
      const nb = await makeNotebook(prisma, { owner: a, members: [b] });
      await makeEntry(prisma, {
        notebook: nb,
        author: a,
        createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
      });

      const res = await GET(makeReq(`Bearer ${TEST_SECRET}`));
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        sent: unknown[];
        skipped: { notebookId: string; reason: string }[];
      };
      expect(body.sent).toHaveLength(0);
      expect(body.skipped).toContainEqual({
        notebookId: nb.id,
        reason: "no-email",
      });
      expect(sendMail).not.toHaveBeenCalled();
    });
  });
});
