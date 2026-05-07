import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CardAdd } from "@/app/notebooks/_components/CardAdd";
import { Composer } from "@/app/notebooks/_components/Composer";
import {
  Diamond,
  FlowerGlyph,
  HeartGlyph,
  StarSparkle,
  StickerByKind,
} from "@/app/notebooks/_components/Glyphs";
import {
  buildPreview,
  formatJpDateTime,
  formatPartnerLabel,
  isFreshNotebook,
  pickCoverPalette,
  pickStickers,
  pickTapeStripe,
} from "@/app/notebooks/_lib/cover";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { auth } from "@/lib/auth";
import { TWEAK_COOKIES, parseTweak } from "@/lib/palette";
import { prisma } from "@/lib/prisma";
import { getNextTurnUserId } from "@/lib/turn";

import styles from "./notebooks.module.css";

// F-NB-04: 自分が参加しているノート一覧。リデザインでは表紙風の Diary card を
// 並べる。色 / シール / マステは notebook.id をハッシュした決定的レイアウト。

export default async function NotebooksPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/auth/signin?callbackUrl=/notebooks");
  }
  if (!session.user?.name || session.user.name.trim().length === 0) {
    redirect("/onboarding/name?callbackUrl=/notebooks");
  }

  // #92: Tweaks panel の cookie を SSR で読み、tape / stickers の描画を gate する。
  // sparkle は client 側 (Composer) で必要なので prop で渡す。pageFlip は <html>
  // data 属性側で持ち回り、#91 の overlay が読む想定。
  const cookieStore = await cookies();
  const tweaksTape = parseTweak(
    "tape",
    cookieStore.get(TWEAK_COOKIES.tape)?.value,
  );
  const tweaksStickers = parseTweak(
    "stickers",
    cookieStore.get(TWEAK_COOKIES.stickers)?.value,
  );
  const tweaksSparkle = parseTweak(
    "sparkle",
    cookieStore.get(TWEAK_COOKIES.sparkle)?.value,
  );

  // memberships は user 視点の通し番号 (= joinedAt ASC の配列 index+1) で No.XX
  // タグを出すため、ここでは orderIndex は引かない (notebook 内のメンバー順は
  // 別概念で、自作ノートだと常に 0 になり No.01 で固まる)。
  // entries は最新 1 件 (createdAt + body + authorId) を fetch しプレビューに使う。
  const memberships = await prisma.notebookMember.findMany({
    where: { userId },
    select: {
      joinedAt: true,
      notebook: {
        select: {
          id: true,
          name: true,
          color: true,
          createdAt: true,
          entries: {
            select: { createdAt: true, body: true },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 1,
          },
          members: {
            where: { userId: { not: userId } },
            select: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const items = await Promise.all(
    memberships.map(async ({ notebook }, index) => {
      const lastEntry = notebook.entries[0];
      const lastUpdatedAt = lastEntry?.createdAt ?? notebook.createdAt;
      const nextTurnUserId = await getNextTurnUserId(notebook.id);

      const partnerNames = notebook.members
        .map((m) => m.user.name?.trim())
        .filter((n): n is string => !!n && n.length > 0);
      const partnerLabel = formatPartnerLabel(partnerNames);

      const isYourTurn = nextTurnUserId === userId;
      let nextTurnLabel: string;
      let nextTurnImage: string | null = null;
      let nextTurnDisplayName = "";
      if (isYourTurn) {
        nextTurnLabel = "あなた ♡";
      } else if (nextTurnUserId) {
        const next = await prisma.user.findUnique({
          where: { id: nextTurnUserId },
          select: { name: true, image: true },
        });
        // F-AUTH-05: name 未設定 user (X 経由 + onboarding 未完了) の placeholder。
        const displayName = next?.name ?? "ななしさん";
        nextTurnLabel = `${displayName} のばん`;
        nextTurnImage = next?.image ?? null;
        nextTurnDisplayName = displayName;
      } else {
        nextTurnLabel = "—";
      }

      return {
        id: notebook.id,
        name: notebook.name,
        color: notebook.color,
        serialNo: index + 1,
        lastUpdatedAt,
        preview: buildPreview(lastEntry?.body),
        partnerLabel,
        nextTurnLabel,
        nextTurnImage,
        nextTurnDisplayName,
        isYourTurn,
        isNew: isFreshNotebook(notebook.createdAt),
      };
    }),
  );

  // フレンズリボン: 自分の参加ノート全体から自分以外の member 名を集めて重複除去。
  const friendNames = (() => {
    const seen = new Map<string, string>();
    for (const { notebook } of memberships) {
      for (const m of notebook.members) {
        const name = m.user.name?.trim();
        if (!name) continue;
        if (!seen.has(m.user.id)) seen.set(m.user.id, name);
      }
    }
    return Array.from(seen.values());
  })();

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <Link
          href="/settings"
          data-testid="nav-settings"
          className={styles.btnIcon}
          aria-label="せってい"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle
              cx="9"
              cy="9"
              r="2.5"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M9 1v2 M9 15v2 M1 9h2 M15 9h2 M3 3l1.4 1.4 M13.6 13.6 L15 15 M3 15l1.4-1.4 M13.6 4.4 L15 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </div>

      <header className={styles.hero}>
        <span className={styles.heroEyebrow}>★ MY SECRET DIARIES ★</span>
        <h1 className={styles.heroTitle}>
          <span className={styles.heroHeart}>♡</span> にっき いちらん
        </h1>
        <p className={styles.heroSubtitle}>
          {items.length} さつ の{" "}
          <span className={styles.heroSubtitleMark}>
            ひみつ の こうかんにっき
          </span>
          、ぜんぶ ここに ♡
        </p>
        <span className={`${styles.heroGlyph} ${styles.heroGlyphG1}`}>
          <StarSparkle size={28} />
        </span>
        <span className={`${styles.heroGlyph} ${styles.heroGlyphG2}`}>
          <HeartGlyph size={24} color="#ff3aa9" />
        </span>
        <span className={`${styles.heroGlyph} ${styles.heroGlyphG3}`}>
          <Diamond size={20} />
        </span>
        <span className={`${styles.heroGlyph} ${styles.heroGlyphG4}`}>
          <FlowerGlyph size={28} />
        </span>
      </header>

      <Composer sparkleEnabled={tweaksSparkle} />

      {items.length === 0 ? (
        <p className={styles.emptyCard}>
          まだ にっきが ないよ。
          <br />
          さいしょの 1 さつを つくってみよう ♡
        </p>
      ) : (
        <>
          <div className={styles.listHead}>
            <h2 className={styles.listTitle}>
              ぜんぶの にっき
              <span className={styles.listBadge}>{items.length}</span>
            </h2>
          </div>

          <ul className={styles.cards}>
            {items.map((item) => {
              const palette = pickCoverPalette(item.id, item.color);
              const tapeStripe = pickTapeStripe(item.id);
              const stickers = pickStickers(item.id);
              return (
                <li key={item.id}>
                  <Link
                    href={`/notebooks/${item.id}`}
                    className={styles.cardLink}
                  >
                    {item.isNew && (
                      <div className={styles.newBadge}>
                        <span
                          className={styles.newBadgeRing}
                          aria-hidden="true"
                        />
                        NEW!
                      </div>
                    )}
                    {tweaksTape && (
                      <span
                        className={`${styles.cardTape} ${
                          tapeStripe ? styles.cardTapeStripe : ""
                        }`}
                        style={
                          {
                            "--tape-color": palette.tape,
                            "--tape-r": palette.tapeR,
                          } as React.CSSProperties
                        }
                        aria-hidden="true"
                      />
                    )}
                    <div
                      className={styles.cardCover}
                      style={
                        {
                          "--cover": palette.c1,
                          "--cover-2": palette.c2,
                        } as React.CSSProperties
                      }
                    >
                      <span className={styles.cardSpine} aria-hidden="true" />
                      {tweaksStickers && (
                        <div
                          className={styles.cardStickers}
                          aria-hidden="true"
                        >
                          {stickers.map((s, i) => (
                            <div
                              key={`${item.id}-st-${i}`}
                              className={styles.cardSticker}
                              style={
                                {
                                  left: s.x,
                                  top: s.y,
                                  "--st-r": `${s.r}deg`,
                                } as React.CSSProperties
                              }
                            >
                              <StickerByKind
                                kind={s.kind}
                                size={s.size}
                                color={s.color}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className={styles.coverHead}>
                        <span className={styles.coverTag}>
                          No.{String(item.serialNo).padStart(2, "0")}
                        </span>
                        <span
                          className={styles.coverFav}
                          aria-hidden="true"
                        >
                          ♡
                        </span>
                      </div>
                      <div className={styles.coverTitleWrap}>
                        <h3 className={styles.coverTitle}>{item.name}</h3>
                        {item.preview && (
                          <p className={styles.coverPre}>『{item.preview}』</p>
                        )}
                      </div>
                      <div className={styles.coverFoot}>
                        <div className={styles.coverMeta}>
                          <span className={styles.coverMetaKey}>
                            SAISHU KOSHIN
                          </span>
                          <span className={styles.coverMetaVal}>
                            {formatJpDateTime(item.lastUpdatedAt)}
                          </span>
                          {item.partnerLabel && (
                            <span className={styles.coverMetaKey}>
                              with {item.partnerLabel}
                            </span>
                          )}
                        </div>
                        <span
                          className={`${styles.turnChip} ${
                            item.isYourTurn
                              ? styles.turnChipYou
                              : styles.turnChipThem
                          }`}
                        >
                          {item.isYourTurn ? (
                            <span
                              className={styles.turnChipAv}
                              aria-hidden="true"
                            />
                          ) : (
                            <UserAvatar
                              imageValue={item.nextTurnImage}
                              displayName={item.nextTurnDisplayName}
                              size="xs"
                            />
                          )}
                          {item.nextTurnLabel}
                          {item.isYourTurn && (
                            <span
                              className={styles.turnChipPulse}
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
            <li>
              <CardAdd />
            </li>
          </ul>
        </>
      )}

      {friendNames.length > 0 && (
        <div className={styles.friends}>
          <div className={styles.friendsTitle}>
            <HeartGlyph size={18} color="#ff3aa9" />
            こうかん ちゅうの ともだち
          </div>
          <div className={styles.friendStack}>
            {friendNames.slice(0, 6).map((name) => (
              <span key={name} className={styles.friend} aria-label={name}>
                {Array.from(name)[0] ?? "?"}
              </span>
            ))}
            {friendNames.length > 6 && (
              <span className={styles.friend}>+{friendNames.length - 6}</span>
            )}
          </div>
          <div className={styles.friendsCta}>
            あたらしい ともだちと はじめる ♡
          </div>
        </div>
      )}
    </main>
  );
}
