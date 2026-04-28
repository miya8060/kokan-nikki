import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { color?: string };

const STROKE = "#4b2c5e";

export function Heart({ color = "#ff8fbf", ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 22" width="100%" height="100%" {...rest}>
      <path
        d="M12 20 C 4 14, 1 9, 4 5 C 7 1, 11 3, 12 6 C 13 3, 17 1, 20 5 C 23 9, 20 14, 12 20 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Star({ color = "#ffd56b", ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" {...rest}>
      <path
        d="M12 2 L14 9 L22 10 L16 15 L18 22 L12 18 L6 22 L8 15 L2 10 L10 9 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Plus({ color = "#5cd6a8", ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" {...rest}>
      <path
        d="M10 2 H14 V10 H22 V14 H14 V22 H10 V14 H2 V10 H10 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Dot({ color = "#b59cff", ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" {...rest}>
      <circle
        cx="12"
        cy="12"
        r="8"
        fill={color}
        stroke={STROKE}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function BigHeart({ color = "#ff8fbf", ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 100 92" width="100%" height="100%" {...rest}>
      <path
        d="M50 86 C 14 60, 4 38, 14 22 C 24 6, 42 10, 50 26 C 58 10, 76 6, 86 22 C 96 38, 86 60, 50 86 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="36" r="6" fill="#fff" opacity="0.7" />
      <circle cx="42" cy="32" r="3" fill="#fff" opacity="0.9" />
    </svg>
  );
}

export function BigStar({ color = "#ffd56b", ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" {...rest}>
      <path
        d="M50 6 L60 38 L94 42 L68 64 L76 96 L50 78 L24 96 L32 64 L6 42 L40 38 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="42" cy="40" r="5" fill="#fff" opacity="0.7" />
    </svg>
  );
}

export function BigBow({ color = "#5cd6a8", ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 110 70" width="100%" height="100%" {...rest}>
      <path
        d="M55 35 L20 12 Q4 12 8 35 Q4 58 20 58 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M55 35 L90 12 Q106 12 102 35 Q106 58 90 58 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse
        cx="55"
        cy="35"
        rx="9"
        ry="11"
        fill={color}
        stroke={STROKE}
        strokeWidth="3"
      />
    </svg>
  );
}

export function BigPlus({ color = "#5cd6a8", ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" {...rest}>
      <path
        d="M30 6 H50 V30 H74 V50 H50 V74 H30 V50 H6 V30 H30 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BigCloud({ color = "#d4f1ff", ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 130 80" width="100%" height="100%" {...rest}>
      <path
        d="M30 60 Q10 60 14 42 Q14 26 32 26 Q40 12 60 16 Q76 6 90 22 Q112 22 110 44 Q120 60 100 64 Z"
        fill={color}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="46" cy="40" r="4" fill={STROKE} />
      <circle cx="76" cy="40" r="4" fill={STROKE} />
      <path
        d="M50 50 Q60 58 72 50"
        stroke={STROKE}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="38" cy="52" rx="5" ry="3" fill="#ff8fbf" opacity=".6" />
      <ellipse cx="84" cy="52" rx="5" ry="3" fill="#ff8fbf" opacity=".6" />
    </svg>
  );
}
