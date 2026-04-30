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
