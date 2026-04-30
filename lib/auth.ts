import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";

import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { wrapCallbackUrl } from "@/lib/safe-redirect";

// NF-SEC-01: Auth.js v5 (5.0.0-beta.31) は AUTH_SECRET 不在でも
// NextAuth(config) は throw せず、最初のリクエスト時に MissingSecret を返す
// だけ。Vercel 側で env が外れている等の事故を「最初の magic-link 要求まで
// 気付けない」状態にしないため、モジュール読込時に fail-fast で落とす。
if (!process.env.AUTH_SECRET) {
  throw new Error(
    "AUTH_SECRET is required to initialize @/lib/auth. " +
      "Set AUTH_SECRET in the environment (.env.local for dev, Vercel project " +
      "settings for prod) before importing this module.",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  // The Email provider family requires an adapter and forces JWT off; database
  // sessions are persisted in the Session table per F-AUTH-03.
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
      // Override so dev (RESEND_API_KEY="") falls back to tmp/dev-mailbox via
      // lib/mailer.ts. In prod this still goes through Resend.
      async sendVerificationRequest({ identifier: to, url, provider }) {
        const { host } = new URL(url);
        // NF-SEC: 本物の callback URL を /auth/confirm でラップして scanner
        // (Gmail link preview 等) のプリフェッチで token が消費されるのを
        // 防ぐ。ユーザーが confirmation page でボタンを 1 回クリックして
        // 初めて本物の callback URL に遷移し、token が消費される。
        const link = wrapCallbackUrl(url);
        await sendMail({
          to,
          from: provider.from ?? "kokan-nikki <noreply@example.invalid>",
          subject: `Sign in to ${host}`,
          text: `${host} に サインイン するには、以下のリンクを ふんで ね ♡\n\n${link}\n\n10 ふんで きえるよ。`,
          html: `<p>${host} に サインイン するには、以下のリンクを ふんで ね ♡</p><p><a href="${link}">${link}</a></p><p>10 ふんで きえるよ。</p>`,
          kind: "verification",
        });
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
  },
});
