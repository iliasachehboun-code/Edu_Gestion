export const PAGE_SIZE = 25;

export type SortDir = "asc" | "desc";

export function parsePage(value?: string | null) {
  const n = Number(value || 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export function parseSortDir(value?: string | null): SortDir {
  return value === "desc" ? "desc" : "asc";
}

export function buildQuery(
  current: Record<string, string | undefined>,
  patch: Record<string, string | number | undefined | null>
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...patch })) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function pageCount(total: number, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}
