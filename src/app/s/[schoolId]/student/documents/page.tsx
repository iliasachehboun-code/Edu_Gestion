import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { Card, PageHeader } from "@/components/ui";
import Link from "next/link";

export default async function StudentDocumentsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { user } = await requireSchoolAccess(schoolId, [
    "STUDENT",
    "SCHOOL_ADMIN",
  ]);

  const student = await getStudentForUser(schoolId, user);
  const enrollment = student?.enrollments[0];

  const documents = [
    {
      title: "Certificat de Scolarité Officiel",
      description:
        "Attestation officielle d'inscription pour l'année scolaire 2025-2026 avec cachet et signature de l'établissement.",
      badge: "Génération instantanée",
      icon: "📜",
      href: `/s/${schoolId}/student/documents/certificat-scolarite`,
      category: "Scolarité",
      format: "PDF A4 Officiel",
    },
    {
      title: "Relevé de Notes Semestriel",
      description:
        "Synthèse officielle des Contrôles Continus (CC1, CC2, CC3) et moyenne générale semestrielle certifiée par le conseil de classe.",
      badge: "Semestre 1 & 2",
      icon: "📊",
      href: `/s/${schoolId}/student/documents/releve-notes`,
      category: "Pédagogie",
      format: "PDF A4 Officiel",
    },
    {
      title: "Demande d'Attestation Spécifique",
      description:
        "Besoin d'une convention de stage, attestation de présence ou aménagement d'horaires ? Formulez votre demande en ligne.",
      badge: "Guichet numérique",
      icon: "✍️",
      href: `/s/${schoolId}/student/requests`,
      category: "Administratif",
      format: "Formulaire en ligne",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Documents Officiels"
        description="Téléchargez en un clic vos certificats de scolarité et relevés de notes officiels au format PDF certifié."
      />

      {/* Bannière d'information */}
      <div className="rounded-2xl border border-[#8fe3cf] bg-[#d7f6ee]/70 p-5 shadow-sm text-[#002b5b]">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <h3 className="font-bold text-sm">
              Documents certifiés et vérifiables numériquement
            </h3>
            <p className="mt-1 text-xs text-[#1a3d6e] leading-relaxed">
              Tous les documents générés depuis cet espace comportent le cachet officiel de
              l'établissement et une signature certifiée pour vos démarches (Sécurité sociale, CAF,
              transports, inscriptions concours).
            </p>
          </div>
        </div>
      </div>

      {/* Cartes des documents disponibles */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc, idx) => (
          <Card
            key={idx}
            className="flex flex-col justify-between hover:shadow-md transition border-[#c9d7ee] bg-white p-6"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f4f9] text-2xl shadow-inner">
                  {doc.icon}
                </span>
                <span className="rounded-full bg-[#e4ecf8] px-2.5 py-0.5 text-[11px] font-bold text-[#002b5b]">
                  {doc.badge}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5a7199]">
                  {doc.category} · {doc.format}
                </span>
                <h3 className="font-bold text-base text-[#0c2340] mt-0.5">
                  {doc.title}
                </h3>
                <p className="mt-1.5 text-xs text-[#3d5278] leading-relaxed">
                  {doc.description}
                </p>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-[#f0f4f9] flex items-center justify-between">
              <Link
                href={doc.href}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#002b5b] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#001e42] transition active:scale-95"
              >
                <span>Télécharger / Imprimer en PDF</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
