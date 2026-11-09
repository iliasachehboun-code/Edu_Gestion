"use client";

import { useState } from "react";
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
    `/s/${schoolId}/student`,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const linkClass = (href: string) =>
    cn(
      "block rounded-xl px-3 py-2 text-sm font-medium transition",
      isActive(pathname, href, schoolId)
        ? "bg-[#8fe3cf] font-bold text-[#002b5b] shadow-sm"
        : "text-[#e8f1ff] hover:bg-white/10 hover:text-white"
    );

  const NavContent = () => (
    <>
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
            <p className="truncate font-[family-name:var(--font-fraunces)] text-base font-semibold leading-tight text-white">
              {schoolName}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8fe3cf]">
              Groupe scolaire
            </p>
          </div>
        </div>
        <p className="mt-3 truncate text-xs text-[#c5d8f2]">
          {userName} · <span className="font-semibold text-white">{role}</span>
        </p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.14em] text-[#8fe3cf]">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setMobileMenuOpen(false)}
                  className={linkClass(item.href)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
        {items.length > 0 ? (
          <div className="space-y-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className={linkClass(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}
      </nav>

      <form action={logoutAction} className="border-t border-white/10 p-3">
        <button
          type="submit"
          className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#8fe3cf] hover:bg-white/10 transition"
        >
          Déconnexion
        </button>
      </form>
    </>
  );

  return (
    <>
      {/* 📱 En-tête mobile (smartphones & tablettes) */}
      <header className="no-print sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#001e42] bg-[#002b5b] px-4 text-white md:hidden shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-white p-1 shadow-sm">
            <Image
              src="/henri-moissan.png"
              alt="Logo Henri Moissan"
              width={40}
              height={24}
              priority
            />
          </span>
          <span className="font-[family-name:var(--font-fraunces)] font-bold text-sm tracking-tight truncate max-w-[190px]">
            {schoolName}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl font-bold text-[#8fe3cf] hover:bg-white/20 transition active:scale-95"
          aria-label="Menu"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* 📱 Tiroir coulissant mobile */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 md:hidden animate-in fade-in">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 flex w-72 flex-col bg-[#002b5b] text-[#f3f7ff] shadow-2xl animate-in slide-in-from-left duration-200">
            <NavContent />
          </aside>
        </div>
      )}

      {/* 🖥️ Sidebar fixe pour ordinateurs (Desktop >= md) */}
      <aside className="no-print hidden md:flex w-72 shrink-0 flex-col bg-[#002b5b] text-[#f3f7ff]">
        <NavContent />
      </aside>
    </>
  );
}
