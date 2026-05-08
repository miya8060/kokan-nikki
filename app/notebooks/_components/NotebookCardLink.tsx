"use client";

import Link from "next/link";
import { useState } from "react";

import {
  SpreadOverlay,
  type SpreadOverlayEntry,
} from "@/app/notebooks/_components/SpreadOverlay";

export interface NotebookCardLinkProps {
  notebookId: string;
  notebookName: string;
  pageFlipEnabled: boolean;
  lastEntry: SpreadOverlayEntry | null;
  className?: string;
  children: React.ReactNode;
}

// #91 + #92: notebook card のリンク wrapper。pageFlip cookie が ON のときだけ
// click を intercept して見開き overlay を開く。OFF のとき (default) は素の
// next/link 挙動 (full nav に prefetch 付き) を保つ。SSR / no-JS / SEO は常に
// `<a href>` 経由で /notebooks/[id] に到達できる。
export function NotebookCardLink({
  notebookId,
  notebookName,
  pageFlipEnabled,
  lastEntry,
  className,
  children,
}: NotebookCardLinkProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Link
        href={`/notebooks/${notebookId}`}
        className={className}
        onClick={(event) => {
          if (!pageFlipEnabled) return;
          // 修飾キー (Cmd/Ctrl/Shift/Meta + middle click) は新規タブ等の
          // 挙動を尊重して素通しさせる。
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          )
            return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </Link>
      {pageFlipEnabled && (
        <SpreadOverlay
          open={open}
          notebookId={notebookId}
          notebookName={notebookName}
          lastEntry={lastEntry}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
