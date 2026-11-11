"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { CompactModeToggle } from "@/components/compact-mode";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";

export type NavItem = { href: string; label: string };
export type NavSection = { title: string; items: NavItem[] };

function isActive(pathname: string, href: string, schoolId: string) {
  if (pathname === href) return true;
  const roots = [
    `/s/${schoolId}`,
    `/s/${schoolId}/teacher`,
    `/s/${schoolId}/parent`,
  ];
  if (roots.includes(href)) return false;
  return pathname.startsWith(href);
}

function favoritesKey(schoolId: string) {
  return `edugestion:favorites:${schoolId}`;
}

function collapsedKey(schoolId: string) {
  return `edugestion:nav-collapsed:${schoolId}`;
}

export function SchoolNav({
  schoolId,
  schoolName,
  userName,
  role,
  items = [],
  sections = [],
}: {
  schoolId: string;
  schoolName: string;
  userName: string;
  role: string;
  items?: NavItem[];
  sections?: NavSection[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    try {
      const storedFav = localStorage.getItem(favoritesKey(schoolId));
      const storedCollapsed = localStorage.getItem(collapsedKey(schoolId));
      if (storedFav) setFavorites(JSON.parse(storedFav) as string[]);
      if (storedCollapsed) setCollapsed(JSON.parse(storedCollapsed) as Record<string, boolean>);
    } catch {
      // ignore storage errors
    }
  }, [schoolId]);

  useEffect(() => {
    // Open the section that contains the active page.
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const section of sections) {
        const hasActive = section.items.some((item) =>
          isActive(pathname, item.href, schoolId)
        );
        if (hasActive) next[section.title] = false;
      }
      return next;
    });
  }, [pathname, schoolId, sections]);

  const allItems = useMemo(() => {
    const fromSections = sections.flatMap((section) => section.items);
    return [...fromSections, ...items];
  }, [items, sections]);

  const favoriteItems = allItems.filter((item) => favorites.includes(item.href));

  function persistFavorites(next: string[]) {
    setFavorites(next);
    try {
      localStorage.setItem(favoritesKey(schoolId), JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function toggleFavorite(href: string) {
    persistFavorites(
      favorites.includes(href)
        ? favorites.filter((item) => item !== href)
        : [...favorites, href].slice(0, 8)
    );
  }

  function toggleSection(title: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [title]: !isSectionCollapsed(title, prev) };
      try {
        localStorage.setItem(collapsedKey(schoolId), JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function isSectionCollapsed(
    title: string,
    state: Record<string, boolean> = collapsed
  ) {
    if (title.startsWith("A.")) return false;
    if (state[title] === undefined) {
      const hasActive = sections
        .find((section) => section.title === title)
        ?.items.some((item) => isActive(pathname, item.href, schoolId));
      return !hasActive;
    }
    return Boolean(state[title]);
  }

  const linkClass = (href: string) =>
    cn(
      "block rounded-xl px-3 py-2 text-sm transition",
      isActive(pathname, href, schoolId)
        ? "bg-sidebar-active font-semibold text-brand-deep"
        : "text-sidebar-text/90 hover:bg-white/10 hover:text-white"
    );

  function NavLink({ item }: { item: NavItem }) {
    const fav = favorites.includes(item.href);
    return (
      <div className="group flex items-center gap-1">
        <Link href={item.href} className={cn(linkClass(item.href), "min-w-0 flex-1")}>
          {item.label}
        </Link>
        <button
          type="button"
          title={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
          className={cn(
            "rounded-lg px-2 py-1 text-xs transition",
            fav
              ? "text-sidebar-active"
              : "text-sidebar-muted/50 opacity-70 hover:text-sidebar-active lg:opacity-0 lg:group-hover:opacity-100"
          )}
          onClick={() => toggleFavorite(item.href)}
        >
          ★
        </button>
      </div>
    );
  }

  const navBody = (
    <>
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" priority />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold leading-tight text-white">
              {schoolName}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
              Edu Gestion
            </p>
          </div>
        </div>
        <p className="mt-3 truncate text-xs text-sidebar-muted">
          {userName} · {role}
        </p>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {favoriteItems.length > 0 ? (
          <div>
            <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.14em] text-sidebar-muted">
              FAVORIS
            </p>
            <div className="space-y-0.5">
              {favoriteItems.map((item) => (
                <NavLink key={`fav-${item.href}`} item={item} />
              ))}
            </div>
          </div>
        ) : null}

        {sections.map((section) => {
          const closed = isSectionCollapsed(section.title);
          return (
            <div key={section.title}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[11px] font-semibold tracking-[0.14em] text-sidebar-muted hover:bg-white/5"
                onClick={() => toggleSection(section.title)}
                aria-expanded={!closed}
              >
                <span>{section.title}</span>
                <span aria-hidden>{closed ? "+" : "−"}</span>
              </button>
              {!closed ? (
                <div className="mt-0.5 space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink key={item.href} item={item} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        {items.length > 0 ? (
          <div className="space-y-0.5">
            {items.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        ) : null}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <CompactModeToggle />
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-sidebar-muted hover:bg-white/10 hover:text-white"
          >
            Déconnexion
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo size="sm" />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-brand">
              {schoolName}
            </p>
            <p className="truncate text-[11px] text-muted">
              {userName} · {role}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-brand"
          aria-expanded={open}
          aria-controls="school-nav"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <span className="flex flex-col gap-1.5" aria-hidden>
            <span
              className={cn(
                "block h-0.5 w-5 rounded bg-brand transition",
                open && "translate-y-2 rotate-45"
              )}
            />
            <span
              className={cn(
                "block h-0.5 w-5 rounded bg-brand transition",
                open && "opacity-0"
              )}
            />
            <span
              className={cn(
                "block h-0.5 w-5 rounded bg-brand transition",
                open && "-translate-y-2 -rotate-45"
              )}
            />
          </span>
        </button>
      </header>

      {open ? (
        <button
          type="button"
          className="no-print fixed inset-0 z-40 bg-brand-deep/40 lg:hidden"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="school-nav"
        className={cn(
          "no-print fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] shrink-0 flex-col bg-sidebar text-sidebar-text shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:w-72 lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {navBody}
      </aside>
    </>
  );
}
