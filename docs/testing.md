# kokan-nikki テスト戦略

| 項目           | 内容                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| 関連要件       | `docs/requirements.md`（v0.1）                                               |
| 関連実装プラン | `~/.claude/plans/users-yuki-downloads-design-handoff-dre-vivid-matsumoto.md` |
| バージョン     | 0.1（MVP テスト戦略）                                                        |
| 最終更新       | 2026-04-29                                                                   |
| ステータス     | 確定（実装着手前）                                                           |

---

## 1. 背景・目的

### 1.1 背景

kokan-nikki の事業価値の中核は、「ターン制」「招待の atomic claim」「ナッジの 24h クールダウン」という **DB と密結合した時間・並行制約のドメインロジック** にある。これらは UI を眺めても挙動が見えず、純粋関数だけで再現することもできない。実装着手前にテスト方針が曖昧なまま進めると、`F-INV-08`（同時受諾）や `F-NUDGE-02`（24h クールダウン）といった「実機では滅多に踏まないが踏むと致命的」な欠陥が混入する。

### 1.2 目的

- 要件定義書の F-/NF- ID を起点に、テストでカバーすべき責務を **テスト種別ごとに明確化** する
- 単体／結合／E2E／手動探索の **配置・ツール・実行コマンド** を確定し、実装と並走できる状態にする
- CI で守るべき品質ゲート（カバレッジ閾値・必須 jobs）を定め、ブランチ保護に直結させる
- Playwright MCP（手動・探索的検証）と CI 自動 E2E の **二層運用** を制度化する

### 1.3 前提

- 投資バランス: **バランス型ピラミッド**（単体 + 結合 + E2E）
- DB 戦略: **Testcontainers** でテストごとに Postgres 16 を起動・破棄
- 認証: マジックリンクは結合テストで検証、E2E は **`Session` テーブルへ直接 INSERT + Cookie 注入** で迂回
- 外部依存: Resend SDK は **完全モック**（`vi.mock` または MSW）。実メール送信は CI で発生させない
- カバレッジゲートは **`lib/**`と`app/\_actions/**` のみ**。UI 層（演出を含む components / page / layout）は計測対象外

---

## 2. 戦略の方針

| 方針                | 内容                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ID 駆動             | 各テストは `docs/requirements.md` の F-/NF- ID をテスト名コメントまたは describe 名に明示し、§5 のマッピング表で双方向にトレース可能とする |
| ピラミッド          | 速くて多い単体 → DB を含む結合 → 数を絞った E2E。詳細ロジックは結合に寄せる（DB と一体で意味を持つため）                                   |
| 純粋関数の切り出し  | DB クエリを含む関数からは「純粋計算部分」を別 export し、単体に落とす（例: `lib/turn.ts` の `pickNextOrderIndex`）                         |
| Testcontainers 基盤 | 結合・E2E の DB は本番と同じ Postgres 16。SQLite で代替しない                                                                              |
| Resend 完全モック   | テスト中に実 API を叩かない。`vi.mock("resend")` または MSW で `https://api.resend.com/emails` を握る                                      |
| 並行性検証          | F-INV-08 / NF-CON-01 は `Promise.allSettled` で 2 トランザクションを発火し、片方だけが成功することを assert する                           |
| 時間モック非依存    | `vi.useFakeTimers()` は Prisma との相性問題があるため避け、テストでは `Nudge.create` 等で `createdAt` を直接打ち込む                       |

---

## 3. ツールスタック

| 種別               | ツール                       | 役割                                                            |
| ------------------ | ---------------------------- | --------------------------------------------------------------- |
| 単体・結合ランナー | Vitest                       | ESM ネイティブ、Next.js 15 と相性が良い                         |
| カバレッジ         | `@vitest/coverage-v8`        | 閾値ゲートと cobertura レポート                                 |
| E2E ブラウザ       | Playwright Test              | Chromium 1 ブラウザに絞る（MVP）                                |
| 結合用 DB          | `@testcontainers/postgresql` | テストファイル単位で Postgres 16 を起動・破棄                   |
| 外部依存モック     | `vi.mock` + MSW              | Resend SDK は `vi.mock`、E2E では MSW で HTTP を握る            |
| アクセシビリティ   | `@axe-core/playwright`       | E2E 内で主要画面に axe を流す                                   |
| 探索的・手動確認   | **Playwright MCP**           | Claude / 開発者が dev サーバを実ブラウザで操作。CI には載せない |
| CI                 | GitHub Actions（`pr.yml`）   | lint / unit / integration / e2e / cov-gate の 5 jobs            |

