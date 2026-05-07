"use client";

import Link from "next/link";
import { useEffect } from "react";

interface RetryFn {
  (): void;
}

type GlobalErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: RetryFn;
};

// `global-error.tsx` replaces the root layout when active, so it cannot rely on
// `app/layout.tsx`'s fonts, palette, or globals.css. Styles are inlined to keep
// the page renderable even when the root layout itself is the failure cause.
export default function GlobalError({
  error,
  unstable_retry,
}: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          background:
            "linear-gradient(180deg, #ffeef6 0%, #eef9f3 100%)",
          color: "#4b2c5e",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <main
          style={{
            background: "#fffcf4",
            border: "2px solid #4b2c5e",
            borderRadius: "22px",
            boxShadow: "0 6px 0 #4b2c5e, 0 12px 30px rgba(44, 94, 68, 0.12)",
            padding: "40px 32px",
            maxWidth: "520px",
            width: "100%",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#7a5a8e",
              margin: 0,
            }}
          >
            global error
          </p>
          <h1
            style={{
              fontSize: "32px",
              margin: "16px 0 8px",
              lineHeight: 1.3,
            }}
          >
            ちょっと まよっちゃった
          </h1>
          <p
            style={{
              color: "#7a5a8e",
              fontSize: "15px",
              lineHeight: 1.7,
              margin: "16px 0 0",
            }}
          >
            うまく ひらけなかったよ。
            <br />
            もういちど ためしてみてね。
          </p>

          {error.digest ? (
            <p
              style={{
                marginTop: "16px",
                fontSize: "12px",
                color: "#7a5a8e",
                opacity: 0.7,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              ref: {error.digest}
            </p>
          ) : null}

          <div
            style={{
              marginTop: "32px",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                appearance: "none",
                border: "none",
                cursor: "pointer",
                padding: "14px 28px",
                fontSize: "14px",
                color: "#4b2c5e",
                background: "linear-gradient(180deg, #fff 0%, #b8f0c8 100%)",
                borderRadius: "999px",
                boxShadow:
                  "0 0 0 2px #4b2c5e inset, 0 6px 0 #4b2c5e, 0 8px 18px rgba(44, 94, 68, 0.18)",
              }}
            >
              ♡ もういちど ためす
            </button>
            <Link
              href="/"
              style={{
                appearance: "none",
                cursor: "pointer",
                padding: "14px 28px",
                fontSize: "14px",
                color: "#4b2c5e",
                textDecoration: "none",
                background: "linear-gradient(180deg, #fff 0%, #fff2b8 100%)",
                borderRadius: "999px",
                boxShadow:
                  "0 0 0 2px #4b2c5e inset, 0 6px 0 #4b2c5e, 0 8px 18px rgba(44, 94, 68, 0.18)",
              }}
            >
              ★ トップに もどる
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
