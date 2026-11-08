import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative flex flex-col justify-between overflow-hidden bg-[#002b5b] px-8 py-10 text-[#f3f7ff] sm:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#8fe3cf]/35"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-[#f0df07]/25"
        />
        <div className="relative flex items-center gap-4">
          <span className="rounded-2xl bg-white p-2 shadow-sm">
            <Image
              src="/henri-moissan.png"
              alt="Logo du groupe scolaire Henri Moissan"
              width={120}
              height={73}
              priority
            />
          </span>
          <div>
            <p className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
              Henri Moissan
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8fe3cf]">
              Groupe scolaire
            </p>
          </div>
        </div>
        <div className="relative max-w-md py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8fe3cf]">
            Primaire, collège et lycée
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-5xl font-semibold leading-tight">
            L&apos;école, au quotidien.
          </h1>
          <p className="mt-4 text-base text-[#d7e6fb]">
            Élèves, cours, notes et familles dans le même espace, clair et vivant.
          </p>
        </div>
        <p className="relative text-sm text-[#c5d8f2]">Rabat · Hassan</p>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card>
            <h2 className="mb-4 font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#0c2340]">
              Connexion
            </h2>
            <LoginForm />
            <div className="mt-6 rounded-xl bg-[#f4f8fc] p-3 text-xs text-[#3d5278]">
              <p className="font-semibold text-[#002b5b]">Comptes démo</p>
              <ul className="mt-2 space-y-1">
                <li>SuperAdmin — admin@school.app / admin123</li>
                <li>Directeur — directeur@ecole-demo.fr / demo123</li>
                <li>Enseignant — prof@ecole-demo.fr / demo123</li>
                <li>Parent — parent@ecole-demo.fr / demo123</li>
              </ul>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