### 3.1 Playwright MCP の位置付け

- **CI に載せない**。人または Claude が対話的に操作するためのもの
- 想定用途:
  - 実装プラン §11 の「E2E 検証手順 16 項目」を Claude が自力で踏破する
  - スクロール演出（DiarySection / StickerStack / ScatterSection など）を画面ダンプで確認
  - バグ再現を MCP セッションで取り、再現コードをそのまま `tests/e2e/` に昇格
- 規約: MCP セッションで使ったロケーターは、自動 E2E と同じ `data-testid` 命名規約に揃える

---

## 4. テスト種別ごとの責務

### 4.1 単体（Vitest、co-locate）

- **配置**: `lib/turn.test.ts` のように実装の隣に置く
- **対象**: 純関数 / zod スキーマ / 小さなヘルパ
- **DB / I/O**: 含まない。Prisma を含む関数をモックして単体化することは禁止（モックするなら結合に格上げ）
- **代表ケース**:
  - `lib/turn.ts`: `pickNextOrderIndex(members, latest)` のような純粋計算ヘルパ（5 ケース、§6.3 参照）
  - `lib/invite.ts`: `generateInviteCode` の長さ・文字種（NF-SEC-05）
  - `lib/palette.ts`: cookie 値 → パレット定数のマッピング（F-SET-01）
  - zod スキーマ: 投稿本文 1〜5,000 文字の境界値（F-EDIT-02）

### 4.2 結合（Vitest + Testcontainers、`tests/integration/`）

- **配置**: `tests/integration/{actions,turn,invite,nudge,api}/*.test.ts`
- **セットアップ**:
  - `tests/setup/db.ts` で `beforeAll` に Postgres 16 コンテナを起動し `prisma migrate deploy` を実行
  - `beforeEach` で全テーブル truncate（テストごとに DB を作り直すよりも速い）
  - 並列実行時は worker ID をスキーマ名に組み込み、worker ごとに独立スキーマを持つ
- **対象**:
  - `app/_actions/notebooks.ts`: `createNotebook` / `postEntry` / `sendNudge`
  - `app/_actions/invites.ts`: `createInvite` / `acceptInvite`
  - `lib/turn.ts` のフル統合（DB と組み合わせたターン判定）
  - Cron ハンドラ `app/api/cron/nudge-emails/route.ts`: 閾値超ノートのみ拾うこと、Resend モックに送信履歴が記録されること（F-NUDGE-04）
  - 認証フロー: マジックリンク発行 → `VerificationToken` 検証 → `Session` 発行（F-AUTH-01〜04）
- **認証ヘルパ**: `tests/helpers/session.ts` で `User` + `Session` を直接 INSERT し、Server Action から見える `auth()` の戻り値をスタブする

### 4.3 E2E 自動（Playwright、`tests/e2e/`）

- **ブラウザ**: Chromium 1 種（MVP は他ブラウザを増やさない）
- **起動**: `playwright.config.ts` の `webServer` で `pnpm build && pnpm start`、Postgres は別 Testcontainers セッションで立てて環境変数注入
- **ログイン**: `tests/e2e/helpers/auth.ts` が User と Session を作成し、`context.addCookies()` で `authjs.session-token` を注入してから navigate（マジックリンクは結合で別途検証するので E2E では迂回）
- **Resend**: `vi.mock` ではなく **MSW を Node 側で立てる**。`https://api.resend.com/emails` を 200 で握り、`tests/e2e/helpers/resend-mock.ts` から呼び出し履歴を取得可能に
- **シナリオ（最小 3 本）**:

