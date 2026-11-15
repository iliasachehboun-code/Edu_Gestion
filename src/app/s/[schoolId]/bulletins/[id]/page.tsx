import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { fullName } from "@/lib/utils";

export default async function BulletinDetailPage({
  params,
}: {
  params: Promise<{ schoolId: string; id: string }>;
}) {
  const { schoolId, id } = await params;
  const { school } = await requireSchoolAccess(schoolId);

  const card = await prisma.reportCard.findFirst({
    where: { id, schoolId },
    include: {
      student: true,
      term: true,
      academicYear: true,
      lines: { include: { subject: true }, orderBy: { subject: { name: "asc" } } },
    },
  });

  if (!card) notFound();

  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href={`/s/${schoolId}/bulletins`}
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Retour
        </Link>
        <PrintButton />
      </div>

      <Card className="mx-auto max-w-3xl print:border-0 print:shadow-none">
        <div className="border-b border-line pb-4 text-center">
          <h1 className="font-display text-2xl font-semibold text-brand">
            {school.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Bulletin scolaire — {card.term.name} — {card.academicYear.name}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted">Élève</p>
            <p className="font-medium">
              {fullName(card.student.firstName, card.student.lastName)}
            </p>
          </div>
          <div>
            <p className="text-muted">Matricule</p>
            <p className="font-medium">{card.student.matricule || "—"}</p>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="py-2">Matière</th>
              <th className="py-2">Coef</th>
              <th className="py-2">Moyenne</th>
            </tr>
          </thead>
          <tbody>
            {card.lines.map((line) => (
              <tr key={line.id} className="border-b border-line">
                <td className="py-2">{line.subject.name}</td>
                <td className="py-2">{line.coefficient}</td>
                <td className="py-2 font-medium">{line.average}/20</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex items-center justify-between rounded-lg bg-brand-soft px-4 py-3">
          <span className="font-medium text-brand">Moyenne générale</span>
          <span className="font-display text-2xl font-semibold text-brand">
            {card.average != null ? `${card.average}/20` : "—"}
          </span>
        </div>

        {card.appreciation ? (
          <div className="mt-6 text-sm">
            <p className="text-muted">Appréciation</p>
            <p className="mt-1">{card.appreciation}</p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
