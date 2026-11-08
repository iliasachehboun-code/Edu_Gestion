import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";

export default async function SchoolDashboard({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { role, school } = await requireSchoolAccess(schoolId);

  if (role === "PARENT") redirect(`/s/${schoolId}/parent`);
  if (role === "TEACHER") redirect(`/s/${schoolId}/teacher`);

  const [students, teachers, classes, unpaid] = await Promise.all([
    prisma.student.count({ where: { schoolId, active: true } }),
    prisma.teacher.count({ where: { schoolId, active: true } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.studentFee.count({
      where: { schoolId, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
    }),
  ]);

  const currentYear = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
  });

  const cards = [
    { label: "Élèves", value: students, href: `/s/${schoolId}/students` },
    { label: "Enseignants", value: teachers, href: `/s/${schoolId}/teachers` },
    { label: "Classes", value: classes, href: `/s/${schoolId}/classes` },
    { label: "Frais en cours", value: unpaid, href: `/s/${schoolId}/payments` },
  ];

  const accents = [
    "border-l-4 border-l-[#002b5b]",
    "border-l-4 border-l-[#e2c200]",
    "border-l-4 border-l-[#264c93]",
    "border-l-4 border-l-[#8fe3cf]",
  ];

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description={
          currentYear
            ? `${school.name} · année ${currentYear.name}`
            : school.name
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, index) => (
          <Link key={c.label} href={c.href}>
            <Card className={`transition hover:-translate-y-0.5 hover:shadow-md ${accents[index]}`}>
              <p className="text-sm font-medium text-[#3d5278]">{c.label}</p>
              <p className="mt-2 font-[family-name:var(--font-fraunces)] text-4xl font-semibold text-[#002b5b]">
                {c.value}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
