import type { ComponentType } from "react";

import { BigBow, BigHeart, BigStar } from "@/components/icons";
import { Sparkle } from "@/components/ui/Sparkle";

type IconComp = ComponentType<{ color?: string }>;

const CARDS: {
  rotate: number;
  x: number;
  y: number;
  swatch: string;
  caption: string;
  Icon: IconComp;
}[] = [
  {
    rotate: -10,
    x: -110,
    y: 6,
    swatch: "var(--pink)",
    caption: "sun, march",
    Icon: BigHeart,
  },
  {
    rotate: 4,
    x: 0,
    y: -10,
    swatch: "var(--mint-2)",
    caption: "cafe break",
    Icon: BigStar,
  },
  {
    rotate: 10,
    x: 110,
    y: 4,
    swatch: "var(--lemon)",
    caption: "mai mai ♡",
    Icon: BigBow,
  },
];

export function PhotoStackSection() {
  return (
    <section className="landing-section py-24" data-testid="lp-photostack">
      <div className="mx-auto flex max-w-3xl items-center justify-center px-6">
        <div className="relative h-72 w-full max-w-md">
          {CARDS.map((c, i) => {
            const { Icon } = c;
            return (
              <div
                key={i}
                className="photo-card border-ink absolute top-1/2 left-1/2 w-40 border-2 bg-white p-2.5 shadow-[0_6px_0_var(--ink),0_12px_24px_rgba(44,94,68,0.15)]"
                style={{
                  transform: `translate(calc(-50% + ${c.x}px), calc(-50% + ${c.y}px)) rotate(${c.rotate}deg)`,
                  zIndex: i + 1,
                }}
              >
                <div
                  className="flex aspect-square w-full items-center justify-center"
                  style={{ background: c.swatch }}
                >
                  <div className="h-14 w-14">
                    <Icon />
                  </div>
                </div>
                <p className="text-ink mt-2 text-center font-[family-name:var(--font-hand)] text-lg">
                  {c.caption}
                </p>
                <Sparkle style={{ top: -8, right: -8 }} delay={i * 0.5} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
