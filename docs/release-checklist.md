# kokan-nikki リリース運用手順

| 項目     | 内容                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 対象     | MVP (v0.1) の本番初回デプロイ                                                          |
| 前提     | 実装・テストは完了 (`docs/remaining-features.md` の Recommended Next Up が空)          |
| 想定環境 | Vercel + Neon + Resend (`docs/requirements.md` §C-01,02 / `docs/testing.md` §10)       |
| 目的     | 「Vercel に push したら動く」状態を作るための **運用手順チェックリスト** を 1 本にする |
| 最終更新 | 2026-04-30                                                                             |

> このドキュメントは **コードの差分 PR ではなく、Vercel / Neon / Resend / DNS の操作** を 1 周通すためのもの。各ステップの担当は人間 (もしくは MCP/CLI で自動化) で、Claude が CI から自動的に踏むものではない。

---

## 0. 全体フロー

```
Neon プロビジョニング ──┐
Resend ドメイン検証 ────┼─→ Vercel 環境変数 ─→ 初回デプロイ + migrate deploy ─→ 本番スモーク ─→ Cron 確認
DNS / 本番ドメイン ─────┘
```

依存順:

1. **Neon と Resend を先に終わらせる** — どちらも DATABASE_URL / RESEND_API_KEY / EMAIL_FROM を Vercel 側で必要とするため。
2. **DNS は並行可** — Resend のドメイン検証 (SPF / DKIM) と Vercel への A/CNAME 追加は同じドメインに対する別レコードなので並行で良い。
3. **本番スモーク → Cron 確認の順** — Cron は最終投稿から 72h 経過した状態でしか発火しないので、スモーク中に作ったエントリが 72h 古くなるまで待つか、`NUDGE_THRESHOLD_HOURS=0` を一時的に注入して即時発火を確認する。

---

## 1. Neon DB プロビジョニング

- [ ] Neon コンソールで新規 Project を作成 (リージョンは `ap-southeast-1` 等の Vercel デプロイ先に近いリージョン)
- [ ] `main` branch の **Pooled connection string** を控える (`postgresql://...?sslmode=require`)
  - Vercel Serverless / Edge は短命接続なので **必ず Pooled** を使う。Direct connection を Vercel 側 `DATABASE_URL` に入れると connection storm で落ちる
- [ ] (推奨) preview branch を作る場合は `dev` branch を別途作成

> Prisma マイグレーションの初回適用は §6 で行う。ここでは接続文字列を控えるところまで。

---

## 2. Resend ドメイン検証

- [ ] Resend ダッシュボードで送信ドメインを追加 (例: `mail.example.com`)
- [ ] 表示される SPF / DKIM レコードを **§5 DNS** で登録
- [ ] Resend ダッシュボード上で status が **Verified** になるまで待つ
- [ ] 本番用 API キーを発行し、控える (`RESEND_API_KEY`)
  - ローカル/CI 用とは **別** のキーにする (権限分離 / 失効しやすくする)
- [ ] `EMAIL_FROM` の値を確定する (例: `kokan-nikki <noreply@mail.example.com>`)
  - 検証済ドメイン以外を `EMAIL_FROM` に入れるとマジックリンクとナッジ通知が両方届かない

---

## 3. DNS / 本番ドメイン

- [ ] 本番ドメイン (例: `kokan-nikki.example.com`) の A or CNAME を Vercel に向ける
  - Vercel ダッシュボードの Domains に追加すると必要なレコードが表示される
- [ ] §2 で出た Resend 用の SPF / DKIM (TXT レコード) を同じゾーンに追加
- [ ] (推奨) DMARC レコードを `v=DMARC1; p=none;` で 1 本追加 (Resend 推奨)
- [ ] `dig` / `host` で各レコードが伝播していることを確認

---

## 4. Vercel プロジェクト初期化

