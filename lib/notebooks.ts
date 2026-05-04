import { prisma } from "@/lib/prisma";
import { pickNextOrderIndex } from "@/lib/turn";

// Detail-page read model. Returns null when the notebook does not exist OR
// the viewer is not a member — the page layer maps that to notFound() so
// non-members and missing IDs are indistinguishable to outsiders (NF-SEC-04).
export type NotebookDetailMember = {
  userId: string;
  orderIndex: number;
  displayName: string;
  // F-USER-02: User.image の生値 (null か "preset:KEY")。コンポーネント側で
  // UserAvatar が解釈する。URL アップロード対応時もこの型で吸収できる。
  imageUrl: string | null;
};

export type NotebookDetailEntry = {
  id: string;
  title: string | null;
  body: string;
  createdAt: Date;
  authorId: string;
  authorDisplayName: string;
  authorImageUrl: string | null;
};

export type NotebookDetail = {
  id: string;
  name: string;
  members: NotebookDetailMember[];
  entries: NotebookDetailEntry[];
  nextTurnUserId: string | null;
  nextTurnDisplayName: string | null;
  nextTurnImageUrl: string | null;
  isViewerMember: true;
  isYourTurn: boolean;
  // F-NUDGE-02 のレートリミットを UI が予測表示するための値。viewer から
  // 現ターン者への直近ナッジ時刻 (なければ null)。24h 経過判定はページ側で行う。
  viewerLastNudgeAt: Date | null;
};

// F-AUTH-05: User.email は nullable (X 等 email を返さない OAuth provider 用)
// なので displayName fallback では email に頼らず、name 未設定なら placeholder
// を返す。OAuth provider はデフォルトで profile.name を User.name に書き込む
// ので、実用上 fallback に落ちるのは onboarding 名前入力前か X user で name
// も無いごく稀なケースのみ。
function displayNameOf(user: { name: string | null }): string {
  return user.name ?? "ななしさん";
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
          user: { select: { name: true, image: true } },
        },
      },
      entries: {
        // F-TURN-04: 一覧は新しい順。NF-CON-02 と同じ tie-break を採用。
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          title: true,
          // 一覧は title で表示するが、本番既存 entry (title=null) の fallback で
          // 先頭 30 文字を出すために body も引いておく。詳細ページでも使うので、
          // SQL 側 substring 化は今回見送り。
          body: true,
          createdAt: true,
          authorId: true,
          author: { select: { name: true, image: true } },
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
    imageUrl: m.user.image,
  }));
  const entries: NotebookDetailEntry[] = notebook.entries.map((e) => ({
    id: e.id,
    title: e.title,
    body: e.body,
    createdAt: e.createdAt,
    authorId: e.authorId,
    authorDisplayName: displayNameOf(e.author),
    authorImageUrl: e.author.image,
  }));

  // entries は新しい順なので [0] が最新。pickNextOrderIndex に渡せばよい。
  const latestAuthorId = entries[0]?.authorId ?? null;
  const nextOrderIndex = pickNextOrderIndex(members, latestAuthorId);
  const nextMember =
    nextOrderIndex === null
      ? null
      : (members.find((m) => m.orderIndex === nextOrderIndex) ?? null);

  // viewer が現ターン者宛に直近送ったナッジ時刻。ページ側でレートリミット
  // (24h) の予測表示に使う。viewer 自身が現ターン者の場合や送信先が居ない
  // 場合は引かない。
  let viewerLastNudgeAt: Date | null = null;
  if (nextMember && nextMember.userId !== viewerUserId) {
    const last = await prisma.nudge.findFirst({
      where: {
        notebookId: notebook.id,
        fromUserId: viewerUserId,
        toUserId: nextMember.userId,
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    viewerLastNudgeAt = last?.createdAt ?? null;
  }

  return {
    id: notebook.id,
    name: notebook.name,
    members,
    entries,
    nextTurnUserId: nextMember?.userId ?? null,
    nextTurnDisplayName: nextMember?.displayName ?? null,
    nextTurnImageUrl: nextMember?.imageUrl ?? null,
    isViewerMember: true,
    isYourTurn: nextMember?.userId === viewerUserId,
    viewerLastNudgeAt,
  };
}
