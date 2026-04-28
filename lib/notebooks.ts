import { prisma } from "@/lib/prisma";
import { pickNextOrderIndex } from "@/lib/turn";

// Detail-page read model. Returns null when the notebook does not exist OR
// the viewer is not a member — the page layer maps that to notFound() so
// non-members and missing IDs are indistinguishable to outsiders (NF-SEC-04).
export type NotebookDetailMember = {
  userId: string;
  orderIndex: number;
  displayName: string;
};

export type NotebookDetailEntry = {
  id: string;
  body: string;
  createdAt: Date;
  authorId: string;
  authorDisplayName: string;
};

export type NotebookDetail = {
  id: string;
  name: string;
  members: NotebookDetailMember[];
  entries: NotebookDetailEntry[];
  nextTurnUserId: string | null;
  nextTurnDisplayName: string | null;
  isViewerMember: true;
  isYourTurn: boolean;
};

function displayNameOf(user: { name: string | null; email: string }): string {
  return user.name ?? user.email;
}

export async function getNotebookDetail(
  notebookId: string,
  viewerUserId: string,
): Promise<NotebookDetail | null> {
  const notebook = await prisma.notebook.findUnique({
    where: { id: notebookId },
    select: {
      id: true,
      name: true,
      members: {
        orderBy: { orderIndex: "asc" },
        select: {
          userId: true,
          orderIndex: true,
          user: { select: { name: true, email: true } },
        },
      },
      entries: {
        // F-TURN-04: 一覧は新しい順。NF-CON-02 と同じ tie-break を採用。
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          body: true,
          createdAt: true,
          authorId: true,
          author: { select: { name: true, email: true } },
        },
      },
    },
  });
  if (!notebook) return null;

  const isMember = notebook.members.some((m) => m.userId === viewerUserId);
  if (!isMember) return null;

  const members: NotebookDetailMember[] = notebook.members.map((m) => ({
    userId: m.userId,
    orderIndex: m.orderIndex,
    displayName: displayNameOf(m.user),
  }));
  const entries: NotebookDetailEntry[] = notebook.entries.map((e) => ({
    id: e.id,
    body: e.body,
    createdAt: e.createdAt,
    authorId: e.authorId,
    authorDisplayName: displayNameOf(e.author),
  }));

  // entries は新しい順なので [0] が最新。pickNextOrderIndex に渡せばよい。
  const latestAuthorId = entries[0]?.authorId ?? null;
  const nextOrderIndex = pickNextOrderIndex(members, latestAuthorId);
  const nextMember =
    nextOrderIndex === null
      ? null
      : (members.find((m) => m.orderIndex === nextOrderIndex) ?? null);

  return {
    id: notebook.id,
    name: notebook.name,
    members,
    entries,
    nextTurnUserId: nextMember?.userId ?? null,
    nextTurnDisplayName: nextMember?.displayName ?? null,
    isViewerMember: true,
    isYourTurn: nextMember?.userId === viewerUserId,
  };
}
