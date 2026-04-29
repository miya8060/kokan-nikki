# 未実装 feature 棚卸し

| 項目     | 内容                                                                 |
| -------- | -------------------------------------------------------------------- |
| 対象     | `docs/requirements.md` の F-_ / NF-_ 全 ID                           |
| 観点     | 実装ステータス × テストステータス × 根拠 (file:line)                 |
| 棚卸し日 | 2026-04-30                                                           |
| 目的     | 「次に何をやるか」を決めるための地図。実装そのものはここでは行わない |

---

## 凡例

実装ステータス:

- **done** — 実装が要件 ID をカバーしている
- **partial** — 一部のみカバー / 主要パスのみ
- **not-started** — 実装が無い

テストステータス:

- **covered** — testing.md §5 の主担当 ◎/○ をいずれかのレイヤで満たしている
- **partial** — 一部のシナリオだけ。マッピング表より薄い
- **none** — 自動テストが無い

「根拠」は実装/テストファイルへのリンク (`file:line`)。

---

## § 完了済 (done + covered)

ここに入っている ID は「実装あり、testing.md §5 の主担当が手当て済み」。
触らない限り壊れない領域。

| 要件 ID    | 実装                                                                                                         | テスト                                                                                                                | 次の一手 |
| ---------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------- |
| F-AUTH-01  | `lib/auth.ts:14`, `app/auth/signin/page.tsx:34`, `app/_actions/auth.ts:12`                                   | `tests/integration/auth/sign-in.test.ts:35`, `tests/integration/auth/actions-smoke.test.ts:29`                        | 不要     |
| F-AUTH-02  | `lib/auth.ts:13` (Resend provider のみ)                                                                      | `tests/integration/auth/sign-in.test.ts` (パスワード経路が無いことが構造で担保)                                       | 不要     |
| F-AUTH-03  | `lib/auth.ts:10` (`session: { strategy: "database" }`)                                                       | `tests/integration/auth/callback.test.ts:47` (Session 行が DB に作られる / token 再利用不可)                          | 不要     |
| F-NB-01    | `app/_actions/notebooks.ts:24`, `lib/schemas/notebook.ts:9`                                                  | `tests/integration/notebooks/create-notebook.test.ts:20`, `lib/schemas/notebook.test.ts`                              | 不要     |
| F-NB-03    | `app/_actions/notebooks.ts:42` (作成者を `orderIndex=0` で nested write)                                     | `tests/integration/notebooks/create-notebook.test.ts:20`                                                              | 不要     |
| F-NB-04    | `app/notebooks/page.tsx:32` (memberships 一覧 + 次のターン解決)                                              | `tests/e2e/notebook-flow.spec.ts:43`                                                                                  | 不要     |
| F-INV-01   | `app/_actions/invites.ts:26`, `app/notebooks/[id]/invite/page.tsx`                                           | `tests/integration/invites/create-invite.test.ts:20`, `tests/integration/invites/invite-pages.test.ts:54`             | 不要     |
| F-INV-02   | `lib/invites.ts:19` (TTL 7 日), `app/_actions/invites.ts:131`                                                | `lib/invites.test.ts:35`, `tests/integration/invites/accept-invite.test.ts:93`, `invite-pages.test.ts:184`            | 不要     |
| F-INV-03   | `app/_actions/invites.ts:128` (early reject) + `:147` (atomic claim)                                         | `tests/integration/invites/accept-invite.test.ts:114`, `invite-pages.test.ts:206`                                     | 不要     |
| F-INV-04   | `app/_actions/invites.ts:53` (有効コードがあれば再利用)                                                      | `tests/integration/invites/create-invite.test.ts:44`, `tests/e2e/notebook-flow.spec.ts:76`                            | 不要     |
| F-INV-05   | `app/invite/[code]/page.tsx:84` (callbackUrl 付き signin redirect)                                           | `tests/integration/invites/invite-pages.test.ts:123`                                                                  | 不要     |
| F-INV-06   | `app/_actions/invites.ts:115`, `app/invite/[code]/page.tsx:120`                                              | `tests/integration/invites/accept-invite.test.ts:182`, `invite-pages.test.ts:137`                                     | 不要     |
| F-INV-07   | `app/_actions/invites.ts:140` (in-tx で再評価), `app/invite/[code]/page.tsx:131`                             | `tests/integration/invites/accept-invite.test.ts:205`, `invite-pages.test.ts:224`                                     | 不要     |
| F-INV-08   | `app/_actions/invites.ts:147` (`updateMany` の atomic claim)                                                 | `tests/integration/invites/accept-invite.test.ts:238` (Promise.allSettled レース)                                     | 不要     |
| F-TURN-01  | `app/_actions/notebooks.ts:101` (`isUsersTurn` ガード)                                                       | `tests/integration/notebooks/post-entry.test.ts:46`                                                                   | 不要     |
| F-TURN-02  | `lib/turn.ts:24` (`pickNextOrderIndex`)                                                                      | `lib/turn.test.ts`, `tests/integration/turn/get-next-turn-user-id.test.ts:33`                                         | 不要     |
| F-TURN-03  | `lib/turn.ts:31` (空 entries → orderIndex=0)                                                                 | `lib/turn.test.ts`, `tests/integration/turn/get-next-turn-user-id.test.ts:24`                                         | 不要     |
| F-TURN-04  | `lib/notebooks.ts:58`, `app/notebooks/[id]/page.tsx:127`                                                     | `tests/e2e/notebook-flow.spec.ts:142`                                                                                 | 不要     |
| F-TURN-05  | UI: `app/notebooks/[id]/write/page.tsx:32` / Server: `app/_actions/notebooks.ts:101`                         | `tests/integration/notebooks/post-entry.test.ts:46`, `write-page-guard.test.ts:50`, `tests/e2e/turn-guard.spec.ts:17` | 不要     |
| F-EDIT-01  | `lib/schemas/entry.ts:9` (length のみ; markdown 解釈を行わない方針)                                          | `lib/schemas/entry.test.ts:28`                                                                                        | 不要     |
| F-EDIT-02  | `lib/schemas/entry.ts:7` (1〜5,000 文字)                                                                     | `lib/schemas/entry.test.ts:7`                                                                                         | 不要     |
| F-NUDGE-01 | `app/_actions/nudges.ts:48` (現ターン者 = 受信者導出 / 送信者除外)                                           | `tests/integration/nudges/send-nudge.test.ts:50`                                                                      | 不要     |
| F-NUDGE-02 | `app/_actions/nudges.ts:60`, `lib/nudges.ts:4`, UI: `app/notebooks/[id]/page.tsx:76`                         | `tests/integration/nudges/send-nudge.test.ts:106`, `tests/e2e/nudge-cooldown.spec.ts:20`                              | 不要     |
| F-NUDGE-03 | `app/_actions/nudges.ts:77` (`Nudge.create`)                                                                 | `tests/integration/nudges/send-nudge.test.ts:27`, `tests/e2e/nudge-cooldown.spec.ts:73`                               | 不要     |
| F-NUDGE-04 | `app/api/cron/nudge/route.ts`, `vercel.json:3` (cron schedule)                                               | `tests/integration/cron/nudge-cron.test.ts:74`                                                                        | 不要     |
| F-LP-01    | `app/page.tsx:11` (未ログインなら描画)                                                                       | `app/page.test.ts:53`                                                                                                 | 不要     |
| F-LP-02    | `app/page.tsx:17` (Marquee + Sticker + FloatingCutie + Sparkle)                                              | (構造的に担保 / 手動 MCP テスト想定)                                                                                  | 不要     |
| F-LP-03    | `app/page.tsx:88` (`PuffButton` 2 種が `/auth/signin` に飛ばす)                                              | (testing.md §5 上は MCP/手動カバー)                                                                                   | 不要     |
| F-LP-04    | `app/page.tsx:13` (ログイン済 → `/notebooks`)                                                                | `app/page.test.ts:33`                                                                                                 | 不要     |
| F-SET-01   | `app/_actions/settings.ts:32`, `lib/palette.ts`, `app/layout.tsx:62`                                         | `tests/integration/settings/settings-actions.test.ts:35`, `lib/palette.test.ts`                                       | 不要     |
| F-SET-02   | `app/_actions/settings.ts:48`, `app/layout.tsx:77` (`heart-cursor-on` クラス)                                | `tests/integration/settings/settings-actions.test.ts:79`, `lib/palette.test.ts:32`                                    | 不要     |
| NF-SEC-02  | `app/api/cron/nudge/route.ts:24` (SHA-256 timingSafeEqual)                                                   | `tests/integration/cron/nudge-cron.test.ts:42`                                                                        | 不要     |
| NF-SEC-03  | 全 Server Action が `safeParse` を通している (`app/_actions/*.ts`)                                           | 各 action テストの `invalid-input` ケース                                                                             | 不要     |
| NF-SEC-04  | `app/_actions/{notebooks,invites,nudges}.ts` のメンバーシップチェック / `lib/notebooks.ts:71` の null 落とし | `tests/integration/{notebooks/post-entry,invites/invite-pages,notebooks/write-page-guard,nudges/send-nudge}.test.ts`  | 不要     |
| NF-SEC-05  | `lib/invites.ts:14` (base64url 12 文字 = 72 bit)                                                             | `lib/invites.test.ts:15`                                                                                              | 不要     |
| NF-CON-01  | `app/_actions/invites.ts:139` (single transaction + atomic `updateMany`)                                     | `tests/integration/invites/accept-invite.test.ts:238`                                                                 | 不要     |
| NF-CON-02  | `lib/turn.ts:52`, `lib/notebooks.ts:58` (`createdAt DESC, id DESC`)                                          | `tests/integration/turn/get-next-turn-user-id.test.ts:72`                                                             | 不要     |
| NF-A11Y-02 | `components/ui/{FloatingCutie,Marquee,Sparkle,HeartCursor}.tsx` の `aria-hidden`                             | `tests/e2e/helpers/axe.ts` 経由で各 spec の `checkA11y` が serious+ を弾く                                            | 不要     |
| NF-A11Y-03 | `lib/palette.ts:50` (default OFF), `app/_actions/settings.ts:48`, `app/settings/page.tsx`                    | `tests/integration/settings/settings-actions.test.ts:79`, `lib/palette.test.ts:32`                                    | 不要     |

