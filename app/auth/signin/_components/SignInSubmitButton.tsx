"use client";

import { useFormStatus } from "react-dom";

import { PuffButton } from "@/components/ui/PuffButton";

type SignInSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  variant?: "primary" | "alt";
  className?: string;
};

export function SignInSubmitButton({
  idleLabel,
  pendingLabel,
  variant = "primary",
  className,
}: SignInSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <PuffButton
      type="submit"
      variant={variant}
      className={className}
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
      data-pending={pending ? "true" : undefined}
    >
      {pending ? (
        <>
          <span
            className="inline-block animate-pulse [animation-duration:1.2s]"
            aria-hidden="true"
          >
            ♡
          </span>{" "}
          {pendingLabel}
        </>
      ) : (
        idleLabel
      )}
    </PuffButton>
  );
}
