import { FloatingCutie } from "@/components/ui/FloatingCutie";
import { Sparkle } from "@/components/ui/Sparkle";
import { Sticker } from "@/components/ui/Sticker";
import { Tag } from "@/components/ui/Tag";

export function MessageSection() {
  return (
    <section
      className="landing-section relative py-24"
      data-testid="lp-message"
    >
      <FloatingCutie
        kind="cloud"
        x="6%"
        y="14%"
        size={80}
        rotate={-6}
        delay="0.4s"
      />
      <FloatingCutie
        kind="star"
        x="86%"
        y="64%"
        size={60}
        rotate={12}
        delay="1.0s"
        color="var(--accent-c)"
      />
      <div className="mx-auto max-w-xl px-6">
        <Sticker tape className="relative p-10 text-center">
          <Sparkle style={{ top: 14, right: 18 }} />
          <Sparkle style={{ bottom: 18, left: 22 }} delay={0.7} />
          <p className="text-ink-soft font-[family-name:var(--font-pixel)] text-xs tracking-wider uppercase">
            from kokan-nikki
          </p>
          <p className="text-ink mt-4 font-[family-name:var(--font-mochi)] text-2xl leading-relaxed">
            すきな ひとと、
            <br />
            すきな ペースで。
          </p>
          <p className="text-ink-soft mt-4 font-[family-name:var(--font-hand)] text-2xl">
            no rush, just kawaii.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Tag>♡ slow</Tag>
            <Tag style={{ background: "var(--accent-a-soft)" }}>★ steady</Tag>
            <Tag style={{ background: "var(--lemon)" }}>✿ together</Tag>
          </div>
        </Sticker>
      </div>
    </section>
  );
}