---

## § 実装あり / テスト不足 (done + partial|none)

実装は出来ているが、testing.md §5 が要求するレイヤのテストが手付かず or 薄い ID。
リグレッション検知の欠落点なので、優先的に手当てする価値が高い。

### ~~NF-A11Y-01~~ — `reduce-motion` クラスでの装飾アニメ停止 (covered)

- **実装**: `app/globals.css:383` で `.marquee` / `.sparkle` / `.cutie-float` を `animation: none !important` に。
- **テスト**: `tests/e2e/reduce-motion.spec.ts` で testing.md §6.4 の検証 1〜3 (装飾 OFF / 装飾 ON / `.btn-puff` の transition 生存) を自動化済。`*{animation:none}` の過剰適用バグは transition 検査で検知される。
- **次の一手**: 不要。OS 連動 (`prefers-reduced-motion`) を将来再導入する際は `page.emulateMedia({ reducedMotion: 'reduce' })` ケースを足す。

### F-EDIT-03 — エントリの編集・削除が無いこと

- **実装**: 該当エンドポイント / Server Action が存在しないことで担保されている (構造的)。
- **テストの不足**:
  - testing.md §5 で「結合 ◎ 編集・削除エンドポイント不在の確認」と明記されているが、該当テストは未配。
  - 将来の scope creep (誰かが `updateEntry` / `deleteEntry` を生やす) を検知できない。
