// Action-specific error classes live here, NOT in the "use server" module.
// Next 16's "use server" only permits async function exports — classes (which
// have runtime identity) get rejected at compile time. Splitting them out
// keeps action files lean while still letting tests and UI handlers
// discriminate on `reason`.

export type CreateNotebookReason = "unauthenticated" | "invalid-input";

export class CreateNotebookError extends Error {
  readonly reason: CreateNotebookReason;

  constructor(reason: CreateNotebookReason) {
    super(reason);
    this.name = "CreateNotebookError";
    this.reason = reason;
  }
}

export type PostEntryReason =
  | "unauthenticated"
  | "invalid-input"
  | "not-member"
  | "not-your-turn";

export class PostEntryError extends Error {
  readonly reason: PostEntryReason;

  constructor(reason: PostEntryReason) {
    super(reason);
    this.name = "PostEntryError";
    this.reason = reason;
  }
}

export type CreateInviteReason =
  | "unauthenticated"
  | "invalid-input"
  | "not-member";

export class CreateInviteError extends Error {
  readonly reason: CreateInviteReason;

  constructor(reason: CreateInviteReason) {
    super(reason);
    this.name = "CreateInviteError";
    this.reason = reason;
  }
}

// AcceptInviteError は requirements.md UC-04 の "InviteUnavailableError" と同じ
// 役割を担う。reason を細分化することで、ページ側で「期限切れ」「使用済み」
// 「満員」を出し分けられるようにしている。
//   - invalid-code : 該当コードが存在しない
//   - expired      : expiresAt が過去 (F-INV-02)
//   - already-used : usedAt が既にセット済み or atomic claim にレース敗北 (F-INV-03 / F-INV-08)
//   - notebook-full: メンバー数が上限 6 に達している (F-INV-07 / F-NB-02 / C-05)
export type AcceptInviteReason =
  | "unauthenticated"
  | "invalid-input"
  | "invalid-code"
  | "expired"
  | "already-used"
  | "notebook-full";

export class AcceptInviteError extends Error {
  readonly reason: AcceptInviteReason;

  constructor(reason: AcceptInviteReason) {
    super(reason);
    this.name = "AcceptInviteError";
    this.reason = reason;
  }
}

export type SettingsReason = "invalid-input";

export class SettingsError extends Error {
  readonly reason: SettingsReason;

  constructor(reason: SettingsReason) {
    super(reason);
    this.name = "SettingsError";
    this.reason = reason;
  }
}

// F-USER-01〜03 共通のプロファイル更新エラー。
//   - upload-disabled    : BLOB_READ_WRITE_TOKEN 未設定 (Preview / 一部 dev) で
//                          画像アップロード経路を呼んだ
//   - upload-too-large   : 1MB を超える File が来た (client canvas 後の想定 30KB
//                          を大きく逸脱しているので異常系)
//   - upload-invalid-type: jpeg/png/webp 以外の mime
//   - upload-failed      : iconUploadSchema が他の理由で失敗 (空ファイル等)
export type UpdateProfileReason =
  | "unauthenticated"
  | "invalid-input"
  | "upload-disabled"
  | "upload-too-large"
  | "upload-invalid-type"
  | "upload-failed";

export class UpdateProfileError extends Error {
  readonly reason: UpdateProfileReason;

  constructor(reason: UpdateProfileReason) {
    super(reason);
    this.name = "UpdateProfileError";
    this.reason = reason;
  }
}

// F-NUDGE-01〜03 のサーバー側挙動を表現する。受信者は「現ターンの人」
// 一意に決まるためサーバー側で導出する設計にしており、UI からは toUserId を
// 受け取らない。そのため「自己宛」「ターン者以外宛」のエラーは発生しない。
//   - not-member       : NF-SEC-04 のメンバーシップ検証で弾かれた
//   - no-active-turn   : ノートにメンバーが居ない / ターン者を特定できない (防御的)
//   - not-current-turn : 自分が現ターンなので、自分はナッジを送る側ではない (F-NUDGE-01)
//   - rate-limited     : 同じ from→to に 24h 以内のナッジが既にある (F-NUDGE-02)
export type SendNudgeReason =
  | "unauthenticated"
  | "invalid-input"
  | "not-member"
  | "no-active-turn"
  | "not-current-turn"
  | "rate-limited";

export class SendNudgeError extends Error {
  readonly reason: SendNudgeReason;

  constructor(reason: SendNudgeReason) {
    super(reason);
    this.name = "SendNudgeError";
    this.reason = reason;
  }
}
