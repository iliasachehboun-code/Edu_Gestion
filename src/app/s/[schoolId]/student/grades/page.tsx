import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentForUser } from "@/lib/student";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { formatDate, round1 } from "@/lib/utils";

export default async function StudentGradesPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ termId?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  const { user } = await requireSchoolAccess(schoolId, ["STUDENT", "SCHOOL_ADMIN"]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) {
    return <EmptyState message="Aucun dossier étudiant trouvé." />;
  }

  const enrollment = student.enrollments[0];
  const academicYearId = enrollment?.academicYearId;

  // Récupérer les trimestres de l'année scolaire
  const terms = academicYearId
    ? await prisma.term.findMany({
        where: { academicYearId },
        orderBy: { order: "asc" },
      })
    : [];

  const selectedTermId = sp.termId || (terms[0]?.id ?? "");

  // Récupérer les notes de l'élève (filtrées par trimestre si spécifié)
  const grades = await prisma.grade.findMany({
    where: {
      schoolId,
      studentId: student.id,
      ...(selectedTermId ? { termId: selectedTermId } : {}),
    },
    include: {
      subject: true,
      term: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Récupérer les bulletins publiés pour cet élève
  const reportCards = await prisma.reportCard.findMany({
    where: {
      schoolId,
      studentId: student.id,
      published: true,
    },
    include: {
      term: true,
      academicYear: true,
      lines: {
        include: { subject: true },
      },
    },
    orderBy: { term: { order: "desc" } },
  });

  // Regrouper les notes par matière
  type SubjectSummary = {
    subjectName: string;
    coefficient: number;
    grades: typeof grades;
    average: number | null;
  };

  const subjectMap = new Map<string, SubjectSummary>();

  for (const g of grades) {
    const existing = subjectMap.get(g.subject.name) || {
      subjectName: g.subject.name,
      coefficient: g.subject.coefficient,
      grades: [],
      average: null,
    };
    existing.grades.push(g);
    subjectMap.set(g.subject.name, existing);
  }

  // Calculer la moyenne par matière
  for (const summary of subjectMap.values()) {
    const valid = summary.grades.filter((g) => g.maxScore > 0);
    const sum = valid.reduce((acc, g) => acc + (g.score / g.maxScore) * 20 * g.coefficient, 0);
    const totalCoeff = valid.reduce((acc, g) => acc + g.coefficient, 0);
    summary.average = totalCoeff > 0 ? round1(sum / totalCoeff) : null;
  }

  // Moyenne générale du trimestre sélectionné
  const subjectList = Array.from(subjectMap.values());
  const subjectsWithAverage = subjectList.filter((s) => s.average !== null);
  const totalSubjectCoeffs = subjectsWithAverage.reduce((acc, s) => acc + s.coefficient, 0);
  const totalSubjectScores = subjectsWithAverage.reduce(
    (acc, s) => acc + (s.average ?? 0) * s.coefficient,
    0
  );
  const periodOverallAverage =
    totalSubjectCoeffs > 0 ? round1(totalSubjectScores / totalSubjectCoeffs) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes notes & bulletins"
        description="Consultez le détail de vos évaluations par matière et vos bulletins officiels."
      />

      {/* Sélecteur de trimestre */}
      {terms.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#c9d7ee] pb-4">
          <span className="text-sm font-semibold text-[#1a3d6e]">Trimestre :</span>
          {terms.map((t) => {
            const isSelected = t.id === selectedTermId;
            return (
              <Link
                key={t.id}
                href={`/s/${schoolId}/student/grades?termId=${t.id}`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "bg-[#002b5b] text-white shadow-sm"
                    : "bg-white text-[#002b5b] border border-[#c9d7ee] hover:bg-[#f4f8fc]"
                }`}
              >
                {t.name}
              </Link>
            );
          })}
        </div>
      ) : null}

      {/* Résumé de la période */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-[#002b5b]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Moyenne du trimestre
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0c2340]">
              {periodOverallAverage !== null ? `${periodOverallAverage}` : "—"}
            </span>
            <span className="text-sm font-medium text-[#3d5278]">/ 20</span>
          </div>
        </Card>

        <Card className="border-l-4 border-l-[#8fe3cf]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Total des évaluations
          </p>
          <div className="mt-2">
            <span className="text-3xl font-bold text-[#0c2340]">
              {grades.length}
            </span>
          </div>
        </Card>

        <Card className="border-l-4 border-l-[#264c93]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Matières notées
          </p>
          <div className="mt-2">
            <span className="text-3xl font-bold text-[#0c2340]">
              {subjectList.length}
            </span>
          </div>
        </Card>
      </div>

      {/* Tableaux par matière */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-[#0c2340]">
          Détail par matière
        </h2>

        {subjectList.length === 0 ? (
          <EmptyState message="Aucune note enregistrée pour ce trimestre." />
        ) : (
          <div className="space-y-6">
            {subjectList.map((sub) => (
              <Card key={sub.subjectName} className="overflow-hidden">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#e6eef8] pb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-[#0c2340]">
                      {sub.subjectName}
                    </h3>
                    <Badge tone="info">Coeff. {sub.coefficient}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#3d5278]">Moyenne matière :</span>
                    <Badge
                      tone={
                        sub.average !== null && sub.average >= 12
                          ? "success"
                          : sub.average !== null && sub.average >= 10
                            ? "warning"
                            : "danger"
                      }
                    >
                      {sub.average !== null ? `${sub.average} / 20` : "—"}
                    </Badge>
                  </div>
                </div>

                <Table>
                  <thead>
                    <tr>
                      <Th>Évaluation</Th>
                      <Th>Type</Th>
                      <Th>Date</Th>
                      <Th>Coeff.</Th>
                      <Th>Note</Th>
                      <Th>Appréciation</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sub.grades.map((g) => {
                      const scoreOver20 = (g.score / g.maxScore) * 20;
                      return (
                        <tr key={g.id}>
                          <Td className="font-medium text-[#0c2340]">
                            {g.title || "Évaluation"}
                          </Td>
                          <Td>
                            <span className="rounded bg-[#f0f4fa] px-2 py-0.5 text-xs text-[#264c93]">
                              {g.type}
                            </span>
                          </Td>
                          <Td className="text-xs text-[#3d5278]">
                            {formatDate(g.createdAt)}
                          </Td>
                          <Td className="text-xs text-[#3d5278]">{g.coefficient}</Td>
                          <Td>
                            <Badge
                              tone={
                                scoreOver20 >= 12
                                  ? "success"
                                  : scoreOver20 >= 10
                                    ? "warning"
                                    : "danger"
                              }
                            >
                              {g.score} / {g.maxScore}
                            </Badge>
                          </Td>
                          <Td className="text-xs italic text-[#5a7199]">
                            {g.comment || "—"}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bulletins officiels */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-semibold text-[#0c2340]">
          Bulletins officiels publiés
        </h2>
        {reportCards.length === 0 ? (
          <EmptyState message="Aucun bulletin officiel n'a encore été publié pour votre classe." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reportCards.map((card) => (
              <Card key={card.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#0c2340]">{card.term.name}</h3>
                    <Badge tone="success">Publié</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#3d5278]">
                    Année {card.academicYear.name}
                  </p>
                  <div className="my-4">
                    <span className="text-xs text-[#3d5278]">Moyenne générale :</span>
                    <p className="text-2xl font-bold text-[#002b5b]">
                      {card.average !== null ? `${round1(card.average)} / 20` : "—"}
                    </p>
                  </div>
                  {card.appreciation ? (
                    <p className="text-xs italic text-[#5a7199]">
                      « {card.appreciation} »
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 pt-3 border-t border-[#e6eef8]">
                  <Link
                    href={`/s/${schoolId}/student/bulletins/${card.id}`}
                    className="inline-block text-xs font-bold text-[#264c93] hover:underline"
                  >
                    Consulter et imprimer le bulletin &rarr;
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
