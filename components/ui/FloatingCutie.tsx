import type { CSSProperties } from "react";
import {
  BigBow,
  BigCloud,
  BigHeart,
  BigPlus,
  BigStar,
} from "@/components/icons";

type Kind = "heart" | "star" | "bow" | "plus" | "cloud";

type FloatingCutieProps = {
  kind: Kind;
  /** Top-left position (CSS length, e.g. "8%" or "120px"). */
  x: string;
  y: string;
  size: number;
  /** Base rotation in degrees; the float keyframe wobbles +6deg over base. */
  rotate?: number;
  delay?: string;
  color?: string;
};

const KIND_MAP = {
  heart: BigHeart,
  star: BigStar,
  bow: BigBow,
  plus: BigPlus,
  cloud: BigCloud,
} as const;

export function FloatingCutie({
  kind,
  x,
  y,
  size,
  rotate = 0,
  delay = "0s",
  color,
}: FloatingCutieProps) {
  const Icon = KIND_MAP[kind];
  const style: CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width: size,
    height: size,
    animation: `float 4s ease-in-out ${delay} infinite`,
    // CSS variable consumed by the `float` keyframe (see globals.css).
    ["--r" as string]: `${rotate}deg`,
  };
  return (
    <div aria-hidden className="cutie-float" style={style}>
      <Icon color={color} />
    </div>
  );
}
