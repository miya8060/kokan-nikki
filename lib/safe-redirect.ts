// NF-SEC: open redirect 防御。signin の callbackUrl のように「ユーザー入力
// から page.tsx 内で redirect 先を組み立てる」経路で、外部ドメインへ飛ばせる
// 入力 (protocol-relative URL や backslash bypass) を弾くための純関数。
//
// startsWith("/") だけだと //evil.example/foo が素通る。Auth.js v5 の signIn
// 側でも redirectTo の origin 検証は走るが、page.tsx → redirect()/Link href
// に直接流す経路は自前でも安全側に倒しておく (defense in depth)。

export function isInternalCallbackUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length === 0) return false;
  if (!value.startsWith("/")) return false;
  // protocol-relative URL: //evil.example/foo
  if (value.startsWith("//")) return false;
  // 一部ブラウザは /\evil.example を //evil.example として解決する
  if (value.startsWith("/\\")) return false;
  return true;
}

export function pickInternalCallbackUrl(
  raw: string | string[] | undefined,
  fallback: string,
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isInternalCallbackUrl(value) ? value : fallback;
}

// NF-SEC: Gmail などのメールクライアントは受信メール内の URL を「安全性
// チェック」目的でユーザー閲覧前にプリフェッチする。Auth.js の magic link は
// one-shot 仕様なのでプリフェッチで token が消費され、本人クリック時には
// Verification エラーになる。本物の callback URL を /auth/confirm でラップ
// して、ユーザーが confirmation page でボタンをクリックして初めて token が
// 消費されるようにする (two-click pattern)。
//
// wrap 側 (lib/auth.ts の sendVerificationRequest) と unwrap 側
// (app/auth/confirm/page.tsx) を 1 ヶ所にまとめておく。

export function wrapCallbackUrl(originalUrl: string): string {
  const wrapped = new URL("/auth/confirm", originalUrl);
  wrapped.searchParams.set("to", encodeBase64Url(originalUrl));
  return wrapped.toString();
}

export function unwrapCallbackUrl(
  raw: string | string[] | null | undefined,
  expectedHost: string,
): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value.length === 0) return null;

  let decoded: URL;
  try {
    decoded = new URL(decodeBase64Url(value));
  } catch {
    return null;
  }

  if (decoded.host !== expectedHost) return null;
  if (!decoded.pathname.startsWith("/api/auth/callback/")) return null;

  return decoded.toString();
}

function encodeBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(input: string): string {
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
