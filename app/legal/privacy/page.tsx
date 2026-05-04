import type { Metadata } from "next";
import Link from "next/link";

import { Sticker } from "@/components/ui/Sticker";

export const metadata: Metadata = {
  title: "プライバシーポリシー ─ kokan-nikki",
  description: "kokan-nikki (こうかん にっき) のプライバシーポリシー。",
};

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 justify-center px-6 py-16">
      <Sticker className="w-full max-w-3xl p-10">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl">
          ♡ プライバシーポリシー
        </h1>
        <p className="text-ink-soft mt-2 text-xs tracking-wider uppercase">
          effective: 2026-05-04 (β)
        </p>

        <div className="text-ink mt-8 space-y-8 text-sm leading-7">
          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              1. はじめに
            </h2>
            <p className="mt-3">
              kokan-nikki (以下「本サービス」) は、
              利用者の個人情報を以下の方針に従って取り扱います。
              本サービスを利用することにより、本ポリシーの内容に同意したものとみなされます。
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              2. 取得する情報
            </h2>
            <p className="mt-3">本サービスは以下の情報を取得します。</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong>メールアドレス</strong>: マジックリンクによるサインイン、
                および (将来的に) ナッジ通知の送信に利用します。
              </li>
              <li>
                <strong>OAuth プロファイル</strong>: Google / LINE / X
                でサインインする場合、各プロバイダから提供される
                ID・表示名・プロフィール画像 URL・(プロバイダによっては) メールアドレスを取得します。
                X (OAuth 2.0) はメールアドレスを返しません。
              </li>
              <li>
                <strong>日記コンテンツ</strong>: 利用者がノートに投稿した文章、
                および設定したアバター画像。
              </li>
              <li>
                <strong>アクセスログ</strong>: ホスティング基盤
                (Vercel) が記録する IP アドレス・User-Agent
                等の標準的なリクエストログ。障害調査・不正アクセス対策に利用します。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              3. 利用目的
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>本サービスの提供 (アカウント認証、日記の保存・表示、ペア招待)</li>
              <li>サービス改善のための統計分析 (個人を識別しない形)</li>
              <li>不正利用・規約違反への対応</li>
              <li>重要なお知らせ・ナッジ通知の送信</li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              4. 第三者への提供
            </h2>
            <p className="mt-3">
              法令に基づく場合、または利用者の同意がある場合を除き、
              個人情報を第三者に提供しません。
              本サービスは利用者情報を販売しません。
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              5. 委託先
            </h2>
            <p className="mt-3">
              本サービスの運営にあたり、以下の事業者にデータ処理を委託しています。
              いずれも各社のプライバシーポリシーに従い、適切に取り扱われます。
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong>Vercel Inc.</strong> ─ アプリケーションホスティング、
                Blob ストレージ (アバター画像)、アクセスログ
              </li>
              <li>
                <strong>Neon Inc.</strong> ─ Postgres データベース
                (アカウント・日記コンテンツの保存)
              </li>
              <li>
                <strong>Resend Inc.</strong> ─ メール送信
                (マジックリンク・ナッジ通知)
              </li>
              <li>
                <strong>Google LLC / LINE Corporation / X Corp.</strong> ─
                利用者が選択した OAuth プロバイダによる認証
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              6. 保存期間
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                アカウントが有効である間、関連する情報を保存します。
              </li>
              <li>
                アカウント削除後は、バックアップ・障害調査に必要な合理的期間内に消去します。
              </li>
              <li>
                マジックリンク用の認証トークンは発行から 10 分後に自動失効します。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              7. 利用者の権利
            </h2>
            <p className="mt-3">
              利用者は、自身の個人情報について、開示・訂正・削除を請求できます。
              請求は下記お問い合わせ窓口までご連絡ください。
              本人確認のうえ、合理的な期間内に対応します。
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              8. セキュリティ
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>通信は TLS により暗号化されます。</li>
              <li>
                認証情報 (セッショントークン等) は HttpOnly Cookie で送受信され、
                JavaScript からはアクセスできません。
              </li>
              <li>
                ただし、インターネット上の通信には完全な安全性は保証できないため、
                個人を特定できる機微な情報の投稿はお控えください。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              9. ポリシーの変更
            </h2>
            <p className="mt-3">
              本ポリシーは、提供サービスの内容変更、法令改正等に応じて改定することがあります。
              改定後の内容は本ページに掲示した時点から効力を生じます。
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              10. お問い合わせ
            </h2>
            <p className="mt-3">
              個人情報の取り扱いに関するお問い合わせは{" "}
              <a
                href="https://github.com/miya8060/kokan-nikki/issues"
                target="_blank"
                rel="noreferrer noopener"
                className="text-pink-2 underline underline-offset-4"
              >
                GitHub Issues
              </a>{" "}
              までご連絡ください。
            </p>
            <p className="mt-3">
              利用規約は{" "}
              <Link
                href="/legal/terms"
                className="text-pink-2 underline underline-offset-4"
              >
                こちら
              </Link>
              。
            </p>
          </section>
        </div>
      </Sticker>
    </main>
  );
}
