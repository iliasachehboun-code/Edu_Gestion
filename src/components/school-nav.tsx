"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

  const linkClass = (href: string) =>
    cn(
      "block rounded-xl px-3 py-1.5 text-sm transition",
      isActive(pathname, href, schoolId)
        ? "bg-[#8fe3cf] font-semibold text-[#002b5b]"
        : "text-[#e8f1ff] hover:bg-white/10 hover:text-white"
    );

  return (
    <aside className="no-print flex w-72 shrink-0 flex-col bg-[#002b5b] text-[#f3f7ff]">
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-white p-1 shadow-sm">
            <Image
              src="/henri-moissan.png"
              alt="Logo Henri Moissan"
              width={72}
              height={44}
              priority
            />
          </span>
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-fraunces)] text-base font-semibold leading-tight">
              {schoolName}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8fe3cf]">
              Groupe scolaire
            </p>
          </div>
        </div>
        <p className="mt-3 truncate text-xs text-[#c5d8f2]">
          {userName} · {role}
        </p>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.14em] text-[#8fe3cf]">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
        {items.length > 0 ? (
          <div className="space-y-0.5">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}
      </nav>
      <form action={logoutAction} className="border-t border-white/10 p-3">
        <button
          type="submit"
          className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#8fe3cf] hover:bg-white/10"
        >
          Déconnexion
        </button>
      </form>
    </aside>
  );
}
