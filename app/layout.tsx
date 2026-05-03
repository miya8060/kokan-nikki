import type { Metadata } from "next";
import {
  Caveat,
  DotGothic16,
  Mochiy_Pop_One,
  Zen_Maru_Gothic,
} from "next/font/google";
import { cookies } from "next/headers";

import { HeartCursor } from "@/components/ui/HeartCursor";
import { cn } from "@/lib/cn";
import {
  CURSOR_COOKIE,
  PALETTE_COOKIE,
  parseCursorEnabled,
  parsePalette,
} from "@/lib/palette";
import "./globals.css";

// next/font/google が CJK フォントの全 unicode-range chunk を preload してしまう
// (next 16.2.4 で 325 chunk / 6.4 MB が <link rel=preload> される) ため、
// Japanese フォントは preload: false で配信。実 glyph に必要な chunk だけ
// @font-face の unicode-range で遅延 DL される。display: swap でフォールバック表示。
const mochi = Mochiy_Pop_One({
  variable: "--font-mochi",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const maru = Zen_Maru_Gothic({
  variable: "--font-maru",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const pixel = DotGothic16({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const hand = Caveat({
  variable: "--font-hand",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "kokan-nikki ─ こうかん にっき",
  description:
    "Y2K カワイイ系のオンライン交換日記。順番にひとつのノートを回す体験を、離れた場所にいる相手と。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // F-SET-01 / F-SET-02: cookie を SSR で読み <html> に反映。クライアント側で
  // クラスを付け替える方式だと FOUC が出るのでサーバー側で確定させる。
  const cookieStore = await cookies();
  const palette = parsePalette(cookieStore.get(PALETTE_COOKIE)?.value);
  const cursorEnabled = parseCursorEnabled(
    cookieStore.get(CURSOR_COOKIE)?.value,
  );

  return (
    <html
      lang="ja"
      data-palette={palette}
      className={cn(
        mochi.variable,
        maru.variable,
        pixel.variable,
        hand.variable,
        "h-full antialiased",
        cursorEnabled && "heart-cursor-on",
      )}
    >
      <body className="flex min-h-full flex-col">
        {children}
        {cursorEnabled ? <HeartCursor /> : null}
      </body>
    </html>
  );
}
