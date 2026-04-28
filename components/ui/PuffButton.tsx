import Link, { type LinkProps } from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "alt";

type CommonProps = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

type AsButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type AsLinkProps = CommonProps &
  Omit<LinkProps, "className" | "children"> & {
    href: LinkProps["href"];
  };

export function PuffButton(props: AsButtonProps | AsLinkProps) {
  const { variant = "primary", className, children, ...rest } = props;
  const klass = cn("btn-puff", variant === "alt" && "alt", className);

  if ("href" in rest && rest.href !== undefined) {
    return (
      <Link className={klass} {...(rest as AsLinkProps)}>
        {children}
      </Link>
    );
  }
  return (
    <button className={klass} {...(rest as AsButtonProps)}>
      {children}
    </button>
  );
}
