"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pink-arrow cursor that follows the mouse.
 *
 * The custom cursor is rendered above content; the system cursor is hidden
 * via the `.heart-cursor-on` class on <html> (set elsewhere when the cookie
 * is enabled — see lib/palette.ts in step 11). This component renders nothing
 * on touch devices (the @media (hover: none) reset in globals.css restores
 * the system cursor regardless).
 */
export function HeartCursor() {
  const ref = useRef<HTMLDivElement | null>(null);
  const shown = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (!shown.current) {
        shown.current = true;
        setVisible(true);
      }
    };
    const onLeave = () => {
      shown.current = false;
      setVisible(false);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 28,
        height: 28,
        pointerEvents: "none",
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.15s",
        filter: "drop-shadow(0 0 8px rgba(255, 94, 168, 0.6))",
      }}
    >
      <svg viewBox="0 0 28 28" width="28" height="28">
        <path
          d="M3 2 L3 22 L9 17 L13 26 L17 24 L13 15 L21 14 Z"
          fill="#ff5ea8"
          stroke="#4b2c5e"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
