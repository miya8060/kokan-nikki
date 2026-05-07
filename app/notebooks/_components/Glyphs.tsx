// handoff (components.jsx) から /notebooks リデザインで使う SVG だけ抜き出した
// 静的コレクション。pure React で、Server / Client どちらからも import 可能。

import type { StickerKind } from "@/app/notebooks/_lib/cover";

const INK = "#3a1f5d";

export function StarSparkle({
  size = 32,
  color = "#ffe066",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <path
        d="M20 2 L23 16 L37 19 L23 22 L20 36 L17 22 L3 19 L17 16 Z"
        fill={color}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="19" r="3" fill="#fff" stroke={INK} strokeWidth="1.5" />
    </svg>
  );
}

export function HeartGlyph({
  size = 32,
  color = "#ff6fa3",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <path
        d="M20 34 C 8 24, 4 18, 6 12 C 8 6, 16 6, 20 12 C 24 6, 32 6, 34 12 C 36 18, 32 24, 20 34 Z"
        fill={color}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <ellipse
        cx="14"
        cy="14"
        rx="2.5"
        ry="1.6"
        fill="#fff"
        opacity=".85"
        transform="rotate(-25 14 14)"
      />
    </svg>
  );
}

export function FlowerGlyph({
  size = 32,
  color = "#ffb070",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse
          key={deg}
          cx="20"
          cy="9"
          rx="5.5"
          ry="8"
          fill={color}
          stroke={INK}
          strokeWidth="2"
          transform={`rotate(${deg} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="5" fill="#fff" stroke={INK} strokeWidth="2" />
    </svg>
  );
}

export function Rainbow({ size = 50 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 60 32"
      width={size}
      height={(size * 32) / 60}
      aria-hidden="true"
    >
      <path d="M4 30 A 26 26 0 0 1 56 30" fill="none" stroke="#ff3aa9" strokeWidth="5" />
      <path d="M10 30 A 20 20 0 0 1 50 30" fill="none" stroke="#ffd400" strokeWidth="5" />
      <path d="M16 30 A 14 14 0 0 1 44 30" fill="none" stroke="#9bf5b8" strokeWidth="5" />
      <path d="M22 30 A 8 8 0 0 1 38 30" fill="none" stroke="#7ec9ff" strokeWidth="5" />
      <path d="M4 30 A 26 26 0 0 1 56 30" fill="none" stroke={INK} strokeWidth="2" />
    </svg>
  );
}

export function Ribbon({ size = 42 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 50 36"
      width={size}
      height={(size * 36) / 50}
      aria-hidden="true"
    >
      <path d="M25 20 L 8 8 L 8 28 Z" fill="#ff6fa3" stroke={INK} strokeWidth="2.2" />
      <path d="M25 20 L 42 8 L 42 28 Z" fill="#ff6fa3" stroke={INK} strokeWidth="2.2" />
      <circle cx="25" cy="20" r="6" fill="#ff3aa9" stroke={INK} strokeWidth="2.2" />
    </svg>
  );
}

export function Cassette({ size = 50 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 44"
      width={size}
      height={(size * 44) / 64}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="58" height="38" rx="6" fill="#b48bff" stroke={INK} strokeWidth="2.2" />
      <rect x="10" y="10" width="44" height="14" rx="3" fill="#fff" stroke={INK} strokeWidth="2" />
      <circle cx="22" cy="32" r="4" fill="#fff" stroke={INK} strokeWidth="2" />
      <circle cx="42" cy="32" r="4" fill="#fff" stroke={INK} strokeWidth="2" />
    </svg>
  );
}

export function PixelHeart({
  size = 30,
  color = "#ff3aa9",
}: {
  size?: number;
  color?: string;
}) {
  // 12x9 dot heart (handoff から 0..8 の y で描画)
  const pixels: ReadonlyArray<readonly [number, number]> = [
    [1, 0], [2, 0], [4, 0], [5, 0], [7, 0], [8, 0], [10, 0],
    [0, 1], [3, 1], [6, 1], [9, 1], [11, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],
    [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],
    [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],
    [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5],
    [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6],
    [4, 7], [5, 7], [6, 7], [7, 7],
    [5, 8], [6, 8],
  ];
  return (
    <svg
      viewBox="0 0 12 9"
      width={size}
      height={(size * 9) / 12}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {pixels.map(([x, y], i) => (
        <rect key={`${x}-${y}-${i}`} x={x} y={y} width="1" height="1" fill={color} />
      ))}
    </svg>
  );
}

export function SmileSticker({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="17" fill="#ffe066" stroke={INK} strokeWidth="2.5" />
      <circle cx="14" cy="17" r="2" fill={INK} />
      <circle cx="26" cy="17" r="2" fill={INK} />
      <path
        d="M12 24 Q 20 32 28 24"
        fill="none"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="11" cy="22" r="2" fill="#ff6fa3" opacity=".7" />
      <circle cx="29" cy="22" r="2" fill="#ff6fa3" opacity=".7" />
    </svg>
  );
}

export function Diamond({
  size = 26,
  color = "#7ec9ff",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 30 30" width={size} height={size} aria-hidden="true">
      <path
        d="M15 3 L 27 15 L 15 27 L 3 15 Z"
        fill={color}
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M15 3 L 19 12 L 15 9 L 11 12 Z" fill="#fff" opacity=".7" />
    </svg>
  );
}

export function StickerByKind({
  kind,
  size,
  color,
}: {
  kind: StickerKind;
  size: number;
  color?: string;
}) {
  switch (kind) {
    case "star":
      return <StarSparkle size={size} color={color} />;
    case "heart":
      return <HeartGlyph size={size} color={color} />;
    case "smile":
      return <SmileSticker size={size} />;
    case "ribbon":
      return <Ribbon size={size} />;
    case "rainbow":
      return <Rainbow size={size} />;
    case "flower":
      return <FlowerGlyph size={size} color={color} />;
    case "diamond":
      return <Diamond size={size} color={color} />;
    case "pixheart":
      return <PixelHeart size={size} color={color} />;
    case "cassette":
      return <Cassette size={size} />;
  }
}
