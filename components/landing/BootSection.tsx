import type { CSSProperties } from "react";

const LOG_LINES: { text: string; color?: string }[] = [
  { text: "▸ KOKAN-NIKKI BIOS v1.0", color: "var(--lemon)" },
  { text: "▸ INITIALIZING DREAMY PIXEL ENGINE..." },
  { text: "▸ LOADING KAWAII MODULES [████████░░] 80%" },
  { text: "▸ MOUNTING /dev/heart .................. OK" },
  { text: "▸ MOUNTING /dev/star ................... OK" },
  { text: "▸ READY ♡", color: "var(--pink)" },
];

export function BootSection() {
  return (
    <section
      className="landing-section relative overflow-hidden bg-[#1a0d2e] py-12"
      data-testid="lp-boot"
    >
      <div className="mx-auto max-w-2xl px-6 font-[family-name:var(--font-pixel)] text-xs leading-7 tracking-widest text-[var(--mint-2)] sm:text-sm">
        {LOG_LINES.map((line, i) => {
          const isLast = i === LOG_LINES.length - 1;
          const style: CSSProperties = {
            ["--d" as string]: `${i * 0.18}s`,
            color: line.color,
          };
          return (
            <p key={i} className="boot-line" style={style}>
              {line.text}
              {isLast ? <span className="boot-cursor"> █</span> : null}
            </p>
          );
        })}
      </div>
      <div
        aria-hidden
        className="boot-scanlines pointer-events-none absolute inset-0"
      />
    </section>
  );
}
