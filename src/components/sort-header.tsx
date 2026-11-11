import Link from "next/link";
import { buildQuery, type SortDir } from "@/lib/list-query";
import { Th } from "@/components/ui";

export function SortHeader({
  label,
  column,
  sort,
  dir,
  basePath,
  query,
}: {
  label: string;
  column: string;
  sort: string;
  dir: SortDir;
  basePath: string;
  query: Record<string, string | undefined>;
}) {
  const active = sort === column;
  const nextDir: SortDir = active && dir === "asc" ? "desc" : "asc";
  return (
    <Th>
      <Link
        href={`${basePath}${buildQuery(query, {
          sort: column,
          dir: nextDir,
          page: 1,
        })}`}
        className="inline-flex items-center gap-1 hover:underline"
      >
        {label}
        <span className="text-[10px] opacity-70">
          {active ? (dir === "asc" ? "▲" : "▼") : "◇"}
        </span>
      </Link>
    </Th>
  );
}
