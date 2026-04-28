"use server";

import { signIn, signOut } from "@/lib/auth";

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

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
