import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentForUser } from "@/lib/student";
import { Card, Table, Td, Th, Badge } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { fullName, round1 } from "@/lib/utils";

export default async function StudentBulletinDetailPage({
  params,
}: {
  params: Promise<{ schoolId: string; id: string }>;
}) {
  const { schoolId, id } = await params;
  const { user, school } = await requireSchoolAccess(schoolId, [
    "STUDENT",
    "SCHOOL_ADMIN",
  ]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) notFound();

  const card = await prisma.reportCard.findFirst({
    where: {
      id,
      schoolId,
      published: true,
      ...(user.globalRole !== "SUPER_ADMIN" && user.id === student.userId
        ? { studentId: student.id }
        : {}),
    },
    include: {
      student: true,
      term: true,
      academicYear: true,
      lines: {
        include: { subject: true },
        orderBy: { subject: { name: "asc" } },
      },
    },
  });

  if (!card) notFound();

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      schoolId,
      studentId: card.studentId,
      academicYearId: card.academicYearId,
    },
    include: { class: true },
  });

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <Link
          href={`/s/${schoolId}/student/grades`}
          className="text-sm font-semibold text-[#264c93] hover:underline"
        >
          &larr; Retour à mes notes
        </Link>
        <PrintButton />
      </div>

      <Card className="mx-auto max-w-4xl p-8">
        <div className="border-b-2 border-[#002b5b] pb-6 text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-bold text-[#002b5b]">
            {school.name}
          </h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-widest text-[#3d5278]">
            Bulletin semestriel de notes
          </p>
          <p className="mt-2 text-sm text-[#5a7199]">
            {card.term.name} · Année scolaire {card.academicYear.name}
          </p>
        </div>

        <div className="my-6 grid grid-cols-2 gap-4 rounded-xl bg-[#f4f8fc] p-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-[#5a7199]">Élève</p>
            <p className="font-bold text-[#0c2340]">
              {fullName(card.student.firstName, card.student.lastName)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#5a7199]">Matricule</p>
            <p className="font-bold text-[#0c2340]">{card.student.matricule || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[#5a7199]">Classe</p>
            <p className="font-bold text-[#0c2340]">
              {enrollment?.class.name || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#5a7199]">Moyenne générale</p>
            <p className="text-lg font-bold text-[#002b5b]">
              {card.average !== null ? `${round1(card.average)} / 20` : "—"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Table>
            <thead>
              <tr>
                <Th>Matière</Th>
                <Th>Coefficient</Th>
                <Th>Moyenne / 20</Th>
                <Th>Appréciation du professeur</Th>
              </tr>
            </thead>
            <tbody>
              {card.lines.map((line) => (
                <tr key={line.id}>
                  <Td className="font-medium text-[#0c2340]">
                    {line.subject.name}
                  </Td>
                  <Td className="text-sm text-[#3d5278]">{line.coefficient}</Td>
                  <Td>
                    <Badge
                      tone={
                        line.average >= 12
                          ? "success"
                          : line.average >= 10
                            ? "warning"
                            : "danger"
                      }
                    >
                      {round1(line.average)} / 20
                    </Badge>
                  </Td>
                  <Td className="text-xs italic text-[#3d5278]">
                    {line.appreciation || "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {card.appreciation ? (
          <div className="mt-8 rounded-xl border border-[#c9d7ee] bg-[#fbfdff] p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#002b5b]">
              Avis du conseil de classe
            </h3>
            <p className="mt-2 text-sm italic text-[#0c2340]">
              « {card.appreciation} »
            </p>
          </div>
        ) : null}

        <div className="mt-12 flex justify-between border-t border-[#e6eef8] pt-6 text-xs text-[#5a7199]">
          <p>Document officiel émis par {school.name}</p>
          <p>Date d&apos;émission : {card.publishedAt ? new Date(card.publishedAt).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")}</p>
        </div>
      </Card>
    </div>
  );
}
