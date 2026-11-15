import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { BrandLogo } from "@/components/brand-logo";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.globalRole !== "SUPER_ADMIN") redirect("/");

  return (
    <div className="min-h-screen">
      <header className="border-b border-brand-deep bg-brand text-sidebar-text">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:py-4">
          <Link href="/superadmin" className="flex min-w-0 items-center gap-3">
            <BrandLogo size="md" />
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-semibold leading-tight sm:text-xl">
                Edu Gestion
              </span>
              <span className="block text-xs text-sidebar-muted">
                Administration plateforme
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-3 text-sm sm:gap-4">
            <span className="hidden truncate sm:inline">
              {user.firstName} {user.lastName}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-2 py-1 text-sidebar-muted hover:bg-white/10 hover:text-white"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
