import { FloatingCutie } from "@/components/ui/FloatingCutie";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sparkle } from "@/components/ui/Sparkle";

export function OutroSection() {
  return (
    <section
      className="landing-section relative py-32 text-center"
      data-testid="lp-outro"
    >
      <FloatingCutie
        kind="heart"
        x="10%"
        y="20%"
        size={70}
        rotate={-8}
        color="var(--accent-b)"
      />
      <FloatingCutie
        kind="bow"
        x="84%"
        y="66%"
        size={75}
        rotate={10}
        delay="0.8s"
      />
      <Sparkle style={{ top: 30, left: "22%" }} />
      <Sparkle style={{ bottom: 40, right: "22%" }} delay={0.8} />
      <Sparkle style={{ top: "50%", left: "12%" }} delay={1.4} />
      <Sparkle style={{ top: "40%", right: "16%" }} delay={0.4} />
      <div className="mx-auto max-w-md px-6">
        <p className="text-ink font-[family-name:var(--font-mochi)] text-3xl">
          はじめよう。
        </p>
        <p className="text-ink-soft mt-4 font-[family-name:var(--font-hand)] text-2xl">
          ふたりの こうかん にっき ♡
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <PuffButton href="/auth/signin">♡ あそびに いく</PuffButton>
          <PuffButton variant="alt" href="/auth/signin">
            ★ にっき よむ
          </PuffButton>
        </div>
        <p className="text-ink-soft mt-10 font-[family-name:var(--font-pixel)] text-[10px] tracking-widest uppercase">
          kokan-nikki ・ dreamy pixel
        </p>
      </div>
    </section>
  );
}