| ID     | 名前                                                                                        | 対応要件                                   |
| ------ | ------------------------------------------------------------------------------------------- | ------------------------------------------ |
| e2e-01 | UC-01 抜粋: ノート作成 → 招待発行 → 受諾 → A 投稿 → B 投稿 → ターンが回る                   | F-NB-01〜04 / F-INV-01〜06 / F-TURN-01〜04 |
| e2e-02 | UC-02 抜粋: ナッジを押す → 24h 内の再送が UI で disabled                                    | F-NUDGE-01〜03                             |
| e2e-03 | ターンガード: B のターン中に A が `/notebooks/[id]/write` 直アクセス → notFound or redirect | F-TURN-05 / NF-SEC-04                      |

- 各シナリオは独立した DB スキーマ（per-worker DB）で並列実行可能にする

### 4.4 開発時手動・探索的（Playwright MCP）

- CI に載せない。人または Claude が対話的に使う
- 想定用途:
  - 実装プラン §11 の検証手順 16 項目を、各実装マイルストーンで Claude が踏破する
  - スクロール演出（DiarySection / StickerStack / ScatterSection）の動作を DOM ダンプ + screenshot で確認
  - バグを MCP セッションで再現 → 再現コードを `tests/e2e/` に昇格
- 規約: MCP で使ったロケーターは自動 E2E と同じ `data-testid` 命名に揃え、昇格コストをゼロに近づける

### 4.5 アクセシビリティ（@axe-core/playwright を E2E 内で）

- E2E のシナリオ末尾で `await injectAxe(page); await checkA11y(page)` を呼ぶ
- 対象画面: `/`、`/auth/signin`、`/notebooks`、`/notebooks/[id]`、`/notebooks/[id]/write`、`/settings`
- 違反レベル `serious` 以上を fail に
- ランディングは装飾 SVG が多いので `aria-hidden` 抜けの検出に有効（NF-A11Y-02）

---

## 5. 要件IDマッピング表

| 要件 ID        | 単体                      | 結合                                 | E2E自動                   | MCP/手動                |
| -------------- | ------------------------- | ------------------------------------ | ------------------------- | ----------------------- |
| F-AUTH-01〜04  | —                         | ◎ マジックリンク → Session 発行      | △ Cookie 注入で迂回       | ○                       |
| F-NB-01〜04    | —                         | ◎                                    | ◎                         | ○                       |
| F-INV-01〜07   | —                         | ◎                                    | ○ 受諾フロー              | ○                       |
| **F-INV-08**   | —                         | ◎ Promise.allSettled 排他性          | —                         | —                       |
| F-TURN-01〜04  | ◎ 純粋計算部分            | ◎                                    | ○                         | ○                       |
| F-TURN-05      | —                         | ◎                                    | ◎                         | ○                       |
| F-EDIT-01〜02  | ◎ zod 境界値              | ◎                                    | ○                         | ○                       |
| F-EDIT-03      | —                         | ◎ 編集・削除エンドポイント不在の確認 | —                         | —                       |
| F-NUDGE-01〜03 | —                         | ◎ 24h クールダウン                   | ○                         | ○                       |
| F-NUDGE-04     | —                         | ◎ Cron + Resend モック               | —                         | △ Cron 手動 curl        |
| F-LP-01〜04    | ◎ redirect 分岐           | —                                    | —                         | ◎ 演出は MCP 目視       |
| F-SET-01〜02   | ◎ cookie ヘルパ           | ○                                    | △                         | ○                       |
| NF-PERF-01〜02 | —                         | —                                    | △ 計測のみ・ゲートなし    | ○                       |
| NF-SEC-01      | —                         | ○ AUTH_SECRET 未設定で起動失敗       | —                         | —                       |
| NF-SEC-02      | —                         | ◎ Cron に Bearer 不在で 401          | —                         | —                       |
| NF-SEC-03      | ◎ zod スキーマ            | ◎ Server Action 入力検証             | ○                         | —                       |
| NF-SEC-04      | —                         | ◎ 他人ノートに POST → 403            | ○                         | —                       |
| NF-SEC-05      | ◎ nanoid(12) 長さ・文字種 | —                                    | —                         | —                       |
| NF-CON-01      | —                         | ◎ F-INV-08 と併走                    | —                         | —                       |
| NF-CON-02      | ◎ id タイブレーカー       | ○                                    | —                         | —                       |
| NF-A11Y-01     | —                         | —                                    | △ クラス付与で停止確認    | ○                       |
| NF-A11Y-02     | —                         | —                                    | ◎ axe で aria-hidden 検出 | ○                       |
| NF-A11Y-03     | ◎ cookie ヘルパ           | —                                    | △                         | ○                       |
| NF-DEV-01〜02  | —                         | —                                    | △ Chromium のみ           | ○ 他ブラウザは MCP 手動 |
| NF-LNG-01      | —                         | —                                    | —                         | ○                       |
| NF-OPS-01〜03  | —                         | —                                    | —                         | — 環境設定の事項        |

