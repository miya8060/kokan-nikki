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
