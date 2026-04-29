import { Sticker } from "@/components/ui/Sticker";

export function PhotoStackSection() {
  return (
    <section
      className="landing-section py-20"
      data-testid="lp-photostack"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-center px-6">
        <Sticker className="rotate-[-3deg] p-8 text-center">
          <p className="font-[family-name:var(--font-mochi)] text-lg">
            きょうの いちまい
          </p>
        </Sticker>
      </div>
    </section>
  );
}
