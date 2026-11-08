"use client";

import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()} className="no-print">
      Imprimer
    </Button>
  );
}
