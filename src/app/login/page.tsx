import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";
import { Card } from "@/components/ui";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative flex flex-col justify-between overflow-hidden bg-brand px-6 py-8 text-sidebar-text sm:px-10 sm:py-10 lg:px-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-accent/30"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-sun/25"
        />
        <Link href="/" className="relative flex items-center gap-3 sm:gap-4">
          <BrandLogo size="lg" priority />
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold sm:text-2xl">
              Edu Gestion
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted sm:text-xs">
              Plateforme scolaire
            </p>
          </div>
        </Link>
        <div className="relative max-w-md py-10 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-muted sm:text-sm">
            Administration · pédagogie · familles
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:mt-4 sm:text-5xl">
            L&apos;école, au quotidien.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-sidebar-text/85 sm:mt-4 sm:text-base">
            Élèves, cours, notes et familles dans le même espace, clair et
            vivant.
          </p>
        </div>
        <p className="relative text-sm text-sidebar-muted">
          <Link href="/" className="hover:text-white">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        <div className="w-full max-w-md">
          <Card className="p-6 sm:p-7">
            <h2 className="mb-1 font-display text-2xl font-semibold text-foreground">
              Connexion
            </h2>
            <p className="mb-5 text-sm text-muted">
              Accédez à votre espace Edu Gestion.
            </p>
            <LoginForm />
            <div className="mt-6 rounded-xl border border-line bg-brand-soft/70 p-3 text-xs leading-relaxed text-muted">
              <p className="font-semibold text-brand">Comptes démo</p>
              <ul className="mt-2 space-y-1.5">
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
