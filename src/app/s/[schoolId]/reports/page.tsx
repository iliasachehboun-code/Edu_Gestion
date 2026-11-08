import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";

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
      />
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-[#3d5278]">
              {group.title}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {group.items.map((item, index) => {
                const accents = [
                  "border-l-4 border-l-[#002b5b]",
                  "border-l-4 border-l-[#e2c200]",
                  "border-l-4 border-l-[#264c93]",
                  "border-l-4 border-l-[#8fe3cf]",
                ];
                return (
                <Link key={item.label} href={`/s/${schoolId}/${item.href}`}>
                  <Card className={`transition hover:-translate-y-0.5 hover:shadow-md ${accents[index % accents.length]}`}>
                    <p className="text-sm text-[#3d5278]">{item.label}</p>
                    <p className="mt-2 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#002b5b]">
                      {item.value}
                    </p>
                  </Card>
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
