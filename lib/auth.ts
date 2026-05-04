import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Line from "next-auth/providers/line";
import Resend from "next-auth/providers/resend";
import Twitter from "next-auth/providers/twitter";

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

// OAuth provider は env が両方揃っているときだけ enable する。
// preview / dev で key 未設定でもアプリが起動できるようにするため。
// signin UI 側でも同じ判定を使い、未設定の provider はボタンを出さない。
export const oauthProviders = {
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  line: Boolean(process.env.AUTH_LINE_ID && process.env.AUTH_LINE_SECRET),
  twitter: Boolean(
    process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET,
  ),
} as const;

const providers: NextAuthConfig["providers"] = [
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
];

if (oauthProviders.google) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Google は profile に email_verified を返すので、既存の magic-link
      // ユーザー (= email 所有確認済) と自動 link しても安全。
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (oauthProviders.line) {
  providers.push(
    Line({
      clientId: process.env.AUTH_LINE_ID,
      clientSecret: process.env.AUTH_LINE_SECRET,
      // LINE はメアド登録時にメール認証を経由しているので、返ってくる email
      // は LINE 側で本人確認済みと見なせる。Google と同じ扱いで既存の
      // magic-link / Google ユーザーと自動 link する。
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (oauthProviders.twitter) {
  providers.push(
    Twitter({
      clientId: process.env.AUTH_TWITTER_ID,
      clientSecret: process.env.AUTH_TWITTER_SECRET,
      // X OAuth 2.0 は email を返さないので account-linking の判断材料が
      // ない。allowDangerousEmailAccountLinking はそもそも email がない以上
      // 効かない (linking キーは provider+providerAccountId)。同じ人が X /
      // Google / magic-link で 3 回サインインすると 3 user に分裂する点は
      // 仕様。後でアプリ内 merge 機能を作るかは別議論 (#61 後続)。
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  // The Email provider family requires an adapter and forces JWT off; database
  // sessions are persisted in the Session table per F-AUTH-03.
  providers,
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
  },
});
