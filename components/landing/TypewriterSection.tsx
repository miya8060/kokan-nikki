import { Sticker } from "@/components/ui/Sticker";

export function TypewriterSection() {
  return (
    <section
      className="landing-section py-24"
      data-testid="lp-typewriter"
    >
      <div className="mx-auto max-w-2xl px-6">
        <Sticker className="p-10 text-center">
          <p className="text-ink-soft font-[family-name:var(--font-pixel)] text-xs tracking-wider uppercase">
            today&apos;s diary
          </p>
          <p className="text-ink mt-4 font-[family-name:var(--font-mochi)] text-xl leading-relaxed">
            きょうのこと、
            <br />
            すこしだけ おしえて。
          </p>
        </Sticker>
      </div>
    </section>
  );
}
