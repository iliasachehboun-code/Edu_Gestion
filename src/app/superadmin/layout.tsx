import Image from "next/image";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

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
      <header className="border-b border-[#001e42] bg-[#002b5b] text-[#f3f7ff]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/superadmin" className="flex items-center gap-3">
            <span className="rounded-xl bg-white p-1">
              <Image
                src="/henri-moissan.png"
                alt=""
                width={64}
                height={39}
              />
            </span>
            <span>
              <span className="block font-[family-name:var(--font-fraunces)] text-xl font-semibold leading-tight">
                Henri Moissan
              </span>
              <span className="block text-xs text-[#8fe3cf]">
                Administration plateforme
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span>
              {user.firstName} {user.lastName}
            </span>
            <form action={logoutAction}>
              <button type="submit" className="text-[#8fe3cf] hover:underline">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
