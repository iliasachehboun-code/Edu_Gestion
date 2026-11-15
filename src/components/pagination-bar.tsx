import Link from "next/link";
import { buildQuery, pageCount, PAGE_SIZE } from "@/lib/list-query";

export function PaginationBar({
  total,
  page,
  pageSize = PAGE_SIZE,
  basePath,
  query,
}: {
  total: number;
  page: number;
  pageSize?: number;
  basePath: string;
  query: Record<string, string | undefined>;
}) {
  const pages = pageCount(total, pageSize);
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">
        {from}–{to} sur {total}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`${basePath}${buildQuery(query, { page: Math.max(1, page - 1) })}`}
          aria-disabled={page <= 1}
          className={`rounded-xl border border-line px-3 py-1.5 text-sm font-semibold ${
            page <= 1
              ? "pointer-events-none opacity-40"
              : "bg-surface text-brand hover:bg-brand-soft"
          }`}
        >
          Précédent
        </Link>
        <span className="inline-flex items-center rounded-xl bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand">
          {page} / {pages}
        </span>
        <Link
          href={`${basePath}${buildQuery(query, { page: Math.min(pages, page + 1) })}`}
          aria-disabled={page >= pages}
          className={`rounded-xl border border-line px-3 py-1.5 text-sm font-semibold ${
            page >= pages
              ? "pointer-events-none opacity-40"
              : "bg-surface text-brand hover:bg-brand-soft"
          }`}
        >
          Suivant
        </Link>
      </div>
    </div>
  );
}
