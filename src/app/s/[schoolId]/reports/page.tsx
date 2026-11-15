import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { schoolTrail } from "@/components/breadcrumbs";
import { ExportMenu } from "@/components/export-menu";
import { PageHeader, SectionTitle, StatCard } from "@/components/ui";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const [
    students,
    teachers,
    classes,
    subjects,
    grades,
    absences,
    late,
    unpaid,
    paid,
    published,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId, active: true } }),
    prisma.teacher.count({ where: { schoolId, active: true } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.subject.count({ where: { schoolId } }),
    prisma.grade.count({ where: { schoolId } }),
    prisma.attendance.count({ where: { schoolId, status: "ABSENT" } }),
    prisma.attendance.count({ where: { schoolId, status: "LATE" } }),
    prisma.studentFee.count({
      where: { schoolId, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
    }),
    prisma.studentFee.count({ where: { schoolId, status: "PAID" } }),
    prisma.reportCard.count({ where: { schoolId, published: true } }),
  ]);

  const groups = [
    {
      title: "Effectifs",
      items: [
        { label: "Étudiants actifs", value: students, href: "students" },
        { label: "Enseignants", value: teachers, href: "teachers" },
        { label: "Classes", value: classes, href: "classes" },
        { label: "Matières", value: subjects, href: "subjects" },
      ],
    },
    {
      title: "Pédagogie",
      items: [
        { label: "Notes saisies", value: grades, href: "grades" },
        { label: "Bulletins publiés", value: published, href: "grades" },
        { label: "Absences", value: absences, href: "attendance" },
        { label: "Retards", value: late, href: "attendance" },
      ],
    },
    {
      title: "Finances",
      items: [
        { label: "Frais soldés", value: paid, href: "payments" },
        { label: "Frais en cours", value: unpaid, href: "payments" },
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        title="Rapports et statistiques"
        description="Vue d'ensemble de l'établissement."
        breadcrumbs={schoolTrail(schoolId, {
          label: "Rapports",
          path: "/reports",
        })}
        actions={
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <ExportMenu
              label="Élèves"
              csvHref={`/s/${schoolId}/export/students`}
              pdfHref={`/s/${schoolId}/export/students/print`}
            />
            <ExportMenu
              label="Caisse"
              csvHref={`/s/${schoolId}/export/cash-journal`}
              pdfHref={`/s/${schoolId}/export/cash-journal/print`}
            />
          </div>
        }
      />
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.title}>
            <SectionTitle className="mb-3 font-sans text-sm font-semibold tracking-wide text-muted">
              {group.title}
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {group.items.map((item, index) => {
                const accents = ["brand", "sun", "sky", "accent"] as const;
                return (
                  <Link
                    key={item.label}
                    href={`/s/${schoolId}/${item.href}`}
                    className="block min-w-0"
                  >
                    <StatCard
                      label={item.label}
                      value={item.value}
                      accent={accents[index % accents.length]}
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