- **次の一手**: `tests/integration/notebooks/edit-delete-absence.test.ts` を 1 本。`app/_actions/notebooks` が `updateEntry` / `deleteEntry` を export しないことを `Object.keys` で assert するだけの guard test で十分。

### NF-SEC-01 — `AUTH_SECRET` が無いと起動失敗

- **実装**: Auth.js v5 がフレームワーク側で要求するため、未設定なら `NextAuth(config)` 評価時に throw する。
- **テストの不足**:
  - testing.md §5 の「結合 ○ AUTH_SECRET 未設定で起動失敗」がまだ encode されていない。
  - 環境変数の読み込み順 (例えば `.env.local` のミス) を踏んだときに気付ける装置が無い。
- **次の一手**: `tests/integration/auth/secret-required.test.ts` を 1 本。`process.env.AUTH_SECRET` を delete してから `await import("@/lib/auth")` が reject することを確認する。`tests/integration/auth/_setup.ts` の secret 設定経路と分けて per-test reset する必要がある点に注意。

### F-AUTH-04 — 同じメールアドレスのアカウントは 1 つに統合される

- **実装**: `prisma/schema.prisma:21` の `email String @unique` + Auth.js の PrismaAdapter による upsert で担保。
- **テストの不足**:
  - 同じ email で 2 回 magic link → 1 つの User に集約される、という end-to-end の挙動は明示的に検証されていない。
  - `tests/integration/auth/sign-in.test.ts:88` (email normalize) は近いが、F-AUTH-04 そのものを ID 名指しで踏むケースは無い。
- **次の一手**: `tests/integration/auth/identity-merge.test.ts` を追加。同じ email で `signin` を 2 回流して、`prisma.user.count({ where: { email } }) === 1` を assert する。

