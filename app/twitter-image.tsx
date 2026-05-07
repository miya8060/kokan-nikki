import { ogAlt, ogContentType, ogSize, renderRootOgImage } from "@/lib/og";

export const alt = ogAlt;
export const size = ogSize;
export const contentType = ogContentType;

export const dynamic = "force-static";

export default async function Image() {
  return renderRootOgImage();
}
