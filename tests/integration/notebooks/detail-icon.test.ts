import { beforeEach, describe, expect, it } from "vitest";

import { getNotebookDetail } from "@/lib/notebooks";
import { makeEntry, makeNotebook, makeUser } from "@/tests/helpers/factories";
import { getPrisma } from "@/tests/setup/db.per-test";

// F-USER-02: getNotebookDetail() の read model にメンバー / エントリ著者 /
// 次ターン者のアイコン (User.image の生値) が伝搬していることを確認する。
// 値の解釈 (preset:KEY → SVG) は UserAvatar 側の責務。

describe("getNotebookDetail — member/entry/next-turn imageUrl (F-USER-02)", () => {
  beforeEach(() => {
    /* per-test db is reset by the integration setup */
  });

  it("members[].imageUrl に各メンバーの User.image が出る", async () => {
    const prisma = getPrisma();
    const owner = await makeUser(prisma, { image: "preset:heart" });
    const other = await makeUser(prisma, { image: null });
    const notebook = await makeNotebook(prisma, {
      owner,
      members: [other],
    });

    const detail = await getNotebookDetail(notebook.id, owner.id);
    expect(detail).not.toBeNull();
    if (!detail) return;

    const ownerMember = detail.members.find((m) => m.userId === owner.id);
    const otherMember = detail.members.find((m) => m.userId === other.id);
    expect(ownerMember?.imageUrl).toBe("preset:heart");
    expect(otherMember?.imageUrl).toBeNull();
  });

  it("entries[].authorImageUrl に著者の User.image が出る", async () => {
    const prisma = getPrisma();
    const author = await makeUser(prisma, { image: "preset:star" });
    const notebook = await makeNotebook(prisma, { owner: author });
    await makeEntry(prisma, { notebook, author });

    const detail = await getNotebookDetail(notebook.id, author.id);
    expect(detail).not.toBeNull();
    if (!detail) return;
    expect(detail.entries).toHaveLength(1);
    expect(detail.entries[0].authorImageUrl).toBe("preset:star");
  });

  it("nextTurnImageUrl は次ターン者の User.image を反映する", async () => {
    const prisma = getPrisma();
    // a → b の順で作成。a が初回投稿済みなので、次ターンは b。
    const a = await makeUser(prisma, { image: "preset:heart" });
    const b = await makeUser(prisma, { image: "preset:plus" });
    const notebook = await makeNotebook(prisma, { owner: a, members: [b] });
    await makeEntry(prisma, { notebook, author: a });

    const detail = await getNotebookDetail(notebook.id, a.id);
    expect(detail).not.toBeNull();
    if (!detail) return;
    expect(detail.nextTurnUserId).toBe(b.id);
    expect(detail.nextTurnImageUrl).toBe("preset:plus");
  });

  it("image 未設定 (null) のときは imageUrl も null", async () => {
    const prisma = getPrisma();
    const user = await makeUser(prisma); // image 既定 null
    const notebook = await makeNotebook(prisma, { owner: user });
    await makeEntry(prisma, { notebook, author: user });

    const detail = await getNotebookDetail(notebook.id, user.id);
    expect(detail).not.toBeNull();
    if (!detail) return;
    expect(detail.members[0].imageUrl).toBeNull();
    expect(detail.entries[0].authorImageUrl).toBeNull();
  });

  it("entries[].title は付いていれば返り、未設定 entry は null で返る", async () => {
    const prisma = getPrisma();
    const author = await makeUser(prisma);
    const notebook = await makeNotebook(prisma, { owner: author });
    // title あり / なし (= 本番既存 entry の挙動) の両方を検証する。
    await makeEntry(prisma, {
      notebook,
      author,
      title: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    await makeEntry(prisma, {
      notebook,
      author,
      title: "きょうの にっき",
      createdAt: new Date("2026-01-02T00:00:00Z"),
    });

    const detail = await getNotebookDetail(notebook.id, author.id);
    expect(detail).not.toBeNull();
    if (!detail) return;
    // 一覧は新しい順 → [0] が title 付き、[1] が title=null。
    expect(detail.entries[0].title).toBe("きょうの にっき");
    expect(detail.entries[1].title).toBeNull();
  });
});
