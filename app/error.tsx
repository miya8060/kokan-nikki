"use client";

import { useEffect } from "react";

import { FloatingCutie } from "@/components/ui/FloatingCutie";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sparkle } from "@/components/ui/Sparkle";
import { Sticker } from "@/components/ui/Sticker";

// `unstable_retry` is a framework-injected prop (Next.js 16.2+) that re-fetches
// and re-renders the error boundary's children. The Next.js TS plugin
// (rules/client-boundary.ts) only whitelists `reset` and `*Action` for function
// props on `"use client"` files, so declare the type via an interface to keep
// the diagnostic from firing on a known-good API.
interface RetryFn {
  (): void;
}

type ErrorPageProps = {
  error: Error & { digest?: string };
  unstable_retry: RetryFn;
};

export default function ErrorPage({ error, unstable_retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-20">
      <FloatingCutie kind="bow" x="10%" y="18%" size={110} rotate={-10} />
      <FloatingCutie
        kind="heart"
        x="84%"
        y="22%"
        size={100}
        rotate={14}
        delay="0.6s"
        color="var(--lav)"
      />
      <FloatingCutie
        kind="plus"
        x="14%"
        y="72%"
        size={120}
        rotate={6}
        delay="0.3s"
        color="var(--lemon)"
      />

      <Sticker tape className="relative max-w-xl p-8 text-center sm:p-14">
        <Sparkle style={{ top: 24, right: 24 }} delay={0} />
        <Sparkle style={{ bottom: 28, left: 28 }} delay={1} />

        <p className="text-ink-soft font-[family-name:var(--font-pixel)] text-sm tracking-wider uppercase">
          oops something broke
        </p>
        <h1 className="text-ink mt-4 font-[family-name:var(--font-mochi)] text-4xl sm:text-5xl">
          ちょっと まよっちゃった
        </h1>
        <p className="text-pink-2 mt-5 font-[family-name:var(--font-hand)] text-3xl">
          try again ♡
        </p>

        <p className="text-ink-soft mt-7 text-base leading-7">
          うまく ひらけなかったよ。
          <br />
          もういちど ためしてみてね。
        </p>

        {error.digest ? (
          <p className="text-ink-soft mt-4 font-[family-name:var(--font-pixel)] text-xs tracking-wider opacity-70">
            ref: {error.digest}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <PuffButton
            className="px-9 py-5 text-base"
            onClick={() => unstable_retry()}
          >
            ♡ もういちど ためす
          </PuffButton>
          <PuffButton
            className="px-9 py-5 text-base"
            variant="alt"
            href="/"
          >
            ★ トップに もどる
          </PuffButton>
        </div>
      </Sticker>
    </main>
  );
}
