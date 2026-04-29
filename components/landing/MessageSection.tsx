import { Sticker } from "@/components/ui/Sticker";

export function MessageSection() {
  return (
    <section
      className="landing-section py-24"
      data-testid="lp-message"
    >
      <div className="mx-auto max-w-xl px-6">
        <Sticker tape className="p-10 text-center">
          <p className="text-ink-soft font-[family-name:var(--font-pixel)] text-xs tracking-wider uppercase">
            from kokan-nikki
          </p>
          <p className="text-ink mt-4 font-[family-name:var(--font-mochi)] text-2xl leading-relaxed">
            すきな ひとと、
            <br />
            すきな ペースで。
          </p>
        </Sticker>
      </div>
    </section>
  );
}
