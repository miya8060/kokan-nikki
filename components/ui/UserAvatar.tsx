import { Dot, Heart, Plus, Star } from "@/components/icons";
import { cn } from "@/lib/cn";
import { type IconPresetKey, parsePresetKey } from "@/lib/icons/presets";

// F-USER-02: アイコン表示の単一窓口。
// imageValue は User.image (Auth.js v5 標準カラム) の生値。
// "preset:KEY" として解釈できればその SVG を、解釈できない / null ならば
// デフォルトアイコン (薄いグレーの Dot) を出す。
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
  const presetKey = parsePresetKey(imageValue);
  const px = SIZE_PX[size];
  return (
    <span
      role="img"
      aria-label={`${displayName} の アイコン`}
      data-testid="user-avatar"
      data-preset={presetKey ?? "default"}
      className={cn(
        "border-ink inline-flex shrink-0 items-center justify-center rounded-full border-2 bg-white p-1 shadow-[0_2px_0_var(--ink)]",
        className,
      )}
      style={{ width: px, height: px }}
    >
      {presetKey ? PRESET_RENDERERS[presetKey]() : <Dot color={DEFAULT_FILL} />}
    </span>
  );
}
