import type { Metadata } from "next";
import Link from "next/link";

import { Sticker } from "@/components/ui/Sticker";

export const metadata: Metadata = {
  title: "利用規約 ─ kokan-nikki",
  description: "kokan-nikki (こうかん にっき) の利用規約。",
};

export default function TermsPage() {
  return (
    <main className="flex flex-1 justify-center px-6 py-16">
      <Sticker className="w-full max-w-3xl p-10">
        <h1 className="text-ink font-[family-name:var(--font-mochi)] text-3xl">
          ♡ 利用規約
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
              本規約は、kokan-nikki (以下「本サービス」) の利用条件を定めるものです。
              本サービスは交換日記体験を提供する個人運営のオンラインサービスで、
              現在 β 版として提供しています。利用者は本規約に同意したうえで本サービスを利用してください。
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              2. アカウント
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                登録には メールアドレス または対応する OAuth プロバイダ
                (Google / LINE / X) のいずれかが必要です。
              </li>
              <li>
                アカウントの管理責任は利用者にあります。
                第三者と共有しないでください。
              </li>
              <li>
                13 歳未満の方は保護者の同意のもとで利用してください。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              3. 禁止事項
            </h2>
            <p className="mt-3">以下の行為を禁止します。</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>法令または公序良俗に反する行為</li>
              <li>他者の個人情報を、本人の同意なく日記に記載する行為</li>
              <li>誹謗中傷、嫌がらせ、ハラスメント</li>
              <li>性的・暴力的な内容の投稿、未成年に有害な内容の投稿</li>
              <li>本サービスの運営を妨害する行為、不正アクセス、自動化された大量アクセス</li>
              <li>本サービスを利用した営利目的の勧誘・スパム送信</li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              4. 投稿コンテンツ
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                利用者が日記に投稿した文章・画像等の著作権は、原則として利用者に帰属します。
              </li>
              <li>
                運営は、本サービスの提供・バックアップ・障害調査に必要な範囲で
                投稿内容を保存・処理します。
              </li>
              <li>
                禁止事項に該当する投稿、または運営が不適切と判断した投稿は、
                予告なく削除またはアカウントを停止することがあります。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              5. サービスの提供
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                本サービスは β 版のため、機能の追加・変更・停止が予告なく行われることがあります。
              </li>
              <li>
                メンテナンス・障害・第三者サービスの停止により、
                一時的に利用できなくなる場合があります。
              </li>
              <li>
                運営は、本サービスの中止または終了に際して、合理的な範囲で事前告知に努めます。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              6. 免責
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                運営は、本サービスの内容について、特定の目的への適合性、
                完全性、正確性、継続性を保証しません。
              </li>
              <li>
                本サービスの利用または利用不能から生じた損害について、
                運営の故意または重過失による場合を除き、責任を負いません。
              </li>
              <li>
                利用者間のトラブルは、当事者間で解決してください。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              7. 個人情報の取り扱い
            </h2>
            <p className="mt-3">
              個人情報の取り扱いについては
              <Link
                href="/legal/privacy"
                className="text-pink-2 mx-1 underline underline-offset-4"
              >
                プライバシーポリシー
              </Link>
              に定めます。
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              8. 規約の変更
            </h2>
            <p className="mt-3">
              本規約は、本サービスの提供内容変更、法令改正等に応じて改定することがあります。
              改定後の規約は本ページに掲示した時点から効力を生じます。
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              9. 準拠法・管轄
            </h2>
            <p className="mt-3">
              本規約は日本法に準拠し、本サービスに関する一切の紛争については、
              運営者の住所地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-mochi)] text-xl">
              10. お問い合わせ
            </h2>
            <p className="mt-3">
              本サービスに関するお問い合わせは{" "}
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
          </section>
        </div>
      </Sticker>
    </main>
  );
}
