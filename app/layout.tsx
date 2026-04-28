import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
