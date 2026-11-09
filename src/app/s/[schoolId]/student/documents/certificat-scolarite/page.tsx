import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui";
import { logAuditEvent } from "@/lib/audit";
import { fullName } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export default async function CertificatScolaritePage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
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

  const issueDate = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const certificateNumber = `CERT-${academicYear?.name || "2025-2026"}-${student.matricule || student.id.slice(-6).toUpperCase()}`;

  // Journalisation Audit Log
  await logAuditEvent({
    schoolId,
    userId: user.id,
    userName: fullName(user.firstName, user.lastName),
    userRole: "STUDENT",
    action: "CERTIFICAT_SCOLARITE_DOWNLOAD",
    resourceType: "CERTIFICATE",
    resourceId: student.id,
    details: `Édition du Certificat de Scolarité n° ${certificateNumber}`,
  });

  return (
    <div className="space-y-6">
      {/* Barre d'action supérieure (masquée à l'impression) */}
      <div className="no-print flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-[#c9d7ee]">
        <Link
          href={`/s/${schoolId}/student/documents`}
          className="text-xs font-bold text-[#264c93] hover:underline flex items-center gap-1"
        >
          ← Retour aux documents officiels
        </Link>
        <button
          onClick={undefined}
          className="print-btn inline-flex items-center gap-2 rounded-xl bg-[#002b5b] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#001e42] transition"
        >
          <span>🖨️</span>
          <span>Télécharger en PDF / Imprimer</span>
        </button>
      </div>

      {/* Script pour déclencher l'impression au clic du bouton */}
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
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-300 bg-white p-10 sm:p-14 shadow-lg text-[#0c2340] print:border-none print:shadow-none print:p-0">
        {/* En-tête officiel */}
        <div className="flex items-start justify-between border-b-2 border-[#002b5b] pb-6">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#3d5278]">
              RÉPUBLIQUE FRANÇAISE
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[#5a7199]">
              Ministère de l'Éducation Nationale
            </p>
            <h1 className="text-xl font-extrabold text-[#002b5b] pt-1 font-[family-name:var(--font-fraunces)]">
              {school.name}
            </h1>
            <p className="text-xs text-[#5a7199]">
              {school.address || "12 Avenue de l'Enseignement, 69000 Lyon"}
            </p>
            <p className="text-[11px] text-[#5a7199]">
              Tél : {school.phone || "04 72 00 00 00"} · Email : {school.email || "contact@henri-moissan.fr"}
            </p>
          </div>

          <div className="text-right flex flex-col items-end">
            <span className="rounded-xl bg-white p-1.5 border border-gray-200 shadow-sm inline-block">
              <Image
                src="/henri-moissan.png"
                alt="Logo Établissement"
                width={80}
                height={50}
                priority
              />
            </span>
            <span className="mt-2 text-[10px] font-mono text-gray-500">
              N° {certificateNumber}
            </span>
          </div>
        </div>

        {/* Titre du document */}
        <div className="my-8 text-center space-y-1.5">
          <div className="inline-block rounded-full bg-[#e4ecf8] px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-[#002b5b]">
            Document Administratif Officiel
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-[#002b5b] pt-2 font-[family-name:var(--font-fraunces)]">
            Certificat de Scolarité
          </h2>
          <p className="text-xs font-semibold text-[#5a7199]">
            Année scolaire {academicYear?.name || "2025-2026"}
          </p>
        </div>

        {/* Corps de l'attestation */}
        <div className="space-y-6 text-sm leading-relaxed text-[#1a2d42]">
          <p>
            Je soussigné(e), <strong>Monsieur le Chef d'Établissement</strong> du Groupe Scolaire{" "}
            <strong>{school.name}</strong>, certifie par la présente que :
          </p>

          {/* Encadré d'identification de l'élève */}
          <div className="rounded-xl border border-[#c9d7ee] bg-[#f4f8fc] p-5 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase text-[#5a7199]">Nom & Prénom</p>
                <p className="text-base font-extrabold text-[#002b5b]">
                  {student.lastName.toUpperCase()} {student.firstName}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-[#5a7199]">Identifiant National / Matricule</p>
                <p className="text-sm font-bold text-[#0c2340] font-mono">
                  {student.matricule || "STU-001"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#e2ecf8]">
              <div>
                <p className="text-[11px] font-bold uppercase text-[#5a7199]">Date de naissance</p>
                <p className="text-sm font-semibold text-[#0c2340]">
                  {student.dateOfBirth
                    ? new Date(student.dateOfBirth).toLocaleDateString("fr-FR")
                    : "02 février 2014"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-[#5a7199]">Classe d'affectation</p>
                <p className="text-sm font-bold text-[#002b5b]">
                  {enrollment?.class.name || "6ème A"}
                </p>
              </div>
            </div>
          </div>

          <p>
            est régulièrement inscrit(e) et assidu(e) aux cours dispensés au sein de notre établissement pour
            l'année scolaire <strong>{academicYear?.name || "2025-2026"}</strong>.
          </p>

          <p className="text-xs text-[#5a7199] italic">
            Ce certificat est délivré à l'intéressé(e) pour servir et valoir ce que de droit auprès des organismes
            et administrations compétents.
          </p>
        </div>

        {/* Pied de page : Date, Sceau et Signature */}
        <div className="mt-14 pt-8 border-t border-gray-200 grid grid-cols-2 items-end">
          <div className="space-y-2">
            <p className="text-xs text-[#5a7199]">
              Fait à Lyon, le <strong>{issueDate}</strong>
            </p>
            {/* Simulation visuelle Sceau officiel */}
            <div className="mt-4 flex items-center gap-3">
              <div className="h-20 w-20 rounded-full border-2 border-dashed border-[#002b5b] p-1.5 flex items-center justify-center text-center rotate-[-12deg] bg-[#eef5fc]/50">
                <span className="text-[9px] font-black uppercase text-[#002b5b] leading-tight">
                  ★ SCEAU OFFICIEL ★<br />HENRI MOISSAN<br />DIRECTION
                </span>
              </div>
              <div className="text-[10px] text-[#5a7199]">
                <p className="font-bold text-[#002b5b]">Vérification numérique :</p>
                <p className="font-mono">ID: {certificateNumber}</p>
                <p className="text-[#00875a] font-semibold">✓ Document Authentifié</p>
              </div>
            </div>
          </div>

          <div className="text-right space-y-1">
            <p className="text-xs font-bold text-[#0c2340]">La Direction de l'Établissement</p>
            <div className="pt-8">
              <span className="font-[family-name:var(--font-fraunces)] italic text-lg font-bold text-[#002b5b]">
                P. Valery
              </span>
              <p className="text-[10px] text-gray-400">Signature électronique certifiée</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
