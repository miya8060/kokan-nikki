import { ogAlt, ogContentType, ogSize, renderRootOgImage } from "@/lib/og";

export const alt = ogAlt;
export const size = ogSize;
export const contentType = ogContentType;

// build 時に静的生成して CDN にキャッシュさせる。Google Fonts への fetch も
// build 時 1 回で済む。
export const dynamic = "force-static";

export default async function Image() {
  return renderRootOgImage();
}
