import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Fil d'Ariane" className="mb-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted sm:text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden className="text-muted-soft">
                  ›
                </span>
              ) : null}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="font-medium text-brand hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={last ? "font-semibold text-foreground" : undefined}
                  aria-current={last ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function schoolTrail(
  schoolId: string,
  page: { label: string; path: string },
  current?: string
): Crumb[] {
  const base = `/s/${schoolId}`;
  const pageHref = `${base}${page.path}`;
  if (current) {
    return [
      { label: "Accueil", href: base },
      { label: page.label, href: pageHref },
      { label: current },
    ];
  }
  return [
    { label: "Accueil", href: base },
    { label: page.label },
  ];
}
