import { describe, expect, it } from "vitest";
import { pickNextOrderIndex, type Member } from "./turn";

// testing.md §6.3 — F-TURN ターン判定 5 ケース。DB を含まない純粋計算部分のみ
// を対象に、orderIndex が連番でない / 入力が降順 でも壊れないことも併せて
// 確認する（NF-CON-02 のタイブレーカー本体は結合テストでカバー）。
describe("pickNextOrderIndex", () => {
  const u = (id: string, orderIndex: number): Member => ({
    userId: id,
    orderIndex,
  });

  it("returns null when there are no members (F-TURN-03 boundary)", () => {
    expect(pickNextOrderIndex([], null)).toBeNull();
    expect(pickNextOrderIndex([], "anyone")).toBeNull();
  });

  it("returns the first member by orderIndex when no entries exist (F-TURN-03)", () => {
    // Input intentionally unsorted to assert the function sorts internally.
    const members = [u("b", 1), u("a", 0), u("c", 2)];
    expect(pickNextOrderIndex(members, null)).toBe(0);
  });

  it("advances to the next orderIndex when latest author is mid-cycle (F-TURN-02)", () => {
    const members = [u("a", 0), u("b", 1), u("c", 2)];
    expect(pickNextOrderIndex(members, "a")).toBe(1);
    expect(pickNextOrderIndex(members, "b")).toBe(2);
  });

  it("wraps back to the first member when latest author is at the tail (F-TURN-02 wrap)", () => {
    const members = [u("a", 0), u("b", 1), u("c", 2)];
    expect(pickNextOrderIndex(members, "c")).toBe(0);
  });

  it("falls back to the first member when latest author is no longer a member (defensive)", () => {
    // requirements §8: departures are out of MVP scope, but a stale Entry.authorId
    // should still resolve to a deterministic next pick instead of throwing.
    const members = [u("a", 0), u("b", 1)];
    expect(pickNextOrderIndex(members, "ghost")).toBe(0);
  });
});
