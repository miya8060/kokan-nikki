import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";

import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

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
        await sendMail({
          to,
          from: provider.from ?? "kokan-nikki <noreply@example.invalid>",
          subject: `Sign in to ${host}`,
          text: `${host} に サインイン するには、以下のリンクを ふんで ね ♡\n\n${url}\n\n10 ふんで きえるよ。`,
          html: `<p>${host} に サインイン するには、以下のリンクを ふんで ね ♡</p><p><a href="${url}">${url}</a></p><p>10 ふんで きえるよ。</p>`,
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
