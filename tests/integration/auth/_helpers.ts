import { createHash, randomBytes } from "node:crypto";

import { NextRequest } from "next/server";

import { TEST_AUTH_SECRET, TEST_ORIGIN } from "./_setup";

// Auth.js v5 hashes verification tokens with sha256(rawToken + secret) before
// inserting them via the Prisma adapter. The CSRF cookie format is
// `${token}|${sha256(token + secret)}`. Both algorithms live in
// @auth/core/lib/utils/web.ts and @auth/core/lib/actions/callback/oauth/csrf-token.ts.
export function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function hashAuthToken(rawToken: string): string {
  return sha256Hex(rawToken + TEST_AUTH_SECRET);
}

// Auth.js generates 32-byte hex tokens via crypto.getRandomValues. We use the
// node crypto equivalent so unit-style fixtures look identical to real ones.
export function freshRawToken(): string {
  return randomBytes(32).toString("hex");
}

// Mints a CSRF token-cookie pair that satisfies the validateCSRF check in
// @auth/core: the cookie holds `${token}|${sha256(token+secret)}` and the
// POST body must echo `csrfToken=${token}`. Pre-seeding it sidesteps a
// round-trip through GET /api/auth/csrf in every test.
export function mintCsrfPair(): { token: string; cookieValue: string } {
  const token = freshRawToken();
  return { token, cookieValue: `${token}|${sha256Hex(token + TEST_AUTH_SECRET)}` };
}

// handlers.GET/POST are typed for NextRequest (Auth.js' next-auth wrapper).
// At runtime a plain Request would work because we keep AUTH_URL unset and
// reqWithEnvURL is a no-op, but using NextRequest keeps the signature honest
// and exercises the same cookie/url parsing path Next.js takes in prod.
export function buildSignInRequest(args: {
  email: string;
  csrfToken: string;
  csrfCookieValue: string;
  callbackUrl?: string;
}): NextRequest {
  const body = new URLSearchParams({
    csrfToken: args.csrfToken,
    email: args.email,
    callbackUrl: args.callbackUrl ?? "/",
  });
  return new NextRequest(`${TEST_ORIGIN}/api/auth/signin/resend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `authjs.csrf-token=${args.csrfCookieValue}`,
    },
    body: body.toString(),
  });
}

export function buildCallbackRequest(args: {
  email: string;
  rawToken: string;
  callbackUrl?: string;
}): NextRequest {
  const url = new URL(`${TEST_ORIGIN}/api/auth/callback/resend`);
  url.searchParams.set("token", args.rawToken);
  url.searchParams.set("email", args.email);
  url.searchParams.set("callbackUrl", args.callbackUrl ?? "/");
  return new NextRequest(url.toString());
}

// Headers.getSetCookie exists in Node 20+, but we accept the legacy
// single-value path too so the helper survives a Node downgrade.
export function getAllSetCookies(res: Response): string[] {
  const fn = (res.headers as unknown as { getSetCookie?: () => string[] })
    .getSetCookie;
  if (typeof fn === "function") return fn.call(res.headers);
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

export function findSessionCookie(res: Response): string | undefined {
  return getAllSetCookies(res).find((c) =>
    c.startsWith("authjs.session-token="),
  );
}