- [ ] GitHub リポジトリを Vercel に Import (Framework Preset: Next.js, 自動検出に任せる)
- [ ] **Build Command** が `pnpm build`、**Install Command** が `pnpm install` になっていることを確認
  - `package.json` の `postinstall: prisma generate` で Prisma Client が再生成される (`AGENTS.md` の注記参照)
- [ ] **Node.js Version** を 20.x に固定 (CI と合わせる)
- [ ] **Cron** は `vercel.json` で `/api/cron/nudge` を `0 0 * * *` (UTC 毎日 0:00) で宣言済。Vercel ダッシュボードの Crons タブに自動で出ることを確認

---

## 5. Vercel 環境変数の設定

すべて **Production** スコープに登録 (Preview / Development は別途要件に応じて)。

| 変数                    | 値                                                        | 必須     | 由来 / メモ                                                                                                     |
| ----------------------- | --------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `AUTH_SECRET`           | `openssl rand -base64 32` で本番用に新規生成              | **必須** | `lib/auth.ts:12` で fail-fast。dev/CI と必ず別値にする                                                          |
| `AUTH_URL`              | `https://<本番ドメイン>` (末尾スラッシュなし)             | **必須** | `app/api/cron/nudge/route.ts:50` でナッジメール本文のリンク基底に使用。未設定だとメール内リンクが相対パスになる |
| `AUTH_TRUST_HOST`       | `true`                                                    | **必須** | Vercel は proxy 越しなので Auth.js に `Host` ヘッダを信頼させる                                                 |
| `RESEND_API_KEY`        | §2 で発行した本番キー                                     | **必須** | `lib/mailer.ts:35`。空文字だと `tmp/dev-mailbox/` に書き出すモード (本番では絶対不可)                           |
| `EMAIL_FROM`            | §2 で確定した送信元 (例: `kokan-nikki <noreply@mail...>`) | **必須** | 未設定だと `noreply@example.invalid` フォールバックでナッジが届かない                                           |
| `CRON_SECRET`           | `openssl rand -base64 32` で本番用に新規生成              | **必須** | `app/api/cron/nudge/route.ts:25`。**未設定時は cron 全 401**。Vercel Cron は `Authorization: Bearer` を自動付与 |
| `DATABASE_URL`          | §1 で控えた Neon の **Pooled** connection string          | **必須** | 短命接続前提なので必ず pooled                                                                                   |
| `NUDGE_THRESHOLD_HOURS` | `72`                                                      | 任意     | デフォルト 72h。スモーク時に短縮したい場合のみ一時上書き                                                        |

検証コマンド (Vercel CLI が入っていれば):

```bash
vercel env ls production
```

---

## 6. 初回デプロイ + マイグレーション

- [ ] `main` を Vercel に push してデプロイをトリガー (or Vercel ダッシュボードから Redeploy)
- [ ] **Prisma マイグレーション** を本番 DB に適用
  - 推奨: ローカルから一時的に `DATABASE_URL` を本番 pooled 接続に切り替えて実行
    ```bash
    DATABASE_URL='postgresql://...neon.../?sslmode=require' \
      pnpm exec prisma migrate deploy
    ```
  - 別案: Vercel の Build Command を一時的に `pnpm exec prisma migrate deploy && pnpm build` にする (本運用に組み込むかは要判断)
- [ ] `prisma migrate status` で **No pending migrations** を確認
- [ ] Vercel デプロイログで `next build` が green、起動時に AUTH_SECRET エラーが出ていないこと

> マイグレーションを忘れると「Server Action がコケる → ユーザーには 500 が返る」状態でリリースされる。**デプロイ前に必ず deploy を流す**。

---

## 7. 本番スモーク (UC-01 を実機 1 周)

`docs/requirements.md` §5 UC-01 を本番ドメインで踏破する。シークレットウィンドウ等でセッションを 2 つ用意 (A / B)。

