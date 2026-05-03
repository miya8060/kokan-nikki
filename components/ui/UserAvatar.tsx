import { Dot, Heart, Plus, Star } from "@/components/icons";
import { cn } from "@/lib/cn";
import { type IconPresetKey, parseIconValue } from "@/lib/icons/presets";

// F-USER-02 / F-USER-03: アイコン表示の単一窓口。
// imageValue は User.image (Auth.js v5 標準カラム) の生値で、3 種に分かれる:
//   - "preset:KEY"  → 対応する SVG を描画
//   - "https://…"   → アップロード画像。<img> でそのまま描画 (Vercel Blob 等)
//   - null / 未知   → デフォルトアイコン (薄いグレーの Dot)
// displayName は a11y のラベルにのみ使う (頭文字描画はしない / kawaii 世界観
// 優先で図形のみ)。

type Size = "sm" | "md";

const SIZE_PX: Record<Size, number> = {
  sm: 24,
  md: 36,
};

const PRESET_RENDERERS: Record<IconPresetKey, () => React.ReactElement> = {
  heart: () => <Heart />,
  star: () => <Star />,
  plus: () => <Plus />,
  dot: () => <Dot />,
};

const DEFAULT_FILL = "#e8e3ef";

type UserAvatarProps = {
  imageValue: string | null;
  displayName: string;
  size?: Size;
  className?: string;
};

export function UserAvatar({
  imageValue,
  displayName,
  size = "sm",
  className,
}: UserAvatarProps) {
  const value = parseIconValue(imageValue);
  const px = SIZE_PX[size];
  // <img> 自体は alt="" で装飾扱い。a11y ラベルは外側の role="img" + aria-label
  // が一括で持つ (二重読み上げ回避)。アップロード画像は p-1 を取り除いて枠
  // いっぱいに表示するため、別途 cover / rounded-full を付ける。
  return (
    <span
      role="img"
      aria-label={`${displayName} の アイコン`}
      data-testid="user-avatar"
      data-preset={value.kind === "preset" ? value.key : value.kind}
      className={cn(
        "border-ink inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-white shadow-[0_2px_0_var(--ink)]",
        value.kind === "url" ? "p-0" : "p-1",
        className,
      )}
      style={{ width: px, height: px }}
    >
      {value.kind === "preset" ? (
        PRESET_RENDERERS[value.key]()
      ) : value.kind === "url" ? (
        // eslint-disable-next-line @next/next/no-img-element -- Vercel Blob の任意ドメインを next/image で扱うと remotePatterns 設定が必要になるため、当面は素の <img> で表示する
        <img
          src={value.url}
          alt=""
          width={px}
          height={px}
          className="h-full w-full object-cover"
        />
      ) : (
        <Dot color={DEFAULT_FILL} />
      )}
    </span>
  );
}
