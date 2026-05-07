import type { Metadata } from "next";

import { FloatingCutie } from "@/components/ui/FloatingCutie";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sparkle } from "@/components/ui/Sparkle";
import { Sticker } from "@/components/ui/Sticker";

export const metadata: Metadata = {
  title: "みつからない ─ kokan-nikki",
  description: "そのページは みつからなかったよ。",
};

export default function NotFound() {
  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-20">
      <FloatingCutie kind="heart" x="10%" y="18%" size={110} rotate={-12} />
      <FloatingCutie
        kind="star"
        x="84%"
        y="22%"
        size={100}
        rotate={14}
        delay="0.6s"
        color="var(--lemon)"
      />
      <FloatingCutie
        kind="cloud"
        x="14%"
        y="72%"
        size={120}
        rotate={6}
        delay="0.3s"
      />

      <Sticker tape className="relative max-w-xl p-8 text-center sm:p-14">
        <Sparkle style={{ top: 24, right: 24 }} delay={0} />
        <Sparkle style={{ bottom: 28, left: 28 }} delay={1} />

        <p className="text-ink-soft font-[family-name:var(--font-pixel)] text-sm tracking-wider uppercase">
          404 not found
        </p>
        <h1 className="text-ink mt-4 font-[family-name:var(--font-mochi)] text-4xl sm:text-5xl">
          みつからない
        </h1>
        <p className="text-pink-2 mt-5 font-[family-name:var(--font-hand)] text-3xl">
          oops ♡
        </p>

        <p className="text-ink-soft mt-7 text-base leading-7">
          そのページは おひっこし したか、
          <br />
          もとから なかったみたい。
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <PuffButton className="px-9 py-5 text-base" href="/">
            ♡ トップに もどる
          </PuffButton>
          <PuffButton
            className="px-9 py-5 text-base"
            variant="alt"
            href="/notebooks"
          >
            ★ にっき よむ
          </PuffButton>
        </div>
      </Sticker>
    </main>
  );
}
