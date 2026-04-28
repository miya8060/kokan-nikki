import type { Metadata } from "next";
import {
  Caveat,
  DotGothic16,
  Mochiy_Pop_One,
  Zen_Maru_Gothic,
} from "next/font/google";
import "./globals.css";

const mochi = Mochiy_Pop_One({
  variable: "--font-mochi",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const maru = Zen_Maru_Gothic({
  variable: "--font-maru",
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

const pixel = DotGothic16({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const hand = Caveat({
  variable: "--font-hand",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "kokan-nikki ─ こうかん にっき",
  description:
    "Y2K カワイイ系のオンライン交換日記。順番にひとつのノートを回す体験を、離れた場所にいる相手と。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${mochi.variable} ${maru.variable} ${pixel.variable} ${hand.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
