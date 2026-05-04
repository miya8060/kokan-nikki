import { cookies } from "next/headers";

import {
  generateCsrfToken,
  readLinkIntent,
  setLinkIntentPending,
} from "@/lib/auth/link-intent";
import { prisma } from "@/lib/prisma";

// F-AUTH-06 / issue #68 Stage 2
// Auth.js v5 の signIn callback で X (twitter) linking flow を捌くロジック。
// signIn callback 直書きだと NextAuth() コンストラクタの中なので integration
// から呼びにくく、coverage が測れないので別モジュールに切り出している。
// lib/auth.ts は薄く `await handleTwitterLinkSignIn(account)` だけ呼ぶ。

type AccountInput = {
  provider: string;
  providerAccountId: string;
  type?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: unknown;
};

// 現セッション cookie から DB を参照して userId を返す。signIn callback 内で
// `auth()` を self-reference すると TDZ になるので、Auth.js の database session
// cookie を直接 lookup する。AUTH_URL=http のとき __Secure- prefix は付かない
// (memory: project_authjs_cookie_prefix)。
async function readSessionUserId(): Promise<string | null> {
  const isHttps =
    process.env.NODE_ENV === "production" ||
    (process.env.AUTH_URL?.startsWith("https://") ?? false);
  const cookieName = isHttps
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  const c = await cookies();
  const token = c.get(cookieName)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    select: { userId: true, expires: true },
  });
  if (!session) return null;
  if (session.expires <= new Date()) return null;
  return session.userId;
}

/**
 * X (twitter) provider の signIn callback 本体。返り値はそのまま Auth.js の
 * signIn callback 戻り値として使える: `true` で通常 signin、文字列で redirect
 * (= session 切替を止めて指定 URL へ)。
 *
 * 分岐:
 *  - linking 中でない → true (通常 signin)
 *  - cross-tab で session が swap → "/settings?link=error"
 *  - X account 未登録 (Case 1) → 現 user に Account を後付けして
 *    "/settings/link/result?status=linked"
 *  - X account が同 user に link 済 → "/settings/link/result?status=already"
 *  - X account が別 user に link 済 (Case 2) → pending-confirm cookie を立てて
 *    "/settings/link/confirm"
 */
export async function handleTwitterLinkSignIn(
  account: AccountInput,
): Promise<true | string> {
  const intent = await readLinkIntent();
  if (!intent || intent.state !== "started") return true;

  const sessionUserId = await readSessionUserId();
  if (!sessionUserId || sessionUserId !== intent.toUserId) {
    return "/settings?link=error";
  }

  const targetUserId = intent.toUserId;
  const existing = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    select: { userId: true },
  });

  if (!existing) {
    try {
      await prisma.account.create({
        data: {
          userId: targetUserId,
          type: account.type ?? "oauth",
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          access_token:
            typeof account.access_token === "string"
              ? account.access_token
              : null,
          refresh_token:
            typeof account.refresh_token === "string"
              ? account.refresh_token
              : null,
          expires_at:
            typeof account.expires_at === "number" ? account.expires_at : null,
          token_type:
            typeof account.token_type === "string" ? account.token_type : null,
          scope: typeof account.scope === "string" ? account.scope : null,
          id_token:
            typeof account.id_token === "string" ? account.id_token : null,
          session_state:
            typeof account.session_state === "string"
              ? account.session_state
              : null,
        },
      });
    } catch {
      return "/settings?link=error";
    }
    return "/settings/link/result?status=linked";
  }

  if (existing.userId === targetUserId) {
    return "/settings/link/result?status=already";
  }

  await setLinkIntentPending({
    toUserId: targetUserId,
    fromUserId: existing.userId,
    csrf: generateCsrfToken(),
  });
  return "/settings/link/confirm";
}
