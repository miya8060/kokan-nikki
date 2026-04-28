import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type StickerProps = HTMLAttributes<HTMLDivElement> & {
  tape?: boolean;
  children: ReactNode;
};

export function Sticker({ tape, className, children, ...rest }: StickerProps) {
  return (
    <div className={cn("sticker", tape && "tape", className)} {...rest}>
      {children}
    </div>
  );
}