- [ ] **A: ランディング** — `https://<本番ドメイン>/` が未ログイン状態で表示される (装飾アニメ含む)
- [ ] **A: サインイン** — CTA → `/auth/signin` → メアド入力 → Resend 経由でマジックリンクが届く
- [ ] **A: マジックリンク** — リンククリック → `/notebooks` にリダイレクト
- [ ] **A: ノート作成** — 「テスト こうかんにっき」を作成 → 詳細画面に遷移
- [ ] **A: 招待 URL 発行** — 招待ページから URL を取得
- [ ] **B (別端末/シークレット): 招待 URL を開く** — 未ログイン → サインイン → 自動で招待受諾 → 同じノートに参加
- [ ] **A: 投稿** — 1 件目のエントリを投稿 → タイムラインに反映
- [ ] **B: 投稿** — ターンが B に回っていることを確認 → B で 2 件目を投稿
- [ ] **A: ターン回転** — A のターンに戻ることを確認
- [ ] **A: ナッジ** — B のターン待ちで A から「もう書いた？」を押す → 24h 内の再送が UI で disabled
- [ ] **A: 設定** — `/settings` でパレット切替 / カスタムカーソル on/off が cookie に永続化される
- [ ] **(任意) F-INV-07** — 6 人埋まった状態でさらに招待を踏ませて適切なエラー画面が出ること

---

## 8. Cron 動作確認

- [ ] Vercel ダッシュボード > Crons タブに `/api/cron/nudge` が登録されている
- [ ] 一度手動実行 (`Run Now`) して Logs で **200** が返ることを確認
  - 401 が出る場合は `CRON_SECRET` 未設定 or 値ズレ
- [ ] (即時検証) `NUDGE_THRESHOLD_HOURS=0` を一時的に Production env に注入 → スモークで作ったノートを使って手動 Run Now → 該当メンバーにナッジメールが届くこと
  - 検証後は `NUDGE_THRESHOLD_HOURS=72` に戻す
- [ ] (任意) 翌日の 0:00 UTC (= 09:00 JST) に Cron が自動発火していること

---

## 9. 任意項目 (リリース後でも可)

- [ ] **Lighthouse 手動 1 周** — `/` で Performance / Accessibility / Best Practices / SEO を計測 (NF-PERF-01 はゲートなしで計測のみ運用 — `docs/requirements.md` §10)
- [ ] **Vercel Analytics** dashboard を 1 度目視 (NF-PERF-02)
- [ ] **axe-core** 手動チェック — Playwright MCP で `/`, `/notebooks`, `/notebooks/[id]/write`, `/settings` を 1 周
- [ ] **利用規約 / プライバシーポリシー** — 必要に応じて追加 (法務スコープ)

---

## 10. ロールバック方針

- **Vercel デプロイのロールバック**: Vercel ダッシュボードの Deployments から前バージョンに **Promote to Production** で即座に戻せる
- **DB マイグレーションのロールバック**:
  - Prisma は forward-only。`migrate deploy` を巻き戻す公式手段は無い
  - スキーマ破壊変更を出す場合は **N+1 デプロイ** (古いコードと新スキーマが共存できる前方互換マイグレーション → コードリリース → 古いカラム/制約の cleanup マイグレーション) を徹底
  - MVP の現スキーマは追加オンリーなので、戻すなら新マイグレーションで元に戻す形にする
- **環境変数のロールバック**: Vercel は env 変数の履歴を保存しない。**変更前の値を必ず控えてから**書き換える
- **Resend のキー失効**: 漏洩時はダッシュボードから即 Revoke → 新キーを発行 → Vercel env を更新 → Redeploy

---

## 11. 関連ドキュメント

- 要件定義: [`docs/requirements.md`](requirements.md)
- テスト戦略: [`docs/testing.md`](testing.md)
- 実装/テスト棚卸し: [`docs/remaining-features.md`](remaining-features.md)
- MVP 運用解釈 (要件と実装の温度差): [`docs/requirements.md` §10](requirements.md#10-mvp-運用解釈要件文と実装の温度差)
