"use client";

import { useEffect, useRef, useState } from "react";

// 1 文字あたりの送り間隔。日本語は 1 文字の情報量が多いので、ラテン文字
// 想定の 25-30ms より気持ち遅めに設定する。
const CHAR_INTERVAL_MS = 40;

interface Props {
  body: string;
  className?: string;
}

/**
 * 日記本文を 1 文字ずつ送って表示するクライアントコンポーネント。
 *
 * - 初回 mount 時のみアニメ。再 render では再生されない。
 * - `<html class="reduce-motion">` 付与時 (NF-A11Y-01 と同じ opt-in) は即時 full 表示。
 * - 本文クリックで skip (残りを一気に出す)。
 * - スクリーンリーダーには常に full body を流す (sr-only span)。
 * - 絵文字 / 結合文字を壊さないよう Array.from で code point 分割する。
 */
export function EntryBodyTypewriter({ body, className }: Props) {
  const chars = Array.from(body);
  const total = chars.length;

  const [shown, setShown] = useState(0);
  // 空本文は最初から「アニメ完了」扱いにして、無駄な onClick / cursor を出さない。
  const [done, setDone] = useState(total === 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (total === 0) return;

    const reduceMotion =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("reduce-motion");

    if (reduceMotion) {
      // setState を effect 本体で同期に呼ばない (react-hooks/set-state-in-effect)。
      // microtask に逃がすことで「effect は subscribe するだけ」の規約を守る。
      const id = setTimeout(() => {
        setShown(total);
        setDone(true);
      }, 0);
      return () => clearTimeout(id);
    }

    let i = 0;
    intervalRef.current = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= total) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setDone(true);
      }
    }, CHAR_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [body, total]);

  const interactive = !done && total > 0;
  const skip = () => {
    if (!interactive) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setShown(total);
    setDone(true);
  };

  return (
    <p
      className={className}
      onClick={interactive ? skip : undefined}
      style={interactive ? { cursor: "pointer" } : undefined}
    >
      <span aria-hidden="true">{chars.slice(0, shown).join("")}</span>
      <span className="sr-only">{body}</span>
    </p>
  );
}
