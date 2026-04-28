import { prisma } from "@/lib/prisma";

export type Member = {
  userId: string;
  orderIndex: number;
};

/**
 * Pure turn-resolution rule. The DB-backed wrappers below construct the
 * inputs and feed them through this function so the algorithm itself is
 * unit-testable without a database (testing.md §4.1, §6.3).
 *
 * Returns the orderIndex of the member whose turn comes next, or null when
 * the notebook has no members yet.
 *
 * Cases (F-TURN-02 / F-TURN-03):
 *   - empty members          → null
 *   - no entries yet         → first member by orderIndex
 *   - latest author present  → next member in the cyclic order
 *   - latest author missing  → first member (defensive: a former member
 *     could appear as the latest authorId even if departures are out of
 *     scope for MVP per requirements §8)
 */
export function pickNextOrderIndex(
  members: readonly Member[],
  latestAuthorId: string | null,
): number | null {
  if (members.length === 0) return null;

  const sorted = [...members].sort((a, b) => a.orderIndex - b.orderIndex);
  if (latestAuthorId === null) return sorted[0].orderIndex;

  const currentIdx = sorted.findIndex((m) => m.userId === latestAuthorId);
  if (currentIdx === -1) return sorted[0].orderIndex;

  return sorted[(currentIdx + 1) % sorted.length].orderIndex;
}

export async function getNextTurnUserId(
  notebookId: string,
): Promise<string | null> {
  const members = await prisma.notebookMember.findMany({
    where: { notebookId },
    select: { userId: true, orderIndex: true },
    orderBy: { orderIndex: "asc" },
  });
  // NF-CON-02: include id as a tiebreaker so identical createdAt values
  // (possible under fast-test clocks or clock skew) still produce a
  // deterministic "latest" pick.
  const latestEntry = await prisma.entry.findFirst({
    where: { notebookId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { authorId: true },
  });

  const nextOrderIndex = pickNextOrderIndex(
    members,
    latestEntry?.authorId ?? null,
  );
  if (nextOrderIndex === null) return null;

  const next = members.find((m) => m.orderIndex === nextOrderIndex);
  return next?.userId ?? null;
}

export async function isUsersTurn(
  notebookId: string,
  userId: string,
): Promise<boolean> {
  const nextUserId = await getNextTurnUserId(notebookId);
  return nextUserId === userId;
}
