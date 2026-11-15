import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { Card, EmptyState } from "@/components/ui";
import { StudentPasswordChangeForm } from "@/components/student-password-change";
import Link from "next/link";

export default async function StudentPasswordChangePage({
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
  if (!student) {
    return <EmptyState message="Dossier élève introuvable." />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Bouton retour vers le profil */}
      <div>
        <Link
          href={`/s/${schoolId}/student/profile`}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#002b5b] hover:text-[#001e42] bg-white px-3.5 py-2 rounded-xl border border-[#c9d7ee] shadow-2xs hover:bg-[#f4f8fc] transition"
        >
          <span>&larr;</span>
          <span>Retour à mon espace personnel</span>
        </Link>
      </div>

      {/* En-tête de la page */}
      <div className="rounded-2xl bg-gradient-to-r from-[#002b5b] to-[#1a4a82] p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8fe3cf] text-2xl text-[#002b5b] shadow-inner font-bold">
            🔑
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-fraunces)]">
              Modifier mon mot de passe
            </h1>
            <p className="text-xs text-[#d7e5fa] mt-0.5">
              Sécurisez votre compte élève ({student.firstName} {student.lastName})
            </p>
          </div>
        </div>
      </div>

      {/* Conseils de sécurité */}
      <div className="rounded-xl border border-[#bce8df] bg-[#eefcf9] p-4 text-xs text-[#0d4a3e] space-y-1.5 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-[#002b5b]">
          <span>💡</span>
          <span>Conseils pour un mot de passe sécurisé :</span>
        </div>
        <ul className="list-disc list-inside space-y-1 pl-1 text-[#155a4d]">
          <li>Choisis un mot de passe d&apos;au moins <strong>6 caractères</strong>.</li>
          <li>Ne donne <strong>jamais</strong> ton mot de passe à un autre élève ou camarade de classe.</li>
          <li>Choisis quelque chose de facile à retenir pour toi mais difficile à deviner pour les autres.</li>
        </ul>
      </div>

      {/* Formulaire de changement */}
      <Card className="p-6 sm:p-8 shadow-sm border border-[#c9d7ee]">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#0c2340] mb-4 border-b border-[#eef2f7] pb-3 flex items-center gap-2">
          <span>🔒</span>
          <span>Formulaire de modification</span>
        </h2>
        <StudentPasswordChangeForm
          schoolId={schoolId}
          backHref={`/s/${schoolId}/student/profile`}
        />
      </Card>
    </div>
  );
}
