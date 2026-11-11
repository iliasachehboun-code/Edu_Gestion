import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  SectionTitle,
  StatCard,
} from "@/components/ui";
import { schoolTrail } from "@/components/breadcrumbs";
import { redirect } from "next/navigation";
import { formatDate, formatMoney, fullName } from "@/lib/utils";

export default async function SchoolDashboard({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { role, school } = await requireSchoolAccess(schoolId);

  if (role === "PARENT") redirect(`/s/${schoolId}/parent`);
  if (role === "TEACHER") redirect(`/s/${schoolId}/teacher`);

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const inSevenDays = new Date(today);
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  const [
    students,
    teachers,
    classes,
    unpaid,
    overdue,
    absencesToday,
    dueSoon,
    recentAbsences,
    currentYear,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, active: true } }),
    prisma.teacher.count({ where: { schoolId, active: true } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.studentFee.count({
      where: { schoolId, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
    }),
    prisma.studentFee.count({
      where: { schoolId, status: "OVERDUE" },
    }),
    prisma.attendance.count({
      where: {
        schoolId,
        date: today,
        status: { in: ["ABSENT", "LATE"] },
      },
    }),
    prisma.studentFee.findMany({
      where: {
        schoolId,
        status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
        dueDate: { gte: today, lte: inSevenDays },
      },
      include: { student: true, feeType: true },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
    prisma.attendance.findMany({
      where: {
        schoolId,
        status: { in: ["ABSENT", "LATE", "EXCUSED"] },
      },
      include: { student: true, class: true },
      orderBy: { date: "desc" },
      take: 6,
    }),
    prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    }),
  ]);

  const cards = [
    {
      label: "Élèves",
      value: students,
      href: `/s/${schoolId}/students`,
      accent: "brand" as const,
    },
    {
      label: "Absences / retards du jour",
      value: absencesToday,
      href: `/s/${schoolId}/attendance`,
      accent: "sun" as const,
    },
    {
      label: "Frais en retard",
      value: overdue,
      href: `/s/${schoolId}/payments?status=OVERDUE&tab=liste`,
      accent: "sky" as const,
    },
    {
      label: "Frais en cours",
      value: unpaid,
      href: `/s/${schoolId}/payments`,
      accent: "accent" as const,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        breadcrumbs={schoolTrail(schoolId, {
          label: "Tableau de bord",
          path: "",
        })}
        description={
          currentYear
            ? `${school.name} · année ${currentYear.name}`
            : school.name
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/s/${schoolId}/attendance`}>
              <Button type="button" variant="secondary">
                Faire l&apos;appel
              </Button>
            </Link>
            <Link href={`/s/${schoolId}/payments?tab=payer`}>
              <Button type="button">Encaisser un paiement</Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="block min-w-0">
            <StatCard label={c.label} value={c.value} accent={c.accent} />
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-4 border-l-brand">
          <p className="text-sm text-muted">Enseignants</p>
          <p className="mt-1 font-display text-2xl font-semibold text-brand">
            {teachers}
          </p>
          <Link
            href={`/s/${schoolId}/teachers`}
            className="mt-2 inline-block text-sm font-semibold text-brand hover:underline"
          >
            Voir le personnel
          </Link>
        </Card>
        <Card className="border-l-4 border-l-sky">
          <p className="text-sm text-muted">Classes</p>
          <p className="mt-1 font-display text-2xl font-semibold text-brand">
            {classes}
          </p>
          <Link
            href={`/s/${schoolId}/classes`}
            className="mt-2 inline-block text-sm font-semibold text-brand hover:underline"
          >
            Gérer les classes
          </Link>
        </Card>
        <Card className="sm:col-span-2">
          <p className="text-sm font-semibold text-brand">Accès rapides</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/s/${schoolId}/students`}>
              <Button type="button" variant="secondary">
                Élèves
              </Button>
            </Link>
            <Link href={`/s/${schoolId}/grades`}>
              <Button type="button" variant="secondary">
                Notes
              </Button>
            </Link>
            <Link href={`/s/${schoolId}/reports`}>
              <Button type="button" variant="secondary">
                Rapports
              </Button>
            </Link>
            <Link href={`/s/${schoolId}/communication`}>
              <Button type="button" variant="secondary">
                Communication
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Échéances à 7 jours</SectionTitle>
          {dueSoon.length === 0 ? (
            <p className="text-sm text-muted">Aucune échéance proche.</p>
          ) : (
            <ul className="space-y-3">
              {dueSoon.map((fee) => (
                <li
                  key={fee.id}
                  className="flex items-start justify-between gap-3 border-b border-brand-soft pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {fullName(fee.student.firstName, fee.student.lastName)}
                    </p>
                    <p className="text-sm text-muted">
                      {fee.feeType.name} · {formatMoney(fee.amount)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-brand">
                      {formatDate(fee.dueDate)}
                    </p>
                    <Badge
                      tone={
                        fee.status === "OVERDUE"
                          ? "danger"
                          : fee.status === "PARTIAL"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {fee.status === "OVERDUE"
                        ? "En retard"
                        : fee.status === "PARTIAL"
                          ? "Partiel"
                          : "En attente"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/s/${schoolId}/payments?tab=liste`}
            className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
          >
            Voir toutes les finances
          </Link>
        </Card>

        <Card>
          <SectionTitle>Absences récentes</SectionTitle>
          {recentAbsences.length === 0 ? (
            <p className="text-sm text-muted">Aucune absence récente.</p>
          ) : (
            <ul className="space-y-3">
              {recentAbsences.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 border-b border-brand-soft pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {fullName(row.student.firstName, row.student.lastName)}
                    </p>
                    <p className="text-sm text-muted">
                      {row.class.name} · {formatDate(row.date)}
                    </p>
                  </div>
                  <Badge
                    tone={
                      row.status === "ABSENT"
                        ? "danger"
                        : row.status === "LATE"
                          ? "warning"
                          : "info"
                    }
                  >
                    {row.status === "ABSENT"
                      ? "Absent"
                      : row.status === "LATE"
                        ? "Retard"
                        : "Excusé"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/s/${schoolId}/attendance`}
            className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
          >
            Ouvrir les présences
          </Link>
        </Card>
      </div>
    </div>
  );
}
