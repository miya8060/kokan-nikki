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
 *
 * #136: `<dialog>.showModal()` puts the dialog on the browser top layer, which
 * sits above every normal-stacking-context element regardless of `z-index`.
 * We therefore mount the cursor as a `popover="manual"` element and call
 * `showPopover()` so it is itself placed on the top layer. When another
 * top-layer element opens (e.g. SpreadOverlay's dialog), it stacks above us;
 * we listen for the bubbling `toggle` event and re-show our popover so we
 * land back on top of the stack.
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

    const supportsPopover = typeof el.showPopover === "function";

    const ensureOnTop = () => {
      if (!supportsPopover) return;
      try {
        if (el.matches(":popover-open")) {
          el.hidePopover();
        }
        el.showPopover();
      } catch {
        // Element detached or browser disagreed; next ensureOnTop call retries.
      }
    };

    ensureOnTop();

    const onToggle = (event: Event) => {
      if (event.target === el) return;
      const toggle = event as ToggleEvent;
      if (toggle.newState !== "open") return;
      ensureOnTop();
    };
    document.addEventListener("toggle", onToggle, true);

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
      document.removeEventListener("toggle", onToggle, true);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      // `popover` puts the element on the top layer when shown, so it renders
      // above `<dialog>.showModal()` modals (which also live on the top layer
      // but below the most-recently-shown entry). `manual` means we control
      // open/close ourselves (no light-dismiss).
      popover="manual"
      style={{
        // Override UA `[popover]` defaults so the cursor positions purely via
        // transform from (0,0). Without these the UA rules `inset: 0` and
        // `margin: auto` would stretch and center the popover.
        position: "fixed",
        top: 0,
        left: 0,
        right: "auto",
        bottom: "auto",
        margin: 0,
        padding: 0,
        border: "none",
        background: "transparent",
        overflow: "visible",
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
