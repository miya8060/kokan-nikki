import { redirect } from "next/navigation";

import { FloatingCutie } from "@/components/ui/FloatingCutie";
import { Marquee } from "@/components/ui/Marquee";
import { PuffButton } from "@/components/ui/PuffButton";
import { Sparkle } from "@/components/ui/Sparkle";
import { Sticker } from "@/components/ui/Sticker";
import { Tag } from "@/components/ui/Tag";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/notebooks");
  }

  return (
    <>
      <Marquee
        items={[
          <span
            key="a"
            className="font-[family-name:var(--font-mochi)] text-5xl"
          >
            DREAMY ♡ PIXEL
          </span>,
          <span
            key="b"
            className="text-pink-2 font-[family-name:var(--font-mochi)] text-5xl"
          >
            こうかん にっき
          </span>,
          <span
            key="c"
            className="text-mint font-[family-name:var(--font-mochi)] text-5xl"
          >
            ♡ kawaii broadcast ♡
          </span>,
        ]}
        bg="#fff"
        className="mt-10"
      />

      <main className="relative flex flex-1 items-center justify-center px-6 pt-12 pb-24">
        <FloatingCutie kind="heart" x="8%" y="20%" size={120} rotate={-12} />
        <FloatingCutie
          kind="star"
          x="86%"
          y="18%"
          size={110}
          rotate={14}
          delay="0.6s"
          color="var(--lemon)"
        />
        <FloatingCutie
          kind="bow"
          x="12%"
          y="74%"
          size={130}
          rotate={8}
          delay="0.3s"
        />

        <Sticker tape className="relative max-w-xl p-8 text-center sm:p-14">
          <Sparkle style={{ top: 24, right: 24 }} delay={0} />
          <Sparkle style={{ bottom: 28, left: 28 }} delay={1} />

          <p className="text-ink-soft font-[family-name:var(--font-pixel)] text-sm tracking-wider uppercase">
            kokan-nikki
          </p>
          <h1 className="text-ink mt-4 font-[family-name:var(--font-mochi)] text-4xl whitespace-nowrap sm:text-5xl">
            こうかん にっき
          </h1>
          <p className="text-pink-2 mt-5 font-[family-name:var(--font-hand)] text-3xl">
            dreamy pixel ♡
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Tag className="px-4 py-1.5 text-sm">♡ cute</Tag>
            <Tag
              className="px-4 py-1.5 text-sm"
              style={{ background: "var(--lemon)" }}
            >
              ★ is
            </Tag>
            <Tag
              className="px-4 py-1.5 text-sm"
              style={{ background: "var(--mint-2)" }}
            >
              ✿ justice
            </Tag>
          </div>

          <p className="text-ink-soft mt-7 text-base leading-7">
            きょうの きもちを、ともだちと そっと わけあう。
            <br />
            まずは おなまえを おしえてね ♡
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <PuffButton className="px-9 py-5 text-base" href="/auth/signin">
              ♡ あそびに いく
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
    </>
  );
}
