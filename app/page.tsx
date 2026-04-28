import { redirect } from "next/navigation";

import { FloatingCutie } from "@/components/ui/FloatingCutie";
import { HeartCursor } from "@/components/ui/HeartCursor";
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
      <HeartCursor />

      <Marquee
        items={[
          <span
            key="a"
            className="font-[family-name:var(--font-mochi)] text-3xl"
          >
            DREAMY ♡ PIXEL
          </span>,
          <span
            key="b"
            className="text-pink-2 font-[family-name:var(--font-mochi)] text-3xl"
          >
            こうかん にっき
          </span>,
          <span
            key="c"
            className="text-mint font-[family-name:var(--font-mochi)] text-3xl"
          >
            ♡ kawaii broadcast ♡
          </span>,
        ]}
        bg="#fff"
      />

      <main className="relative flex flex-1 items-center justify-center px-6 py-32">
        <FloatingCutie kind="heart" x="8%" y="20%" size={90} rotate={-12} />
        <FloatingCutie
          kind="star"
          x="86%"
          y="18%"
          size={80}
          rotate={14}
          delay="0.6s"
          color="var(--lemon)"
        />
        <FloatingCutie
          kind="bow"
          x="12%"
          y="74%"
          size={100}
          rotate={8}
          delay="0.3s"
        />

        <Sticker tape className="relative max-w-md p-10 text-center">
          <Sparkle style={{ top: 20, right: 20 }} delay={0} />
          <Sparkle style={{ bottom: 24, left: 24 }} delay={1} />

          <p className="text-ink-soft font-[family-name:var(--font-pixel)] text-xs tracking-wider uppercase">
            kokan-nikki
          </p>
          <h1 className="text-ink mt-3 font-[family-name:var(--font-mochi)] text-4xl">
            こうかん にっき
          </h1>
          <p className="text-pink-2 mt-4 font-[family-name:var(--font-hand)] text-2xl">
            dreamy pixel ♡
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Tag>♡ cute</Tag>
            <Tag style={{ background: "var(--lemon)" }}>★ is</Tag>
            <Tag style={{ background: "var(--mint-2)" }}>✿ justice</Tag>
          </div>

          <p className="text-ink-soft mt-6 text-sm leading-7">
            UI プリミティブが揃った。次は Docker + Prisma で
            データレイヤーを敷く。
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <PuffButton href="/auth/signin">♡ あそびに いく</PuffButton>
            <PuffButton variant="alt" href="/notebooks">
              ★ にっき よむ
            </PuffButton>
          </div>
        </Sticker>
      </main>
    </>
  );
}
