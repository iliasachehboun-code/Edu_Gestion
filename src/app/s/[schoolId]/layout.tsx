import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSessionUser, requireSchoolAccess } from "@/lib/auth";
import { SchoolNav, type NavSection } from "@/components/school-nav";
import { FlashToast } from "@/components/flash-toast";
import { prisma } from "@/lib/prisma";

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ schoolId: string }>;
}) {
  await connection();
  const { schoolId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  let access;
  try {
    access = await requireSchoolAccess(schoolId);
  } catch {
    redirect("/");
  }

  const unread = await prisma.notification.count({
    where: { schoolId, userId: user.id, read: false },
  });

  const role = access.role;
  const base = `/s/${schoolId}`;

  let items: { href: string; label: string }[] = [];
  let sections: NavSection[] = [];

  if (role === "PARENT") {
    items = [
      { href: `${base}/parent`, label: "Tableau de bord" },
      { href: `${base}/parent/bulletins`, label: "Bulletins" },
      { href: `${base}/parent/schedule`, label: "Emploi du temps" },
      { href: `${base}/parent/attendance`, label: "Absences" },
      { href: `${base}/parent/payments`, label: "Paiements" },
      {
        href: `${base}/parent/notifications`,
        label: unread ? `Notifications (${unread})` : "Notifications",
      },
    ];
  } else if (role === "TEACHER") {
    items = [
      { href: `${base}/teacher`, label: "Tableau de bord" },
      { href: `${base}/grades`, label: "Examens et notes" },
      { href: `${base}/homework`, label: "Devoirs et évaluations" },
      { href: `${base}/attendance`, label: "Présences et absences" },
      { href: `${base}/schedule`, label: "Emplois du temps" },
    ];
  } else {
    sections = [
      {
        title: "A. PILOTAGE",
        items: [
          { href: base, label: "Tableau de bord" },
          { href: `${base}/reports`, label: "Rapports et statistiques" },
        ],
      },
      {
        title: "B. GESTION SCOLAIRE",
        items: [
          { href: `${base}/students`, label: "Étudiants" },
          { href: `${base}/admissions`, label: "Admissions et inscriptions" },
          { href: `${base}/classes`, label: "Classes et groupes" },
          { href: `${base}/subjects`, label: "Matières et programmes" },
          { href: `${base}/teachers`, label: "Enseignants et personnel" },
        ],
      },
      {
        title: "C. SUIVI PÉDAGOGIQUE",
        items: [
          { href: `${base}/attendance`, label: "Présences et absences" },
          { href: `${base}/schedule`, label: "Emplois du temps" },
          { href: `${base}/grades`, label: "Examens et notes" },
          { href: `${base}/homework`, label: "Devoirs et évaluations" },
        ],
      },
      {
        title: "D. GESTION ADMINISTRATIVE",
        items: [
          { href: `${base}/payments`, label: "Finances et paiements" },
          { href: `${base}/communication`, label: "Communication" },
          { href: `${base}/documents`, label: "Documents" },
          { href: `${base}/library`, label: "Bibliothèque" },
          { href: `${base}/services`, label: "Transport et cantine" },
        ],
      },
      {
        title: "E. CONFIGURATION",
        items: [
          { href: `${base}/users`, label: "Utilisateurs et permissions" },
          { href: `${base}/settings`, label: "Paramètres de l'établissement" },
        ],
      },
    ];
  }

  const roleLabel =
    role === "SCHOOL_ADMIN"
      ? "Administration"
      : role === "TEACHER"
        ? "Enseignant"
        : "Parent";

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <SchoolNav
        schoolId={schoolId}
        schoolName={access.school.name}
        userName={`${user.firstName} ${user.lastName}`}
        role={roleLabel}
        items={items}
        sections={sections}
      />
      <main className="min-w-0 flex-1 overflow-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <Suspense fallback={null}>
            <FlashToast />
          </Suspense>
          {children}
        </div>
      </main>
    </div>
  );
}
