import {
  HeartGlyph,
  Rainbow,
  StarSparkle,
  StickerByKind,
} from "@/app/notebooks/_components/Glyphs";
import {
  pickCoverPalette,
  pickStickers,
  pickTapeStripe,
} from "@/app/notebooks/_lib/cover";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { NotebookDetail } from "@/lib/notebooks";

import styles from "../notebook-detail.module.css";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  // C-04: 表示は Asia/Tokyo、内部は UTC のまま。
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type Props = {
  notebook: NotebookDetail;
  // ノートの通し番号 (= viewer 視点での joinedAt 順 index+1)。No.XX 表示用。
  serialNo: number;
};

export function DiaryHero({ notebook, serialNo }: Props) {
  const palette = pickCoverPalette(notebook.id, notebook.color);
  const stickers = pickStickers(notebook.id);
  const tapeStripe = pickTapeStripe(notebook.id);
  const a = notebook.members[0];
  const b = notebook.members[1];
  const since = dateFormatter.format(notebook.createdAt).replace(/-/g, "/");
  const totalPages = notebook.entries.length;

  return (
    <section className={styles.hero} aria-labelledby="d-hero-title">
      <div
        className={styles.coverCard}
        style={
          {
            "--cover": palette.c1,
            "--cover-2": palette.c2,
          } as React.CSSProperties
        }
      >
        <span
          className={styles.coverTape}
          style={
            {
              background: tapeStripe ? undefined : palette.tape,
            } as React.CSSProperties
          }
          aria-hidden="true"
        />
        <span className={styles.coverSpine} aria-hidden="true" />

        <div className={styles.coverStickers} aria-hidden="true">
          {stickers.map((s, i) => (
            <div
              key={`${notebook.id}-st-${i}`}
              className={styles.coverSticker}
              style={
                {
                  left: s.x,
                  top: s.y,
                  "--st-r": `${s.r}deg`,
                } as React.CSSProperties
              }
            >
              <StickerByKind kind={s.kind} size={s.size} color={s.color} />
            </div>
          ))}
        </div>

        <div className={styles.coverMeta}>
          <span className={styles.coverTag}>
            No.{String(serialNo).padStart(2, "0")} ・ {totalPages}ページ
          </span>
        </div>

        <h1 id="d-hero-title" className={styles.coverTitle}>
          {notebook.name}
        </h1>

        <div className={styles.coverFoot}>
          <div className={styles.coverPair}>
            {a && (
              <UserAvatar
                imageValue={a.imageUrl}
                displayName={a.displayName}
                size="md"
                className={styles.heroAvatarRing}
              />
            )}
            {b && (
              <>
                <span className={styles.coverAmp} aria-hidden="true">
                  ×
                </span>
                <UserAvatar
                  imageValue={b.imageUrl}
                  displayName={b.displayName}
                  size="md"
                  className={styles.heroAvatarRing}
                />
              </>
            )}
          </div>
          <div className={styles.coverSince}>
            <span className={styles.coverSinceKey}>SINCE</span>
            <span className={styles.coverSinceVal}>{since}</span>
          </div>
        </div>
      </div>

      <span className={`${styles.heroGlyph} ${styles.heroGlyphG1}`}>
        <StarSparkle size={28} />
      </span>
      <span className={`${styles.heroGlyph} ${styles.heroGlyphG2}`}>
        <HeartGlyph size={22} color="#ff3aa9" />
      </span>
      <span className={`${styles.heroGlyph} ${styles.heroGlyphG3}`}>
        <Rainbow size={56} />
      </span>
    </section>
  );
}
