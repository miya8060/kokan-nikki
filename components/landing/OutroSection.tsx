import { PuffButton } from "@/components/ui/PuffButton";
import { Sparkle } from "@/components/ui/Sparkle";

export function OutroSection() {
  return (
    <section
      className="landing-section relative py-32 text-center"
      data-testid="lp-outro"
    >
      <Sparkle style={{ top: 20, left: "20%" }} />
      <Sparkle style={{ bottom: 30, right: "20%" }} delay={0.8} />
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
      </div>
    </section>
  );
}
