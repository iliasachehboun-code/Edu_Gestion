import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentForUser } from "@/lib/student";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import {
  computeTermGradesSummary,
  findCurrentTerm,
  getClassRelevantSubjects,
} from "@/lib/student-grades";
import { round1 } from "@/lib/utils";

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
    return <EmptyState message="Aucun dossier élève trouvé." />;
  }

  const enrollment = student.enrollments[0];
  const academicYearId = enrollment?.academicYearId;

  // Récupérer les semestres de l'année scolaire
  const terms = academicYearId
    ? await prisma.term.findMany({
        where: { academicYearId },
        orderBy: { order: "asc" },
      })
    : [];

  const currentTerm =
    (sp.termId ? terms.find((t) => t.id === sp.termId) : undefined) ||
    findCurrentTerm(terms);
  const selectedTermId = currentTerm?.id || "";

  // Récupérer les matières pertinentes pour la classe / l'élève
  const subjects = await getClassRelevantSubjects(
    schoolId,
    student.id,
    enrollment?.classId
  );

  // Récupérer les notes de l'élève pour le semestre sélectionné
  const grades = selectedTermId
    ? await prisma.grade.findMany({
        where: {
          schoolId,
          studentId: student.id,
          termId: selectedTermId,
        },
        include: {
          subject: true,
          term: true,
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

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

  const {
    rows,
    evaluatedSubjectsCount,
    totalCoefficient: totalCoeff,
    semesterAverage: semesterGrade,
  } = computeTermGradesSummary(subjects, grades);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notes & Bulletins"
        description="Relevé des notes de contrôles continus et moyennes semestrielles."
      />

      {/* Sélecteur de Semestre */}
      {terms.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-[#c9d7ee] pb-4">
          <span className="text-sm font-semibold text-[#1a3d6e]">Semestre :</span>
          {terms.map((t) => {
            const isSelected = t.id === selectedTermId;
            return (
              <Link
                key={t.id}
                href={`/s/${schoolId}/student/grades?termId=${t.id}`}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                  isSelected
                    ? "bg-[#002b5b] text-white shadow-md ring-2 ring-[#8fe3cf]"
                    : "bg-white text-[#002b5b] border border-[#c9d7ee] hover:bg-[#f4f8fc]"
                }`}
              >
                {t.name}
              </Link>
            );
          })}
        </div>
      ) : null}

      {/* Carte synthétique de la note du Semestre */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-[#002b5b] bg-gradient-to-br from-white to-[#f4f8fc]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Note du {currentTerm?.name || "Semestre"}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-[#002b5b]">
              {semesterGrade !== null ? `${semesterGrade}` : "—"}
            </span>
            <span className="text-base font-bold text-[#3d5278]">/ 20</span>
          </div>
          <p className="mt-2 text-xs text-[#5a7199]">
            Moyenne générale calculée avec coefficients
          </p>
        </Card>

        <Card className="border-l-4 border-l-[#8fe3cf]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Matières évaluées
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold text-[#0c2340]">
              {evaluatedSubjectsCount}
            </span>
            <span className="text-xs text-[#3d5278]">/ {rows.length} matières</span>
          </div>
          <p className="mt-2 text-xs text-[#5a7199]">Pour cette période</p>
        </Card>

        <Card className="border-l-4 border-l-[#264c93]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Statut académique
          </p>
          <div className="mt-2">
            {semesterGrade !== null ? (
              <Badge
                tone={
                  semesterGrade >= 14
                    ? "success"
                    : semesterGrade >= 10
                      ? "warning"
                      : "danger"
                }
              >
                {semesterGrade >= 14
                  ? "Très bon travail"
                  : semesterGrade >= 10
                    ? "Admis / Satisfaisant"
                    : "En difficulté"}
              </Badge>
            ) : (
              <span className="text-sm text-[#3d5278]">En attente de notes</span>
            )}
          </div>
          <p className="mt-3 text-xs text-[#5a7199]">
            {enrollment?.class.name || "Élève"}
            {enrollment?.academicYear.name ? ` · ${enrollment.academicYear.name}` : ""}
          </p>
        </Card>
      </div>

      {/* Tableau récapitulatif : Matière, CC1, CC2, CC3, Moyenne générale */}
      <Card className="p-0 overflow-hidden shadow-md border-[#b7c9e6]">
        <div className="border-b border-[#d7efe8] bg-[#e5f8f3] px-6 py-4">
          <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#002b5b]">
            Relevé des notes — {currentTerm?.name || "Semestre"}
          </h2>
          <p className="text-xs text-[#3d5278]">
            Contrôles continus et moyenne pondérée par matière
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#5a7199]">
            Aucune matière configurée pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#c9d7ee] bg-[#f4f8fc]">
                  <th className="px-5 py-3.5 font-bold text-[#002b5b]">Matière</th>
                  <th className="px-5 py-3.5 font-semibold text-[#3d5278]">Coefficient</th>
                  <th className="px-5 py-3.5 font-semibold text-[#002b5b] text-center">
                    Contrôle Continu 1
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-[#002b5b] text-center">
                    Contrôle Continu 2
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-[#002b5b] text-center">
                    Contrôle Continu 3
                  </th>
                  <th className="px-5 py-3.5 font-bold text-[#002b5b] text-right">
                    Moyenne Matière
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, index) => {
                  const isEven = index % 2 === 0;
                  const slots = [r.cc1, r.cc2, r.cc3];
                  return (
                    <tr
                      key={r.subjectId}
                      className={`border-b border-[#eef2f7] transition hover:bg-[#fbfdff] ${
                        isEven ? "bg-white" : "bg-[#fcfdfe]"
                      }`}
                    >
                      <td className="px-5 py-3.5 font-semibold text-[#0c2340]">
                        <div>{r.subjectName}</div>
                        {r.extraGrades.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {r.extraGrades.map((eg, i) => (
                              <span
                                key={i}
                                className="rounded bg-[#eef5fc] px-1.5 py-0.5 text-[10px] font-medium text-[#264c93]"
                              >
                                {eg.title || eg.type} : {eg.score20}/20
                                {eg.coefficient !== 1 ? ` (×${eg.coefficient})` : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#3d5278]">
                        Coeff. {r.coefficient}
                      </td>
                      {slots.map((slot, slotIdx) => (
                        <td key={slotIdx} className="px-5 py-3.5 text-center font-medium">
                          {slot !== null ? (
                            <span
                              title={slot.title || slot.type}
                              className="inline-block rounded-lg bg-[#f0f4fa] px-3 py-1 text-sm font-semibold text-[#0c2340]"
                            >
                              {slot.score20} / 20
                              {slot.coefficient !== 1 ? (
                                <span className="ml-1 text-[10px] text-[#5a7199]">
                                  (×{slot.coefficient})
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-5 py-3.5 text-right font-bold">
                        {r.average !== null ? (
                          <Badge
                            tone={
                              r.average >= 12
                                ? "success"
                                : r.average >= 10
                                  ? "warning"
                                  : "danger"
                            }
                          >
                            {r.average} / 20
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            {/* Ligne en bas du tableau : Note du Semestre */}
            <tfoot>
              <tr className="border-t-2 border-[#002b5b] bg-[#e5f8f3]/70">
                <td
                  colSpan={2}
                  className="px-5 py-4 font-bold text-[#002b5b] uppercase tracking-wider"
                >
                  Note du {currentTerm?.name || "Semestre"}
                </td>
                <td colSpan={3} className="px-5 py-4 text-xs text-[#3d5278] text-center">
                  Total des coefficients : {totalCoeff}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex items-baseline gap-1 rounded-xl bg-[#002b5b] px-4 py-2 text-white shadow-sm">
                    <span className="text-lg font-extrabold">
                      {semesterGrade !== null ? `${semesterGrade}` : "—"}
                    </span>
                    <span className="text-xs font-semibold text-[#8fe3cf]">/ 20</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        )}
      </Card>

      {/* Bulletins officiels */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-semibold text-[#0c2340]">
          Bulletins officiels du semestre
        </h2>
        {reportCards.length === 0 ? (
          <EmptyState message="Aucun bulletin officiel n'a encore été publié pour ce semestre." />
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
