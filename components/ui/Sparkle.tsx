import type { CSSProperties } from "react";

type SparkleProps = {
  size?: number;
  delay?: number;
  duration?: number;
  style?: CSSProperties;
  className?: string;
};

export function Sparkle({
  size = 14,
  delay = 0,
  duration = 2.4,
  style,
  className,
}: SparkleProps) {
  return (
    <span
      aria-hidden
      className={`sparkle ${className ?? ""}`}
      style={{
        ...style,
        width: size,
        height: size,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}
