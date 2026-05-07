"use client";

import { useFormStatus } from "react-dom";
import { useRef, useState } from "react";

import { createNotebookFromForm } from "@/app/_actions/notebooks";
import { COVER_PALETTES } from "@/app/notebooks/_lib/cover";
import { NOTEBOOK_NAME_MAX } from "@/lib/schemas/notebook";

import styles from "../notebooks.module.css";

// ---- sparkle burst ----------------------------------------------------------
// 22 個のシール / 星 / ハートを button 中心から放射する。redirect で navigation
// が起きると body ごと差し替わるので、burst は短時間しか見えないが、押した瞬間
// の手応えを付ける。

const BURST_GLYPHS = ["♡", "✦", "★", "✿", "♥", "✧", "❤", "✺"] as const;
const BURST_COLORS = [
  "#ff3aa9",
  "#ffd400",
  "#7ec9ff",
  "#9bf5b8",
  "#b48bff",
  "#ff6fa3",
] as const;
const BURST_PARTICLE_COUNT = 22;

function makeBurst(x: number, y: number) {
  if (typeof document === "undefined") return;
  const root = document.createElement("div");
  root.className = "nb-burst";
  root.style.left = `${x}px`;
  root.style.top = `${y}px`;
  document.body.appendChild(root);

  for (let i = 0; i < BURST_PARTICLE_COUNT; i++) {
    const span = document.createElement("span");
    span.className = "nb-burst-particle";
    span.textContent = BURST_GLYPHS[i % BURST_GLYPHS.length];
    span.style.color = BURST_COLORS[i % BURST_COLORS.length];
    const angle = (Math.PI * 2 * i) / BURST_PARTICLE_COUNT + Math.random() * 0.4;
    const dist = 80 + Math.random() * 140;
    span.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    span.style.setProperty("--dy", `${Math.sin(angle) * dist - 20}px`);
    span.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    span.style.fontSize = `${16 + Math.random() * 16}px`;
    span.style.animationDelay = `${Math.random() * 0.1}s`;
    root.appendChild(span);
  }
  setTimeout(() => root.remove(), 1400);
}

function CreateButton({ onClick }: { onClick: () => void }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={styles.btnCreate}
      disabled={pending}
      onClick={onClick}
    >
      <span className={styles.btnCreateHeart} aria-hidden="true">♥</span>
      つくる
      <span className={styles.btnCreateArrow} aria-hidden="true">→</span>
    </button>
  );
}

export function Composer() {
  // 色は DB に保存しないが、押した感触を出すためローカル state で管理する。
  // 表紙の色は server 側で id ハッシュから決まるため、選択結果は使われない。
  const [pickedColor, setPickedColor] = useState<string>("pink");
  const buttonAreaRef = useRef<HTMLDivElement | null>(null);

  const onCreateClick = () => {
    const node = buttonAreaRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    makeBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  return (
    <section className={styles.composer} aria-labelledby="composer-title">
      <div className={styles.composerHead}>
        <h2 id="composer-title" className={styles.composerTitle}>
          <span className={styles.composerStar} aria-hidden="true">★</span>
          あたらしい にっき
        </h2>
      </div>

      <form action={createNotebookFromForm} className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="diary-name">
          name
          <span className={styles.fieldHint}>(なまえ を つけてね)</span>
        </label>
        <input
          id="diary-name"
          name="name"
          type="text"
          required
          maxLength={NOTEBOOK_NAME_MAX}
          placeholder="ひみつ こうかんにっき"
          className={styles.input}
        />

        <div className={styles.composerFoot}>
          <div className={styles.coverPicker}>
            <span className={styles.coverPickerLabel}>いろ:</span>
            {COVER_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.coverSwatch}
                aria-pressed={pickedColor === p.id}
                aria-label={p.id}
                onClick={() => setPickedColor(p.id)}
                style={{
                  background: `linear-gradient(135deg, ${p.c1}, ${p.c2})`,
                }}
              />
            ))}
          </div>

          <div ref={buttonAreaRef} style={{ display: "inline-flex" }}>
            <CreateButton onClick={onCreateClick} />
          </div>
        </div>
      </form>
    </section>
  );
}
