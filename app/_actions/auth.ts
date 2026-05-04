"use server";

import { signIn, signOut } from "@/lib/auth";
import { pickInternalCallbackUrl } from "@/lib/safe-redirect";

/**
 * Server action target for the magic-link form.
 *
 * Auth.js's signIn() throws NEXT_REDIRECT when it succeeds; passing the raw
 * FormData lets the Resend provider pull the email field out itself, and the
 * redirect propagates through the form action contract automatically.
 */
export async function requestSignIn(formData: FormData) {
  await signIn("resend", formData);
}

const OAUTH_PROVIDERS = ["google", "line"] as const;
type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

function isOAuthProvider(value: unknown): value is OAuthProvider {
  return (
    typeof value === "string" &&
    (OAUTH_PROVIDERS as readonly string[]).includes(value)
  );
}

/**
 * OAuth サインイン用の Server Action。signin page 上の <form> から provider
 * 名と redirectTo を hidden input で渡し、ここで Auth.js の signIn() を呼ぶ。
 * provider 名は固定リストで弾いて任意の string が外部 IdP に渡らないように
 * する (open redirect / SSRF 予防)。
 */
export async function signInWithOAuth(formData: FormData) {
  const provider = formData.get("provider");
  if (!isOAuthProvider(provider)) {
    throw new Error(`Unsupported OAuth provider: ${String(provider)}`);
  }
  const rawRedirectTo = formData.get("redirectTo");
  const redirectTo = pickInternalCallbackUrl(
    typeof rawRedirectTo === "string" ? rawRedirectTo : undefined,
    "/notebooks",
  );
  await signIn(provider, { redirectTo });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
