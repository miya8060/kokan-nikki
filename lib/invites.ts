import { randomBytes } from "node:crypto";

// NF-SEC-05: 推測困難な招待コードを生成する。要件は nanoid(12) ≒ 71 bit だが、
// MVP 範囲では deps 追加を避けるため Node 標準の crypto から URL-safe な 12 字を
// 切り出す。base64url アルファベット (A–Z, a–z, 0–9, -, _) 64 文字なので、
// 12 字 = 72 bit のエントロピーが乗り、要件下限を満たす。
//
// 9 byte = 72 bit を base64url で表現するとちょうど 12 文字（パディング無し）に
// なるため、slice や trim を挟まずに固定長の出力が得られる。
export const INVITE_CODE_LENGTH = 12;
const INVITE_CODE_BYTES = 9;
export const INVITE_CODE_PATTERN = /^[A-Za-z0-9_-]{12}$/;

export function generateInviteCode(): string {
  return randomBytes(INVITE_CODE_BYTES).toString("base64url");
}

// F-INV-02: 発行から 7 日。actions / pages 双方から参照したいので一箇所に固定。
export const INVITE_TTL_DAYS = 7;
export const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000;

export function inviteExpiryFromNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_TTL_MS);
}
