import { redirect } from "next/navigation";

import { BootSection } from "@/components/landing/BootSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { MarqueeStripA } from "@/components/landing/MarqueeStripA";
import { MarqueeStripB } from "@/components/landing/MarqueeStripB";
import { MessageSection } from "@/components/landing/MessageSection";
import { OutroSection } from "@/components/landing/OutroSection";
import { PhotoStackSection } from "@/components/landing/PhotoStackSection";
import { ScatterSection } from "@/components/landing/ScatterSection";
import { TypewriterSection } from "@/components/landing/TypewriterSection";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/notebooks");
  }

  return (
    <main className="relative flex flex-col">
      <BootSection />
      <HeroSection />
      <MarqueeStripA />
      <TypewriterSection />
      <PhotoStackSection />
      <MarqueeStripB />
      <ScatterSection />
      <MessageSection />
      <OutroSection />
    </main>
  );
}
