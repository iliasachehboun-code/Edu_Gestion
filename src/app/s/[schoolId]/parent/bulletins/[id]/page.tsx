import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { fullName } from "@/lib/utils";

export default async function ParentBulletinDetailPage({
  params,
}: {
  params: Promise<{ schoolId: string; id: string }>;
}) {
  const { schoolId, id } = await params;
  const { user, school } = await requireSchoolAccess(schoolId, [
    "PARENT",
    "SCHOOL_ADMIN",
  ]);

  const parent = await prisma.parent.findFirst({
    where: { schoolId, userId: user.id },
    include: { children: true },
  });
  const allowed = new Set(parent?.children.map((c) => c.studentId) || []);

  const card = await prisma.reportCard.findFirst({
    where: { id, schoolId, published: true },
    include: {
      student: true,
      term: true,
      academicYear: true,
      lines: { include: { subject: true }, orderBy: { subject: { name: "asc" } } },
    },
  });

  if (!card || (!allowed.has(card.studentId) && user.globalRole !== "SUPER_ADMIN")) {
    // SCHOOL_ADMIN bypass via membership role SCHOOL_ADMIN already allowed above
    if (!card) notFound();
    if (parent && !allowed.has(card.studentId)) notFound();
  }

  return (
    <div>
      <Link
        href={`/s/${schoolId}/parent/bulletins`}
        className="no-print mb-6 inline-block text-sm font-medium text-[#264c93] hover:underline"
      >
        ← Retour
      </Link>
      <Card className="mx-auto max-w-3xl">
        <div className="border-b border-[#c9d7ee] pb-4 text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#002b5b]">
            {school.name}
          </h1>
          <p className="mt-1 text-sm text-[#3d5278]">
            Bulletin — {card!.term.name} — {card!.academicYear.name}
          </p>
        </div>
        <p className="mt-6 font-medium">
          {fullName(card!.student.firstName, card!.student.lastName)}
        </p>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[#3d5278]">
              <th className="py-2">Matière</th>
              <th className="py-2">Coef</th>
              <th className="py-2">Moyenne</th>
            </tr>
          </thead>
          <tbody>
            {card!.lines.map((line) => (
              <tr key={line.id} className="border-b border-[#e6eef8]">
                <td className="py-2">{line.subject.name}</td>
                <td className="py-2">{line.coefficient}</td>
                <td className="py-2 font-medium">{line.average}/20</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-6 flex justify-between rounded-lg bg-[#e5f8f3] px-4 py-3">
          <span>Moyenne générale</span>
          <strong>
            {card!.average != null ? `${card!.average}/20` : "—"}
          </strong>
        </div>
      </Card>
    </div>
  );
}
