import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

type MarqueeProps = {
  items: ReactNode[];
  /** Background of the strip. */
  bg?: string;
  /** Tilt angle, in degrees. */
  tilt?: number;
  /** Animation duration in seconds. Smaller = faster. */
  durationSec?: number;
  className?: string;
};

export function Marquee({
  items,
  bg = "#fff",
  tilt = -1.4,
  durationSec = 30,
  className,
}: MarqueeProps) {
  // Duplicate the strip so the @keyframes mar (translateX(0) → -50%) loop is seamless.
  const content = [...items, ...items];
  const sectionStyle: CSSProperties = {
    background: bg,
    transform: `rotate(${tilt}deg)`,
  };
  const stripStyle: CSSProperties = { animationDuration: `${durationSec}s` };
  return (
    <section
      aria-hidden
      className={cn(
        "border-ink relative overflow-hidden border-y-2",
        className,
      )}
      style={sectionStyle}
    >
      <div className="marquee" style={stripStyle}>
        <div className="flex min-w-max items-center gap-9 py-[18px]">
          {content.map((node, i) => (
            <span key={i} className="inline-flex items-center gap-4">
              {node}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