### F-NB-04 (UI 層) — ノート一覧の SSR レンダリング

- **実装**: `app/notebooks/page.tsx`。
- **テストの状態**:
  - e2e-01 で「カードが見える」「`あなた ♡` が出る」までは踏んでいるので **covered** に区分してよいが、2026-04-29 時点の testing.md §5 では「結合 ◎」も書かれている。
  - 結合レイヤで `NotebooksPage()` を直叩きするテストは無い。e2e で確認できているなら無理に増やす必要は無いが、起動コストの観点で結合に下ろす案は検討の余地あり。
- **次の一手**: 緊急性は低い。e2e の安定運用を優先し、結合追加は後回しで OK。

### NF-DEV-01 — 流体タイポによるモバイル/デスクトップ両対応

- **実装**: `app/globals.css` の `clamp()` ベース。
- **テストの状態**: 手動 / MCP 任せ。Playwright での viewport テストは無い。
- **次の一手**: 緊急性は低い。`docs/testing.md` §10 で「ビジュアルリグレッションは MVP 対象外」と整合しているので追加しない。

---

## § 部分実装 (partial)

要件 ID の意図のうち一部しか実装で表現されていない ID。

### F-NB-02 — メンバー数 2〜6 人の **下限** 2 人

- **実装の状態**:
  - 上限 6 は `lib/invites.ts:28` の `NOTEBOOK_MAX_MEMBERS` で `acceptInvite` が in-tx 検査済 (F-INV-07 と一体)。
  - 下限 2 は **未実装**。`createNotebook` 直後はメンバー 1 人 (作成者のみ) で成立しており、ノート詳細・書き込みも単独でできる。
- **要件本文の解釈**: 要件 §3.2 は「1 ノートのメンバー数は 2〜6 人」と書きつつ、§5 UC-01 では「招待 → B が参加して 2 人になる」が普通の遷移。MVP では「招待が来て初めて 2 人目になる」現状の挙動が暗黙の運用解釈になっている。
- **次の一手**:
  1. 要件側の温度感を明確化する PR (「下限 2 は招待受諾後の最終状態の話で、作成直後の単独状態は許容」 と注記) を別途立てる。
  2. もし厳格化するなら、ノート詳細で「招待を発行/共有してね」より強い導線を出すのが UX 上の手当て。サーバー側の hard-reject は MVP では入れない方が安全。

### NF-PERF-01 / NF-PERF-02 — パフォーマンス目標

- **実装の状態**:
  - F-NB-04 / F-TURN-04 のクエリは `(notebookId, createdAt)` インデックス + `id DESC` タイブレーカーが効いている (`prisma/schema.prisma:108`, `lib/notebooks.ts:58`)。
  - 「初回ペイント 2 秒」「entry 取得 200ms」 を継続計測する仕組みは未配。
- **次の一手**: testing.md §10 で「Lighthouse 手動 + Vercel Analytics で計測のみ・ゲートなし」と明記されているので追加自動化は不要。MVP 出荷後に Vercel Analytics の dashboard を 1 度だけ目視する運用で十分。

### NF-DEV-02 — モダンブラウザ最新 2〜3 バージョン

- **実装の状態**: Chromium 1 種で E2E を回している。Firefox / WebKit は MCP 手動カバー想定 (testing.md §5 / §10)。
- **次の一手**: 不要。MVP scope と整合済み。

---

## § 未着手 (not-started)

該当無し (要件 ID 全件に対して、少なくとも実装の足がかりは存在する)。

> 想定外に「実装そのものが無い ID」が生まれた場合はここに移す。2026-04-30 時点では空。

---

## Recommended Next Up (優先度トップ 2)

1. **NF-SEC-01 の secret 起動失敗テストを encode**  
   `tests/integration/auth/secret-required.test.ts`。`AUTH_SECRET` を抜いた状態で `lib/auth` の動的 import が reject することを assert。env 漏れを CI で検知する装置になる。
2. **F-EDIT-03 のエンドポイント不在ガード**  
   `tests/integration/notebooks/edit-delete-absence.test.ts`。`Object.keys` ベースの 1 ケースで足り、将来 scope creep で `updateEntry` / `deleteEntry` が増えたら CI で気付ける。

2 件とも 1 ファイル追加で完結する小粒な手当てで、冒頭に並べた順で着手すれば 1 日 1 PR ペースで消化できる粒度。

> 完了済: NF-A11Y-01 reduce-motion の自動 E2E (`tests/e2e/reduce-motion.spec.ts`)。
