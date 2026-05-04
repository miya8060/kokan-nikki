import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { z } from "zod";

// F-AUTH-06 / issue #68 Stage 2
// OAuth account linking flow の状態を運ぶ HMAC-signed cookie。
// 「signed-in な User#A が X 連携を開始した」ことを OAuth callback まで持ち越し、
// callback で signIn callback (lib/auth.ts) と /settings/link/* の各 server
// component / action がこの cookie を見て linking の宛先を判断する。
//
// 攻撃面:
// - HttpOnly + Signed なので XSS / 偽造はできない
// - SameSite=Lax: OAuth provider の callback は Lax で送られてくるので Strict
//   不可。本物の link 開始でしか cookie が立たない上、署名で userId を tamper
//   できない設計
// - 短 TTL (10 min): OAuth flow の長さに合わせる。無人 tab で放置しても切れる

const COOKIE_NAME = "kn-link-intent";
const TTL_SECONDS = 10 * 60;
const VERSION = 1 as const;

const startedPayloadSchema = z.object({
  v: z.literal(VERSION),
  state: z.literal("started"),
  toUserId: z.string().min(1),
  csrf: z.string().min(16),
  provider: z.literal("twitter"),
  exp: z.number().int().positive(),
});

const pendingPayloadSchema = z.object({
  v: z.literal(VERSION),
  state: z.literal("pending-confirm"),
  toUserId: z.string().min(1),
  fromUserId: z.string().min(1),
  csrf: z.string().min(16),
  provider: z.literal("twitter"),
  exp: z.number().int().positive(),
});

const payloadSchema = z.discriminatedUnion("state", [
  startedPayloadSchema,
  pendingPayloadSchema,
]);

export type LinkIntentStarted = z.infer<typeof startedPayloadSchema>;
export type LinkIntentPending = z.infer<typeof pendingPayloadSchema>;
export type LinkIntentPayload = z.infer<typeof payloadSchema>;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required to sign link-intent cookies");
  }
  return secret;
}

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function hmac(secret: string, data: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

export function generateCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}

export function encodeLinkIntent(
  payload: LinkIntentPayload,
  secret = getSecret(),
): string {
  const body = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = base64url(hmac(secret, body));
  return `${body}.${sig}`;
}

export function decodeLinkIntent(
  raw: string,
  secret = getSecret(),
  now: number = Math.floor(Date.now() / 1000),
): LinkIntentPayload | null {
  const dot = raw.indexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  const expected = hmac(secret, body);
  let got: Buffer;
  try {
    got = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (got.length !== expected.length) return null;
  if (!timingSafeEqual(got, expected)) return null;

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) return null;
  if (parsed.data.exp <= now) return null;
  return parsed.data;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_SECONDS,
  };
}

export async function setLinkIntentStarted(args: {
  toUserId: string;
  csrf: string;
}): Promise<void> {
  const payload: LinkIntentStarted = {
    v: VERSION,
    state: "started",
    toUserId: args.toUserId,
    csrf: args.csrf,
    provider: "twitter",
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const value = encodeLinkIntent(payload);
  const c = await cookies();
  c.set(COOKIE_NAME, value, cookieOptions());
}

export async function setLinkIntentPending(args: {
  toUserId: string;
  fromUserId: string;
  csrf: string;
}): Promise<void> {
  const payload: LinkIntentPending = {
    v: VERSION,
    state: "pending-confirm",
    toUserId: args.toUserId,
    fromUserId: args.fromUserId,
    csrf: args.csrf,
    provider: "twitter",
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const value = encodeLinkIntent(payload);
  const c = await cookies();
  c.set(COOKIE_NAME, value, cookieOptions());
}

export async function readLinkIntent(): Promise<LinkIntentPayload | null> {
  const c = await cookies();
  const raw = c.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return decodeLinkIntent(raw);
}

export async function clearLinkIntent(): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_NAME, "", { ...cookieOptions(), maxAge: 0 });
}

export const __test = {
  COOKIE_NAME,
  TTL_SECONDS,
  VERSION,
};
