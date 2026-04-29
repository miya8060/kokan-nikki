import type { CSSProperties } from "react";

import { Sticker } from "@/components/ui/Sticker";
import { cn } from "@/lib/cn";

const LINES: { text: string; delay: number; dur: number }[] = [
  { text: "きょうのこと、", delay: 0.3, dur: 1.6 },
  { text: "すこしだけ おしえて。", delay: 2.0, dur: 2.2 },
];

export function TypewriterSection() {
  return (
    <section className="landing-section py-24" data-testid="lp-typewriter">
      <div className="mx-auto max-w-2xl px-6">
        <Sticker className="p-10">
          <p className="text-ink-soft text-center font-[family-name:var(--font-pixel)] text-xs tracking-wider uppercase">
            today&apos;s diary
          </p>
          <div className="text-ink mt-6 text-center font-[family-name:var(--font-mochi)] text-xl leading-loose">
            {LINES.map((line, i) => {
              const isLast = i === LINES.length - 1;
              const style: CSSProperties = {
                ["--dur" as string]: `${line.dur}s`,
                ["--delay" as string]: `${line.delay}s`,
              };
              return (
                <div key={i}>
                  <span
                    className={cn("typewriter", isLast && "typewriter-caret")}
                    style={style}
                  >
                    {line.text}
                  </span>
                </div>
              );
            })}
          </div>
        </Sticker>
      </div>
    </section>
  );
}
