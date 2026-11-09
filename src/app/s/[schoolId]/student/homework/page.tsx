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

export default async function StudentHomeworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  const { user } = await requireSchoolAccess(schoolId, ["STUDENT", "SCHOOL_ADMIN"]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) {
    return <EmptyState message="Aucun profil étudiant associé." />;
  }

  const enrollment = student.enrollments[0];
  const selectedSubjectId = sp.subjectId || "";

  // Récupérer les matières
  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
  });

  // Récupérer tous les devoirs et évaluations notées
  const homeworkGrades = await prisma.grade.findMany({
    where: {
      schoolId,
      studentId: student.id,
      type: { in: ["DEVOIR", "AUTRE"] },
      ...(selectedSubjectId ? { subjectId: selectedSubjectId } : {}),
    },
    include: {
      subject: true,
      term: true,
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Récupérer aussi les examens / contrôles pour révision
  const examGrades = await prisma.grade.findMany({
    where: {
      schoolId,
      studentId: student.id,
      type: { in: ["CONTROLE", "EXAMEN"] },
      ...(selectedSubjectId ? { subjectId: selectedSubjectId } : {}),
    },
    include: {
      subject: true,
      term: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Calcul moyenne devoirs
  const validHw = homeworkGrades.filter((h) => h.maxScore > 0);
  const hwSum = validHw.reduce(
    (acc, h) => acc + (h.score / h.maxScore) * 20 * h.coefficient,
    0
  );
  const hwCoeff = validHw.reduce((acc, h) => acc + h.coefficient, 0);
  const hwAverage = hwCoeff > 0 ? round1(hwSum / hwCoeff) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Devoirs & Travaux scolaires"
        description="Suivez vos devoirs à la maison, devoirs surveillés et évaluations de groupe."
      />

      {/* Résumé métriques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-[#002b5b]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Devoirs notés
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0c2340]">
              {homeworkGrades.length}
            </span>
            <span className="text-sm font-medium text-[#3d5278]">travaux</span>
          </div>
        </Card>

        <Card className="border-l-4 border-l-[#8fe3cf]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Moyenne sur les devoirs
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0c2340]">
              {hwAverage !== null ? `${hwAverage}` : "—"}
            </span>
            <span className="text-sm font-medium text-[#3d5278]">/ 20</span>
          </div>
        </Card>

        <Card className="border-l-4 border-l-[#264c93]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Contrôles & Examens
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0c2340]">
              {examGrades.length}
            </span>
            <span className="text-sm font-medium text-[#3d5278]">épreuves</span>
          </div>
        </Card>
      </div>

      {/* Devoirs notés */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#0c2340]">
            Travaux à rendre et devoirs évalués
          </h2>
        </div>

        {homeworkGrades.length === 0 ? (
          <EmptyState message="Aucun devoir ou travail pratique enregistré." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Matière</Th>
                <Th>Titre du travail</Th>
                <Th>Type</Th>
                <Th>Trimestre</Th>
                <Th>Date</Th>
                <Th>Note obtenue</Th>
                <Th>Commentaire de l&apos;enseignant</Th>
              </tr>
            </thead>
            <tbody>
              {homeworkGrades.map((h) => {
                const scoreOver20 = (h.score / h.maxScore) * 20;
                return (
                  <tr key={h.id}>
                    <Td className="font-semibold text-[#0c2340]">
                      {h.subject.name}
                    </Td>
                    <Td className="font-medium text-[#0c2340]">
                      {h.title || "Devoir maison / travail pratique"}
                    </Td>
                    <Td>
                      <Badge tone="info">{h.type}</Badge>
                    </Td>
                    <Td className="text-xs text-[#3d5278]">{h.term.name}</Td>
                    <Td className="text-xs text-[#3d5278]">
                      {formatDate(h.createdAt)}
                    </Td>
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
                        {h.score} / {h.maxScore} (coeff {h.coefficient})
                      </Badge>
                    </Td>
                    <Td className="text-xs italic text-[#5a7199]">
                      {h.comment || "—"}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>

      {/* Évaluations et contrôles */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-semibold text-[#0c2340]">
          Contrôles continus & Épreuves
        </h2>
        {examGrades.length === 0 ? (
          <EmptyState message="Aucune épreuve enregistrée." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {examGrades.map((exam) => (
              <Card key={exam.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#264c93]">
                      {exam.subject.name}
                    </span>
                    <h3 className="mt-1 text-base font-semibold text-[#0c2340]">
                      {exam.title || `${exam.type} trimestriel`}
                    </h3>
                  </div>
                  <Badge tone={exam.type === "EXAMEN" ? "danger" : "info"}>
                    {exam.type}
                  </Badge>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-[#3d5278]">
                  <span>Date : {formatDate(exam.createdAt)}</span>
                  <span>Coeff : {exam.coefficient}</span>
                  <Badge tone="success">
                    Note : {exam.score} / {exam.maxScore}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
