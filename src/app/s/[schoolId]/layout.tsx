import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSessionUser, requireSchoolAccess } from "@/lib/auth";
import { SchoolNav, type NavSection } from "@/components/school-nav";
import { FlashToast } from "@/components/flash-toast";
import { NotificationBell } from "@/components/notification-bell";
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

  const [unread, recentNotifications] = await Promise.all([
    prisma.notification.count({
      where: { schoolId, userId: user.id, read: false },
    }),
    prisma.notification.findMany({
      where: { schoolId, userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const serializedNotifications = recentNotifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
  }));

  const role = access.role;
  const base = `/s/${schoolId}`;

  let items: { href: string; label: string }[] = [];
  let sections: NavSection[] = [];

  if (role === "STUDENT") {
    items = [
      { href: `${base}/student`, label: "Tableau de bord" },
      { href: `${base}/student/schedule`, label: "Emploi du temps" },
      { href: `${base}/student/grades`, label: "Notes & Bulletins" },
      { href: `${base}/student/evaluations`, label: "Examens & Évaluations" },
      { href: `${base}/student/homework`, label: "Devoirs à rendre" },
      { href: `${base}/student/courses`, label: "Cours & Documents" },
      { href: `${base}/student/attendance`, label: "Mes Absences" },
      { href: `${base}/student/profile`, label: "Mon Espace Personnel" },
      {
        href: `${base}/student/notifications`,
        label: unread ? `Notifications (${unread})` : "Notifications",
      },
    ];
  } else if (role === "PARENT") {
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
          { href: `${base}/students`, label: "Élèves" },
          { href: `${base}/admissions`, label: "Admissions et inscriptions" },
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
        : role === "STUDENT"
          ? "Élève"
          : "Parent";

  const notificationsHref =
    role === "STUDENT"
      ? `${base}/student/notifications`
      : role === "PARENT"
        ? `${base}/parent/notifications`
        : null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#f4f8fc]">
      <SchoolNav
        schoolId={schoolId}
        schoolName={access.school.name}
        userName={`${user.firstName} ${user.lastName}`}
        role={roleLabel}
        items={items}
        sections={sections}
        unreadNotificationsCount={unread}
        recentNotifications={serializedNotifications}
        notificationsHref={notificationsHref}
      />
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Barre supérieure persistante (Desktop) avec cloche de notifications en haut à droite */}
        <header className="no-print hidden md:flex sticky top-0 z-30 h-16 w-full items-center justify-between border-b border-[#c9d7ee]/70 bg-white/80 px-6 backdrop-blur-md lg:px-10 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="font-[family-name:var(--font-fraunces)] font-bold text-sm text-[#002b5b]">
              {access.school.name}
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef5fc] px-2.5 py-0.5 text-xs font-bold text-[#002b5b]">
              {role === "STUDENT" ? "🎒 Espace Élève" : roleLabel}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* 🔔 Bouton de notification en haut */}
            <NotificationBell
              schoolId={schoolId}
              unreadCount={unread}
              notifications={serializedNotifications}
              notificationsHref={notificationsHref}
            />

            <div className="h-5 w-px bg-slate-200" />

            <div className="flex items-center gap-2.5 text-xs">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#002b5b] font-bold text-white shadow-2xs">
                {user.firstName[0]}
              </div>
              <div className="text-left leading-tight">
                <p className="font-bold text-[#0c2340]">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] text-[#5a7199]">{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-7xl">
            <Suspense fallback={null}>
              <FlashToast />
            </Suspense>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