凡例: ◎=主担当 / ○=補助 / △=軽くカバー / —=対象外

---

## 6. 特殊ケースの設計

### 6.1 F-INV-08 並行受諾

- 現実の Postgres 並行性を完全再現する必要はなく、`updateMany` の WHERE 条件が atomic claim になっていることを確認できればよい
- 検証パターン:

```ts
const [a, b] = await Promise.allSettled([
  acceptInvite({ code, userId: userA.id }),
  acceptInvite({ code, userId: userB.id }),
]);
// 期待: 片方が fulfilled、もう片方が rejected (InviteUnavailableError)
// メンバー数は claim 成功した側だけ +1
```

- より強い検証（任意）: `pg_advisory_lock` でブロックして両 tx を発火 → 解放、で真の同時実行を作る。MVP は前者で十分

### 6.2 F-NUDGE-02 24h クールダウン

- `vi.useFakeTimers()` は Prisma が内部的に `new Date()` を使う箇所と相性が悪いため使わない
- 代替: テスト内で `prisma.nudge.create({ data: { createdAt: subHours(new Date(), 23) } })` のように DB に直接 `createdAt` を打ち込み、`sendNudge` を呼んで rejected を確認
- 24h 経過後の許可も同様に `subHours(now, 25)` で別ケース
- F-NUDGE-04（Cron メール）の閾値 72h も同じ手法で `subHours(now, 73)` の Entry を作って検証

### 6.3 F-TURN ターン判定 5 ケース（lib/turn.ts）

| #   | ケース                                      | 期待                                   |
| --- | ------------------------------------------- | -------------------------------------- |
| 1   | メンバー 0 名                               | `null`                                 |
| 2   | メンバーあり、エントリ 0 件                 | orderIndex = 0 のメンバー（F-TURN-03） |
| 3   | 中間（lastIdx 0〜n-1）                      | lastIdx + 1（F-TURN-02）               |
| 4   | 末尾（lastIdx === n-1）                     | 0 にラップ                             |
| 5   | 脱退者最新（authorId が現メンバーに居ない） | 0                                      |

- DB クエリを含むので 2〜5 は結合に置く
- 純粋計算部分（`pickNextOrderIndex(members: Member[], latestAuthorId: string|null)`）を切り出して単体でテストする

### 6.4 NF-A11Y-01 reduce-motion クラス

- MVP は OS の `prefers-reduced-motion` には連動させず、`<html class="reduce-motion">` を明示付与した時のみ装飾アニメを停止する
- 検証 1: `.reduce-motion` クラス付与時、`.marquee` / `.sparkle` / `.cutie-float` の `getComputedStyle().animationName === 'none'` であること
- 検証 2: 同条件下でも、ボタンの focus ring 等の機能 transition は **生きていること**（`*{animation:none}` の過剰適用バグの再発防止）
- 検証 3: クラス未付与時は装飾アニメが流れていること（OS の reduce-motion 設定とは独立）
- 自動 E2E は MVP 対象外。将来 OS 連動を再導入する際に `page.emulateMedia({ reducedMotion: 'reduce' })` ベースの自動検証を追加する

---

## 7. テストデータ・フィクスチャ方針

- ファクトリ関数を `tests/helpers/factories.ts` に集約:
  - `makeUser({ email? })`
  - `makeNotebook({ owner, members? })`
  - `makeEntry({ notebook, author, createdAt? })`
  - `makeInvite({ notebook, expiresIn? })`
  - `makeSession({ user })`
  - `makeNudge({ from, to, createdAt? })`
