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
