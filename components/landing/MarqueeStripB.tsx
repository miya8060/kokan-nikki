import { Marquee } from "@/components/ui/Marquee";

export function MarqueeStripB() {
  return (
    <div className="landing-section" data-testid="lp-marquee-b">
      <Marquee
        tilt={1.4}
        bg="var(--lemon)"
        durationSec={36}
        items={[
          <span
            key="a"
            className="font-[family-name:var(--font-mochi)] text-3xl"
          >
            ♡ ノート を かこう ♡
          </span>,
          <span
            key="b"
            className="text-mint font-[family-name:var(--font-mochi)] text-3xl"
          >
            ★ おてがみ ぐるぐる ★
          </span>,
          <span
            key="c"
            className="text-pink-2 font-[family-name:var(--font-mochi)] text-3xl"
          >
            ✿ ふたり の リズム ✿
          </span>,
        ]}
      />
    </div>
  );
}