- 各ファクトリは Prisma を直接叩き、デフォルトでユニーク値（`nanoid()`）を埋める
- フィクスチャ JSON は持たない（壊れやすい）。シードはテスト内で組み立てる
- 結合・E2E では `beforeEach` で truncate されるので、ファクトリ呼び出しは各テスト内で完結

---

## 8. カバレッジ目標と CI ゲート

| 範囲                                                 | line       | branch | 備考                          |
| ---------------------------------------------------- | ---------- | ------ | ----------------------------- |
| `lib/**`                                             | 80%        | 75%    | 純ロジックの守りライン        |
| `app/_actions/**`                                    | 70%        | 65%    | DB と Auth が絡むぶん少し緩く |
| `app/api/cron/**`                                    | 70%        | 65%    | Cron ハンドラ                 |
| 上記以外（`components/**`、`app/**` の page/layout） | 計測対象外 | —      | UI 演出は手動 + axe           |

- レポート: `v8` プロバイダ、`text` + `cobertura` を出力。CI で artifacts に保存
- ゲート違反は CI fail
- `coverage.thresholds.perFile` は使わない（厳しすぎる）。ディレクトリ単位の集約閾値のみ

---

## 9. CI ワークフロー（GitHub Actions）

`.github/workflows/pr.yml`（実装後に追加）:

```
trigger: pull_request, push (branch: main)
jobs:
  lint        : pnpm install --frozen-lockfile → pnpm lint → pnpm typecheck
  unit        : pnpm test:unit            # Vitest 単体のみ、DB 不要
  integration : pnpm test:int             # Testcontainers 起動、カバレッジ閾値判定
  e2e         : pnpm test:e2e             # Playwright（Chromium）+ axe
  cov-gate    : integration の coverage を読み、閾値判定
```

- `services:` に依存せず、Testcontainers が `ubuntu-latest` 標準の Docker daemon でコンテナを起こす
- E2E は `playwright install --with-deps chromium` のみ
- 全 jobs green でないと merge 不可（branch protection で強制）
- 想定実行時間目安: lint ~30s / unit ~20s / integration ~2-3 分 / e2e ~3-5 分

---

## 10. スコープ外（MVP でテストしないもの）

- ビジュアルリグレッション（Playwright screenshot diff）
- 多ブラウザ（Firefox / WebKit）— NF-DEV-02 は MCP 手動でカバー
- 性能ベンチマーク（NF-PERF-01〜02 は Lighthouse 手動 + Vercel Analytics で計測のみ、ゲートなし）
- ロード / 負荷テスト
- セキュリティ静的解析（Snyk 等）
- メール本文の HTML スナップショット（`react-email` 不採用と整合）
- Storybook（コンポーネント数が少なく、E2E と axe のほうが情報量が多い）

これらは v1.0 以降の拡張で再評価する。

---

## 11. テスト実行コマンド早見表

```
pnpm test            # unit + integration（Testcontainers 自動起動）
pnpm test:unit       # 単体のみ（速い、DB 不要）
pnpm test:int        # 結合のみ（Testcontainers 必要、Docker 起動が前提）
pnpm test:cov        # 上記 + カバレッジレポート
pnpm test:e2e        # Playwright（dev server を自動起動、Postgres は別 container）
pnpm test:e2e:ui     # Playwright UI モード（手元デバッグ用）
pnpm mcp:browser     # Playwright MCP セッションを起動（dev サーバ必須、Claude が触る）
```

---

## 12. 関連ドキュメント

- 要件定義: `docs/requirements.md`
- 実装プラン: `~/.claude/plans/users-yuki-downloads-design-handoff-dre-vivid-matsumoto.md`
- 実装後に作成される設定・ヘルパ:
  - `vitest.config.ts`
  - `playwright.config.ts`
  - `tests/setup/db.ts`
  - `tests/helpers/{session,factories,resend-mock}.ts`
  - `tests/integration/`
  - `tests/e2e/`
  - `.github/workflows/pr.yml`
