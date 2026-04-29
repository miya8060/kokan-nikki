# kokan-nikki

Y2K カワイイ系の世界観で作るオンライン交換日記。ペアまたは小グループ (最大 6 人) で 1 冊のノートを順番に回す体験を再現する。

| 項目     | 内容                                                |
| -------- | --------------------------------------------------- |
| バージョン | 0.1（MVP 開発中）                                   |
| 要件     | [`docs/requirements.md`](docs/requirements.md)      |
| テスト戦略 | [`docs/testing.md`](docs/testing.md)                |
| エージェント向け | [`AGENTS.md`](AGENTS.md) (= `CLAUDE.md` で取り込み) |

---

## 技術スタック

| レイヤ        | 採用                                                                |
| ------------- | ------------------------------------------------------------------- |
| フレームワーク | Next.js 16 (App Router) / React 19                                  |
| 認証          | Auth.js v5 (Resend Email Provider) + DB セッション                  |
| DB / ORM      | Postgres 16 / Prisma 6                                              |
| バリデーション | zod 4                                                               |
| スタイル      | Tailwind CSS v4 + デザインハンドオフ "Dreamy Pixel"                |
| メール        | Resend                                                              |
| テスト        | Vitest 4 + `@testcontainers/postgresql` (結合) / Playwright (E2E 予定) |
| デプロイ      | Vercel + Neon (本番) / Docker Compose (ローカル)                    |

> Next.js 16 / React 19 は API・規約・ファイル構成が訓練データの想定から外れている可能性が高い。実装に着手する前に `node_modules/next/dist/docs/` の該当章を **必ず** 一次ソースとして参照する。詳細は [`AGENTS.md`](AGENTS.md)。

---

## クイックスタート

### 前提

- Node.js 20+
- pnpm 10+
- Docker (ローカル DB / 結合テストの Testcontainers が要求)

### セットアップ

```bash
pnpm install

# 環境変数
cp .env.local.example .env.local
# AUTH_SECRET / RESEND_API_KEY などを埋める。AUTH_SECRET は openssl rand -base64 32

# ローカル Postgres を起動 (docker/docker-compose.yml)
pnpm db:up

# Prisma マイグレーション適用
pnpm db:migrate

# 開発サーバ
pnpm dev   # http://localhost:3000
```

---

## プロジェクト構成

```
app/                  Next.js App Router (RSC + Server Actions)
  _actions/           Server Actions (use server)
  notebooks/          ノート一覧・詳細・書き込み画面
  auth/               サインイン / メール検証
  api/                ルートハンドラ (Auth.js / Cron)
components/           UI コンポーネント
  ui/                 デザインプリミティブ (Sticker / PuffButton / …)
  icons/              アイコン
lib/                  ドメインロジック (Prisma 経由)
  schemas/            zod スキーマ
prisma/               スキーマ + マイグレーション
docker/               ローカル開発用 Postgres
docs/                 要件 / テスト戦略
tests/                結合テスト + ヘルパ + DB セットアップ
  helpers/            factories / session モック
  integration/        Testcontainers 駆動の DB 結合テスト
  setup/              vitest globalSetup / per-test truncate
```

---

## コマンド早見

| 用途           | コマンド                              |
| -------------- | ------------------------------------- |
| 開発サーバ     | `pnpm dev`                            |
| 本番ビルド     | `pnpm build` / `pnpm start`           |
| 型検査         | `pnpm typecheck`                      |
| Lint           | `pnpm lint`                           |
| フォーマット   | `pnpm format` / `pnpm format:check`   |
| テスト全部     | `pnpm test`                           |
| 単体のみ       | `pnpm test:unit`                      |
| 結合のみ (要 Docker) | `pnpm test:int`                  |
| カバレッジ     | `pnpm test:cov`                       |
| DB 起動 / 停止 | `pnpm db:up` / `pnpm db:down`         |
| DB 完全リセット | `pnpm db:reset`                       |
| マイグレーション | `pnpm db:migrate`                     |
| Prisma Studio | `pnpm db:studio`                      |

結合テストは Testcontainers が Docker daemon を要求する。テスト戦略の全体像は [`docs/testing.md`](docs/testing.md)。

---

## 開発フロー

このリポジトリは複数の作業トラックを **git worktree** で並走させる前提で運用する。単一 worktree で複数ブランチを切り替えながら進めない。

```bash
# 例: feat/xxx を別 worktree で開く
git worktree add ../kokan-nikki-xxx -b feat/xxx main
```

- `main` への直接コミット禁止。機能単位で `feat/xxx` を切ってから着手する。
- マイルストーン (タスク or PR) 区切りで一旦止まり、次の方針確認に移る。
- PR ごと / マイルストーン区切りで会話セッションも切り替え、ハンドオフサマリを残す。
- 並列トラックは **必ず別 worktree** に分離する。同じ worktree でブランチを行き来させると未コミット作業を踏みやすい。

---

## 関連ドキュメント

- 要件定義: [`docs/requirements.md`](docs/requirements.md)
- テスト戦略: [`docs/testing.md`](docs/testing.md)
- エージェント運用ルール: [`AGENTS.md`](AGENTS.md)
- デザインハンドオフ: "Dreamy Pixel" (パステル / Y2K カワイイ系。要件 §3.7 参照)
