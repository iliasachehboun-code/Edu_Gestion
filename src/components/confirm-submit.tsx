"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function ConfirmSubmit({
  message = "Confirmer cette suppression ?",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { message?: string }) {
  return (
    <button
      type="submit"
      className={cn(
        "text-sm font-medium text-danger hover:underline disabled:opacity-50",
        className
      )}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}
