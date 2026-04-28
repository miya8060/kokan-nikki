import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type TagProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function Tag({ className, children, ...rest }: TagProps) {
  return (
    <span className={cn("tag", className)} {...rest}>
      {children}
    </span>
  );
}
