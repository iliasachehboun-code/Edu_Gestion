"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export function PrintButton({
  label = "Imprimer",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className={cn("no-print", className)}
    >
      {label}
    </Button>
  );
}
