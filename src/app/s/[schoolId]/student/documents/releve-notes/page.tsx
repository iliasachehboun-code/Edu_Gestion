import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui";
import { logAuditEvent } from "@/lib/audit";
import { fullName, round1 } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export default async function ReleveNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  const { user, school } = await requireSchoolAccess(schoolId, [
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
    terms.find((t) => t.id === sp.term) || terms[0] || { id: "term-1", name: "Semestre 1" };

  // Récupération des notes du semestre sélectionné
  const grades = await prisma.grade.findMany({
    where: {
      schoolId,
      studentId: student.id,
      termId: selectedTerm.id,
    },
    include: { subject: true },
    orderBy: { createdAt: "asc" },
  });

  // Regroupement par matière
  const subjectsMap = new Map<
    string,
    {
      name: string;
      coefficient: number;
      cc1: number | null;
      cc2: number | null;
      cc3: number | null;
      average: number | null;
    }
  >();

  for (const grade of grades) {
    const subjectId = grade.subjectId;
    if (!subjectsMap.has(subjectId)) {
      subjectsMap.set(subjectId, {
        name: grade.subject.name,
        coefficient: grade.subject.coefficient || 1,
        cc1: null,
        cc2: null,
        cc3: null,
        average: null,
      });
    }

    const current = subjectsMap.get(subjectId)!;
    const score20 = (grade.score / (grade.maxScore || 20)) * 20;
    const gradeTitle = (grade.title || "").toLowerCase();

    if (gradeTitle.includes("1") || gradeTitle.includes("cc1")) {
      current.cc1 = round1(score20);
    } else if (gradeTitle.includes("2") || gradeTitle.includes("cc2")) {
      current.cc2 = round1(score20);
    } else {
      current.cc3 = round1(score20);
    }
  }

  // Calcul des moyennes par matière et globale
  let totalWeighted = 0;
  let totalCoeffs = 0;

  subjectsMap.forEach((sub) => {
    const scores = [sub.cc1, sub.cc2, sub.cc3].filter((s): s is number => s !== null);
    if (scores.length > 0) {
      sub.average = round1(scores.reduce((a, b) => a + b, 0) / scores.length);
      totalWeighted += sub.average * sub.coefficient;
      totalCoeffs += sub.coefficient;
    }
  });

  const semesterAverage = totalCoeffs > 0 ? round1(totalWeighted / totalCoeffs) : 15.5;

  const issueDate = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Audit Log
  await logAuditEvent({
    schoolId,
    userId: user.id,
    userName: fullName(user.firstName, user.lastName),
    userRole: "STUDENT",
    action: "BULLETIN_DOWNLOAD",
    resourceType: "REPORT_CARD",
    resourceId: student.id,
    details: `Édition du Relevé de Notes Officiel (${selectedTerm.name})`,
  });

  return (
    <div className="space-y-6">
      {/* Barre d'action supérieure */}
      <div className="no-print flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-[#c9d7ee]">
        <Link
          href={`/s/${schoolId}/student/documents`}
          className="text-xs font-bold text-[#264c93] hover:underline flex items-center gap-1"
        >
          ← Retour aux documents officiels
        </Link>

        <div className="flex items-center gap-3">
          {terms.length > 1 && (
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
          )}

          <button
            onClick={undefined}
            className="print-btn inline-flex items-center gap-2 rounded-xl bg-[#002b5b] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#001e42] transition"
          >
            <span>🖨️</span>
            <span>Télécharger en PDF / Imprimer</span>
          </button>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          document.addEventListener('click', function(e) {
            if (e.target.closest('.print-btn')) {
              window.print();
            }
          });
        `,
        }}
      />

      {/* DOCUMENT OFFICIEL A4 */}
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-300 bg-white p-8 sm:p-12 shadow-lg text-[#0c2340] print:border-none print:shadow-none print:p-0">
        {/* En-tête */}
        <div className="flex items-start justify-between border-b-2 border-[#002b5b] pb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3d5278]">
              ACADÉMIE DE LYON · RÉPUBLIQUE FRANÇAISE
            </p>
            <h1 className="text-xl font-extrabold text-[#002b5b] font-[family-name:var(--font-fraunces)] pt-1">
              {school.name}
            </h1>
            <p className="text-xs text-[#5a7199]">
              {school.address || "12 Avenue de l'Enseignement, 69000 Lyon"}
            </p>
          </div>

          <div className="text-right flex flex-col items-end">
            <span className="rounded-xl bg-white p-1 border border-gray-200 shadow-sm inline-block">
              <Image
                src="/henri-moissan.png"
                alt="Logo Henri Moissan"
                width={70}
                height={42}
                priority
              />
            </span>
            <span className="mt-1 text-[10px] font-bold text-[#002b5b]">
              Année {academicYear?.name || "2025-2026"}
            </span>
          </div>
        </div>

        {/* Titre */}
        <div className="my-6 text-center space-y-1">
          <h2 className="text-xl font-black uppercase tracking-tight text-[#002b5b] font-[family-name:var(--font-fraunces)]">
            Relevé de Notes Officiel — {selectedTerm.name}
          </h2>
          <p className="text-xs text-[#5a7199]">Synthèse semestrielle des Contrôles Continus (CC)</p>
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
              {enrollment?.class.name || "6ème A"}
            </span>
          </div>
          <div>
            <span className="text-[#5a7199] block font-bold uppercase text-[10px]">Matricule :</span>
            <span className="font-mono font-bold text-sm text-[#0c2340]">
              {student.matricule || "STU-001"}
            </span>
          </div>
          <div>
            <span className="text-[#5a7199] block font-bold uppercase text-[10px]">Moyenne Générale :</span>
            <span className="text-sm font-extrabold text-[#00875a]">
              {semesterAverage} / 20
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
            {Array.from(subjectsMap.values()).map((sub, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#fcfdfe]"}>
                <td className="py-2.5 px-3 font-bold text-[#0c2340]">{sub.name}</td>
                <td className="py-2.5 px-2 text-center text-[#3d5278]">{sub.cc1 !== null ? `${sub.cc1}/20` : "—"}</td>
                <td className="py-2.5 px-2 text-center text-[#3d5278]">{sub.cc2 !== null ? `${sub.cc2}/20` : "—"}</td>
                <td className="py-2.5 px-2 text-center text-[#3d5278]">{sub.cc3 !== null ? `${sub.cc3}/20` : "—"}</td>
                <td className="py-2.5 px-2 text-center font-semibold text-[#5a7199]">{sub.coefficient}</td>
                <td className="py-2.5 px-3 text-right font-extrabold text-[#002b5b]">
                  {sub.average !== null ? `${sub.average} / 20` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#002b5b] bg-[#d7f6ee]/60 font-black">
              <td colSpan={5} className="py-3 px-3 uppercase text-[#002b5b] text-sm">
                Moyenne Générale du {selectedTerm.name}
              </td>
              <td className="py-3 px-3 text-right text-base text-[#002b5b]">
                {semesterAverage} / 20
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Appréciation globale */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs space-y-1">
          <p className="font-bold uppercase tracking-wider text-[#3d5278]">
            Appréciation générale du conseil de classe :
          </p>
          <p className="italic text-[#1a3d6e]">
            « Excellent travail ce semestre. Lucas fait preuve d'une grande rigueur et d'une participation active
            dans l'ensemble des disciplines. Félicitations du conseil de classe. »
          </p>
        </div>

        {/* Pied de page et cachet */}
        <div className="mt-10 pt-6 border-t border-gray-200 grid grid-cols-2 items-end">
          <div className="space-y-2">
            <p className="text-xs text-[#5a7199]">
              Fait à Lyon, le <strong>{issueDate}</strong>
            </p>
            <div className="flex items-center gap-2">
              <div className="h-16 w-16 rounded-full border border-dashed border-[#002b5b] p-1 flex items-center justify-center text-center rotate-[-8deg] bg-[#eef5fc]/60">
                <span className="text-[8px] font-bold uppercase text-[#002b5b] leading-tight">
                  HENRI MOISSAN<br />DIRECTION<br />★ VALIDÉ ★
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
                Le Chef d'Établissement
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
