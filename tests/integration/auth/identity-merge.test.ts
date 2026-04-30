// _setup pins AUTH_SECRET before NextAuth(config) reads it; see sign-in.test.ts
// for the same hoist note.
import "./_setup";

import { vi, beforeEach, describe, expect, it } from "vitest";

vi.mock("@/lib/mailer", () => ({
  sendMail: vi.fn(async () => {}),
}));

import { handlers } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { getPrisma } from "@/tests/setup/db.per-test";
import {
  buildCallbackRequest,
  buildSignInRequest,
  decodeBase64UrlForTest,
  findSessionCookie,
  mintCsrfPair,
} from "./_helpers";

beforeEach(() => {
  vi.mocked(sendMail).mockClear();
});

// Drives one full magic-link roundtrip (POST /signin → GET /callback) and
// returns the userId that ended up signed in. Going through both halves —
// instead of seeding a VerificationToken directly like callback.test.ts — is
// what makes this test cover F-AUTH-04 end-to-end: the merge happens inside
// PrismaAdapter.createUser/getUserByEmail during callback, and we want to be
// sure the second signin's POST→GET pair doesn't fork a new User row.
async function magicLinkRoundtrip(rawEmail: string): Promise<string> {
  const beforeCallCount = vi.mocked(sendMail).mock.calls.length;

  const { token, cookieValue } = mintCsrfPair();
  const signInRes = await handlers.POST(
    buildSignInRequest({
      email: rawEmail,
      csrfToken: token,
      csrfCookieValue: cookieValue,
    }),
  );
  expect(signInRes.status).toBe(302);
  expect(signInRes.headers.get("location")).toContain("verify-request");

  // Pull the magic link out of the most recent sendMail call rather than
  // mockClear()-ing between roundtrips — clearing mid-test would hide a
  // duplicate-send bug that only shows up on the second pass.
  const calls = vi.mocked(sendMail).mock.calls;
  expect(calls.length).toBe(beforeCallCount + 1);
  const sent = calls[calls.length - 1][0];
  // 本文に埋め込まれるのは /auth/confirm?to=<base64>(callback URL) で、
  // 本物の callback URL は base64 経由で隠蔽される (NF-SEC: Gmail 等の
  // scanner 対策、lib/safe-redirect.wrapCallbackUrl)。ここでは wrap を解いて
  // raw token / email を取り出す。
  const wrappedMatch = sent.text.match(
    /https?:\/\/[^\s]+\/auth\/confirm\?to=[A-Za-z0-9_-]+/,
  );
  expect(wrappedMatch).not.toBeNull();
  const innerEncoded = new URL(wrappedMatch![0]).searchParams.get("to");
  expect(innerEncoded).not.toBeNull();
  const url = new URL(decodeBase64UrlForTest(innerEncoded!));
  const rawToken = url.searchParams.get("token");
  const sentEmail = url.searchParams.get("email");
  expect(rawToken).not.toBeNull();
  expect(sentEmail).not.toBeNull();

  const cbRes = await handlers.GET(
    buildCallbackRequest({ email: sentEmail!, rawToken: rawToken! }),
  );
  expect(cbRes.status).toBe(302);
  expect(findSessionCookie(cbRes)).toBeDefined();

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email: sentEmail! } });
  expect(user).not.toBeNull();
  return user!.id;
}

describe("F-AUTH-04 — 同じ email のアカウントは 1 つに集約される", () => {
  it("同じ email で magic-link signin を 2 回流しても User は分裂しない", async () => {
    const prisma = getPrisma();
    const email = "merge-target@test.local";

    const firstUserId = await magicLinkRoundtrip(email);
    expect(await prisma.user.count({ where: { email } })).toBe(1);

    const secondUserId = await magicLinkRoundtrip(email);

    // F-AUTH-04 の本旨: User は 1 行のまま。schema.prisma の `email @unique`
    // と Auth.js PrismaAdapter の getUserByEmail/createUser がここで効く。
    // email normalize の改修 (sign-in.test.ts の "carol" ケース参照) で unique
    // 制約が外れたり、createUser が upsert を経由しなくなったらこの assert が
    // 落ちる。
    expect(await prisma.user.count({ where: { email } })).toBe(1);
    expect(secondUserId).toBe(firstUserId);

    // Session は別端末ログインに相当するので 2 件に増える。「User が 1 つに
    // 集約される ≠ 過去のセッションが消える」 を区別したいので明示しておく。
    const sessions = await prisma.session.findMany({
      where: { userId: firstUserId },
    });
    expect(sessions).toHaveLength(2);
  });
});
