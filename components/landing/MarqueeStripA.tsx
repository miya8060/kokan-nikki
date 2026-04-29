import { Marquee } from "@/components/ui/Marquee";

export function MarqueeStripA() {
  return (
    <div className="landing-section" data-testid="lp-marquee-a">
      <Marquee
        bg="#fff"
        items={[
          <span
            key="a"
            className="font-[family-name:var(--font-mochi)] text-3xl"
          >
            DREAMY ♡ PIXEL
          </span>,
          <span
            key="b"
            className="text-pink-2 font-[family-name:var(--font-mochi)] text-3xl"
          >
            こうかん にっき
          </span>,
          <span
            key="c"
            className="text-mint font-[family-name:var(--font-mochi)] text-3xl"
          >
            ♡ kawaii broadcast ♡
          </span>,
        ]}
      />
    </div>
  );
}
