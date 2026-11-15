import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { computeTermGradesSummary, findCurrentTerm } from "@/lib/student-grades";
import { logAuditEvent } from "@/lib/audit";
import { fullName } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

function getObjectiveAppreciation(avg: number | null): string {
  if (avg === null) {
    return "Aucune évaluation saisie pour cette période pour le moment.";
  }
  if (avg >= 16) {
    return "Très bon travail. Les résultats obtenus témoignent d'un excellent investissement.";
  }
  if (avg >= 14) {
    return "Bon travail d'ensemble. Résultats sérieux et réguliers.";
  }
  if (avg >= 12) {
    return "Résultats satisfaisants. Poursuivre les efforts pour consolider les acquis.";
  }
  if (avg >= 10) {
    return "Ensemble convenable. Des progrès sont possibles avec davantage de régularité.";
  }
  return "Résultats fragiles ce semestre. Un travail plus soutenu est nécessaire.";
}

export default async function ReleveNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  const { user, school, role } = await requireSchoolAccess(schoolId, [
    "STUDENT",
    "SCHOOL_ADMIN",
    "PARENT",
  ]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) {
    return <EmptyState message="Dossier élève introuvable." />;
  }

  const enrollment = student.enrollments[0];
  const academicYear = enrollment
    ? await prisma.academicYear.findUnique({
        where: { id: enrollment.academicYearId },
      })
    : null;

  const terms = academicYear
    ? await prisma.term.findMany({
        where: { academicYearId: academicYear.id },
        orderBy: { order: "asc" },
      })
    : [];

  const selectedTerm =
    (sp.term ? terms.find((t) => t.id === sp.term) : undefined) ||
    findCurrentTerm(terms);

  // Récupération des matières, notes et bulletin officiel éventuel pour le semestre sélectionné
  const [subjects, grades, publishedCard] = await Promise.all([
    prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
    }),
    selectedTerm
      ? prisma.grade.findMany({
          where: {
            schoolId,
            studentId: student.id,
            termId: selectedTerm.id,
          },
          include: { subject: true },
          orderBy: { createdAt: "asc" },
        })
      : [],
    selectedTerm
      ? prisma.reportCard.findFirst({
          where: {
            schoolId,
            studentId: student.id,
            termId: selectedTerm.id,
            published: true,
          },
        })
      : null,
  ]);

  const { rows, semesterAverage } = computeTermGradesSummary(subjects, grades);
  const nonEmptyRows = rows.filter((r) => r.allGrades.length > 0);

  const issueDate = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const termName = selectedTerm?.name || "Période en cours";
  const appreciationText =
    publishedCard?.appreciation || getObjectiveAppreciation(semesterAverage);

  // Audit Log
  await logAuditEvent({
    schoolId,
    userId: user.id,
    userName: fullName(user.firstName, user.lastName),
    userRole: role,
    action: "BULLETIN_DOWNLOAD",
    resourceType: "REPORT_CARD",
    resourceId: student.id,
    details: `Édition du Relevé de Notes Officiel (${termName})`,
  });

  return (
    <div className="space-y-6">
      {/* Barre d'action supérieure */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm border border-[#c9d7ee]">
        <Link
          href={`/s/${schoolId}/student/documents`}
          className="text-xs font-bold text-[#264c93] hover:underline flex items-center gap-1"
        >
          &larr; Retour aux documents officiels
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {terms.length > 1 && selectedTerm ? (
            <div className="flex items-center gap-1 bg-[#f0f4f9] p-1 rounded-xl">
              {terms.map((t) => (
                <Link
                  key={t.id}
                  href={`/s/${schoolId}/student/documents/releve-notes?term=${t.id}`}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    t.id === selectedTerm.id
                      ? "bg-[#002b5b] text-white shadow-sm"
                      : "text-[#3d5278] hover:text-[#002b5b]"
                  }`}
                >
                  {t.name}
                </Link>
              ))}
            </div>
          ) : null}

          <PrintButton label="🖨️ Télécharger en PDF / Imprimer" className="text-xs px-4 py-2" />
        </div>
      </div>

      {/* DOCUMENT OFFICIEL A4 */}
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-300 bg-white p-8 sm:p-12 shadow-lg text-[#0c2340] print:border-none print:shadow-none print:p-0">
        {/* En-tête */}
        <div className="flex items-start justify-between border-b-2 border-[#002b5b] pb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3d5278]">
              Relevé Officiel de Scolarité
            </p>
            <h1 className="text-xl font-extrabold text-[#002b5b] font-[family-name:var(--font-fraunces)] pt-1">
              {school.name}
            </h1>
            {school.address ? (
              <p className="text-xs text-[#5a7199]">{school.address}</p>
            ) : null}
          </div>

          <div className="text-right flex flex-col items-end">
            <span className="rounded-xl bg-white p-1 border border-gray-200 shadow-sm inline-block">
              <Image
                src="/henri-moissan.png"
                alt={`Logo ${school.name}`}
                width={70}
                height={42}
                priority
              />
            </span>
            <span className="mt-1 text-[10px] font-bold text-[#002b5b]">
              Année {academicYear?.name || "en cours"}
            </span>
          </div>
        </div>

        {/* Titre */}
        <div className="my-6 text-center space-y-1">
          <h2 className="text-xl font-black uppercase tracking-tight text-[#002b5b] font-[family-name:var(--font-fraunces)]">
            Relevé de Notes — {termName}
          </h2>
          <p className="text-xs text-[#5a7199]">
            Synthèse semestrielle des Contrôles Continus et évaluations
          </p>
        </div>

        {/* Fiche Élève */}
        <div className="rounded-xl border border-[#c9d7ee] bg-[#f4f8fc] p-4 text-xs mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-[#5a7199] block font-bold uppercase text-[10px]">Élève :</span>
            <span className="font-extrabold text-sm text-[#002b5b]">
              {student.lastName.toUpperCase()} {student.firstName}
            </span>
          </div>
          <div>
            <span className="text-[#5a7199] block font-bold uppercase text-[10px]">Classe :</span>
            <span className="font-bold text-sm text-[#0c2340]">
              {enrollment?.class.name || "Non inscrite"}
            </span>
          </div>
          <div>
            <span className="text-[#5a7199] block font-bold uppercase text-[10px]">Matricule :</span>
            <span className="font-mono font-bold text-sm text-[#0c2340]">
              {student.matricule || "—"}
            </span>
          </div>
          <div>
            <span className="text-[#5a7199] block font-bold uppercase text-[10px]">Moyenne Générale :</span>
            <span className="text-sm font-extrabold text-[#00875a]">
              {semesterAverage !== null ? `${semesterAverage} / 20` : "—"}
            </span>
          </div>
        </div>

        {/* Tableau des notes */}
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-[#002b5b] bg-[#eef5fc] text-[#002b5b]">
              <th className="py-2.5 px-3 font-bold uppercase">Matière</th>
              <th className="py-2.5 px-2 font-bold uppercase text-center">CC 1</th>
              <th className="py-2.5 px-2 font-bold uppercase text-center">CC 2</th>
              <th className="py-2.5 px-2 font-bold uppercase text-center">CC 3</th>
              <th className="py-2.5 px-2 font-bold uppercase text-center">Coeff</th>
              <th className="py-2.5 px-3 font-bold uppercase text-right">Moyenne</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {nonEmptyRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 px-3 text-center text-[#5a7199]">
                  Aucune note enregistrée pour {termName}.
                </td>
              </tr>
            ) : (
              nonEmptyRows.map((sub, i) => (
                <tr key={sub.subjectId} className={i % 2 === 0 ? "bg-white" : "bg-[#fcfdfe]"}>
                  <td className="py-2.5 px-3 font-bold text-[#0c2340]">
                    <div>{sub.subjectName}</div>
                    {sub.extraGrades.length > 0 ? (
                      <div className="mt-0.5 text-[10px] font-normal text-[#5a7199]">
                        +{" "}
                        {sub.extraGrades
                          .map((eg) => `${eg.title || eg.type}: ${eg.score20}/20`)
                          .join(" · ")}
                      </div>
                    ) : null}
                  </td>
                  {[sub.cc1, sub.cc2, sub.cc3].map((slot, idx) => (
                    <td key={idx} className="py-2.5 px-2 text-center text-[#3d5278]">
                      {slot !== null ? `${slot.score20}/20` : "—"}
                    </td>
                  ))}
                  <td className="py-2.5 px-2 text-center font-semibold text-[#5a7199]">
                    {sub.coefficient}
                  </td>
                  <td className="py-2.5 px-3 text-right font-extrabold text-[#002b5b]">
                    {sub.average !== null ? `${sub.average} / 20` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#002b5b] bg-[#d7f6ee]/60 font-black">
              <td colSpan={5} className="py-3 px-3 uppercase text-[#002b5b] text-sm">
                Moyenne Générale — {termName}
              </td>
              <td className="py-3 px-3 text-right text-base text-[#002b5b]">
                {semesterAverage !== null ? `${semesterAverage} / 20` : "—"}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Appréciation globale */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs space-y-1">
          <p className="font-bold uppercase tracking-wider text-[#3d5278]">
            Appréciation générale :
          </p>
          <p className="italic text-[#1a3d6e]">« {appreciationText} »</p>
        </div>

        {/* Pied de page et cachet */}
        <div className="mt-10 pt-6 border-t border-gray-200 grid grid-cols-2 items-end">
          <div className="space-y-2">
            <p className="text-xs text-[#5a7199]">
              {school.address ? `Fait à ${school.address}, le` : "Édité le"}{" "}
              <strong>{issueDate}</strong>
            </p>
            <div className="flex items-center gap-2">
              <div className="h-16 w-16 rounded-full border border-dashed border-[#002b5b] p-1 flex items-center justify-center text-center rotate-[-8deg] bg-[#eef5fc]/60">
                <span className="text-[7px] font-bold uppercase text-[#002b5b] leading-tight line-clamp-3">
                  {school.name}<br />DIRECTION<br />★ VALIDÉ ★
                </span>
              </div>
              <span className="text-[10px] text-[#00875a] font-semibold">
                ✓ Document officiel certifié
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-bold text-[#0c2340]">Pour le Conseil de Classe</p>
            <div className="pt-6">
              <span className="font-[family-name:var(--font-fraunces)] italic text-base font-bold text-[#002b5b]">
                La Direction — {school.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
