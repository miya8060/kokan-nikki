// F-NUDGE-02: 同じ送信者→同じ受信者へのナッジは 24h に 1 回まで。
// テストでも参照したい純粋な定数なので、Server Action ファイルではなく lib に置く
// (Next 16 の "use server" は値定数の export を許さない)。
export const NUDGE_RATE_LIMIT_MS = 24 * 60 * 60 * 1000;
