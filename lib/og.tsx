import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";
export const ogAlt = "kokan-nikki — こうかん にっき";

// Google Fonts CSS API の text= パラメータで必要 glyph だけ subset を取得する。
// CJK フォント全体は数 MB あるので、OG 画像に出す文字列だけ拾うのが必須。
//
// next/og (Satori) は woff2 をデコードできないため、必ず TTF/OTF を引く必要がある。
// Google Fonts は User-Agent を見て返す形式を切り替えていて、空 UA や古い UA だと
// TTF を返す。modern Chrome UA を渡すと woff2 になり Satori が "Unsupported
// OpenType signature wOF2" で落ちるので、敢えて UA を渡さない。
async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
  const css = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`failed to fetch font css ${family}: ${r.status}`);
    return r.text();
  });
  const match = css.match(/src:\s*url\((https?:[^)]+)\)\s*format\(['"](?:opentype|truetype)['"]\)/);
  if (!match) {
    throw new Error(
      `failed to parse TTF/OTF source for ${family}; got non-truetype only response`,
    );
  }
  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) throw new Error(`failed to fetch font binary ${family}: ${fontRes.status}`);
  return fontRes.arrayBuffer();
}

export async function renderRootOgImage(): Promise<ImageResponse> {
  // OG 画像で実際に出す文字。CJK は subset 対象として全部渡す。
  const titleJa = "こうかん にっき";
  const sub = "kokan-nikki";
  const tagline = "♡ dreamy pixel ♡";

  const subsetText = `${titleJa}${sub}${tagline}`;
  const mochi = await loadGoogleFont("Mochiy+Pop+One", subsetText);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#4b2c5e",
          fontFamily: "Mochiy Pop One",
          background: "linear-gradient(180deg, #ffeef6 0%, #eef9f3 100%)",
          position: "relative",
        }}
      >
        {/* Satori は複数 radial-gradient を background shorthand で重ねると
            最後の 1 つしか描画しないので、各 accent を別 div に切る。 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(700px 420px at 12% -8%, #ffb8d4 0%, rgba(255,184,212,0) 62%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(720px 420px at 110% 18%, #b8f0c8 0%, rgba(184,240,200,0) 62%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(640px 420px at 50% 112%, #ffe4a3 0%, rgba(255,228,163,0) 62%)",
          }}
        />

        {/* 装飾の floating heart たち — カードの外側に配置 */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 60,
            display: "flex",
            transform: "rotate(-14deg)",
          }}
        >
          <Heart size={130} />
        </div>
        <div
          style={{
            position: "absolute",
            top: 80,
            right: 70,
            display: "flex",
            transform: "rotate(16deg)",
          }}
        >
          <Heart size={110} fill="#ffd56b" />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 90,
            display: "flex",
            transform: "rotate(10deg)",
          }}
        >
          <Heart size={92} fill="#b59cff" />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 70,
            right: 110,
            display: "flex",
            transform: "rotate(-8deg)",
          }}
        >
          <Heart size={104} fill="#5cd6a8" />
        </div>

        {/* 中央 sticker カード */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 980,
            padding: "52px 56px",
            background: "#fffcf4",
            border: "4px solid #4b2c5e",
            borderRadius: 32,
            boxShadow: "0 10px 0 #4b2c5e",
            position: "relative",
          }}
        >
          {/* tape */}
          <div
            style={{
              position: "absolute",
              top: -16,
              left: 56,
              width: 120,
              height: 28,
              display: "flex",
              background: "rgba(184,240,200,0.85)",
              border: "2px dashed rgba(44,94,68,0.35)",
              transform: "rotate(-6deg)",
            }}
          />

          <div
            style={{
              fontSize: 28,
              letterSpacing: 8,
              color: "#7a5a8e",
              textTransform: "uppercase",
              fontFamily: "Mochiy Pop One",
            }}
          >
            {sub}
          </div>
          <div
            style={{
              fontSize: 108,
              marginTop: 8,
              fontFamily: "Mochiy Pop One",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            {titleJa}
          </div>
          <div
            style={{
              fontSize: 38,
              marginTop: 16,
              color: "#cc2f80",
              fontFamily: "Mochiy Pop One",
            }}
          >
            {tagline}
          </div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Mochiy Pop One", data: mochi, style: "normal", weight: 400 },
      ],
    },
  );
}

// app/icon.svg と同じパスを Satori 経由で出すための inline SVG。
function Heart({ size = 100, fill = "#ff8fbf" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size * 0.92} viewBox="0 0 100 92">
      <path
        d="M50 86 C 14 60, 4 38, 14 22 C 24 6, 42 10, 50 26 C 58 10, 76 6, 86 22 C 96 38, 86 60, 50 86 Z"
        fill={fill}
        stroke="#4b2c5e"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="36" cy="36" r="6" fill="#fff" opacity="0.7" />
      <circle cx="42" cy="32" r="3" fill="#fff" opacity="0.9" />
    </svg>
  );
}
