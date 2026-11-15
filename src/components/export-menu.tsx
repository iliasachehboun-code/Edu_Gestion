import Link from "next/link";
import { Button } from "@/components/ui";

export function ExportMenu({
  csvHref,
  pdfHref,
  label = "Exporter",
}: {
  csvHref: string;
  pdfHref: string;
  label?: string;
}) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <Link href={csvHref} prefetch={false}>
        <Button type="button" variant="secondary">
          CSV
        </Button>
      </Link>
      <Link href={pdfHref} prefetch={false} target="_blank">
        <Button type="button" variant="secondary">
          PDF
        </Button>
      </Link>
    </div>
  );
}
