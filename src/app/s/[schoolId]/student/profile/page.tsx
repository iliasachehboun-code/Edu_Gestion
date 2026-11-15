import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, fullName } from "@/lib/utils";
import Link from "next/link";

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { user, school } = await requireSchoolAccess(schoolId, [
    "STUDENT",
    "SCHOOL_ADMIN",
  ]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) {
    return <EmptyState message="Dossier élève introuvable." />;
  }

  // Récupération de l'inscription, du compte associé et des parents rattachés
  const enrollment = student.enrollments[0];
  const [parentLinks, studentAccount] = await Promise.all([
    prisma.parentStudent.findMany({
      where: { studentId: student.id },
      include: {
        parent: {
          include: { user: true },
        },
      },
    }),
    student.userId
      ? prisma.user.findUnique({
          where: { id: student.userId },
          select: { email: true },
        })
      : null,
  ]);

  const displayEmail = studentAccount?.email || student.email || "Non renseigné";

  // Calcul exact de l'âge
  const birthDate = student.dateOfBirth ? new Date(student.dateOfBirth) : null;
  let age: number | null = null;
  if (birthDate) {
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      years--;
    }
    age = years >= 0 ? years : null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mon Espace Personnel"
        description="Fiche de scolarité officielle, coordonnées des responsables légaux et gestion de la sécurité de votre compte."
      />

      {/* Carte d'Identité Scolaire */}
      <div className="flex flex-col gap-6 rounded-3xl bg-gradient-to-r from-[#002b5b] to-[#1a4a82] p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8fe3cf] font-[family-name:var(--font-fraunces)] text-3xl font-black text-[#002b5b] shadow-inner">
            {student.firstName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-bold sm:text-3xl">
                {student.firstName} {student.lastName.toUpperCase()}
              </h1>
              <span className="rounded-full bg-[#8fe3cf] px-2.5 py-0.5 text-xs font-black text-[#002b5b]">
                Élève
              </span>
            </div>
            <p className="text-sm text-[#8fe3cf] mt-1 font-medium">
              Matricule : {student.matricule || "Non attribué"} ·{" "}
              {enrollment ? `Classe de ${enrollment.class.name}` : "Aucune classe"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/s/${schoolId}/student/profile/password`}>
            <button
              type="button"
              className="rounded-xl bg-[#8fe3cf] hover:bg-[#7ed1be] px-4 py-2 text-xs font-bold text-[#002b5b] transition active:scale-95 shadow-sm"
            >
              🔒 Modifier mon mot de passe
            </button>
          </Link>
        </div>
      </div>

      {/* Grille : Informations Scolaires & État Civil */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. État Civil & Coordonnées */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#eef2f7] pb-3">
            <span className="text-xl">🪪</span>
            <h2 className="text-base font-bold text-[#0c2340]">
              État Civil &amp; Coordonnées de l&apos;Élève
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Nom de famille :
              </span>
              <span className="font-bold text-[#0c2340] text-sm">
                {student.lastName.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Prénom :
              </span>
              <span className="font-bold text-[#0c2340] text-sm">
                {student.firstName}
              </span>
            </div>

            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Date de naissance :
              </span>
              <span className="font-semibold text-[#0c2340]">
                {birthDate ? (
                  <>
                    {formatDate(birthDate)}
                    {age !== null ? ` (${age} ans)` : ""}
                  </>
                ) : (
                  "Non renseignée"
                )}
              </span>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Genre :
              </span>
              <span className="font-semibold text-[#0c2340]">
                {student.gender === "F"
                  ? "Féminin (Fille)"
                  : student.gender === "M"
                    ? "Masculin (Garçon)"
                    : "Non renseigné"}
              </span>
            </div>

            <div className="col-span-2">
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Identifiant / Email de connexion à l&apos;Espace Élève :
              </span>
              <span className="font-mono font-bold text-[#002b5b] bg-[#f0f4f9] px-2.5 py-1 rounded-lg inline-block mt-0.5">
                {displayEmail}
              </span>
            </div>

            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Téléphone :
              </span>
              <span className="font-medium text-[#3d5278]">
                {student.phone || "Non renseigné"}
              </span>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Adresse de résidence :
              </span>
              <span className="font-medium text-[#3d5278]">
                {student.address || "Non renseignée"}
              </span>
            </div>
          </div>
        </Card>

        {/* 2. Scolarité & Dossier */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#eef2f7] pb-3">
            <span className="text-xl">🏫</span>
            <h2 className="text-base font-bold text-[#0c2340]">
              Scolarité &amp; Inscription
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Établissement scolaire :
              </span>
              <span className="font-bold text-[#0c2340]">{school.name}</span>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Année Scolaire :
              </span>
              <span className="font-bold text-[#0c2340]">
                {enrollment?.academicYear.name || "Non définie"}
              </span>
            </div>

            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Classe inscrite :
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-[#002b5b] bg-[#e4ecf8] px-2.5 py-0.5 rounded-md mt-0.5">
                🎓 {enrollment?.class.name || "Non inscrit(e)"}
              </span>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Statut du dossier :
              </span>
              <div className="mt-0.5">
                <Badge tone={student.active ? "success" : "danger"}>
                  {student.active ? "Élève actif" : "Dossier inactif"}
                </Badge>
              </div>
            </div>

            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Numéro Matricule :
              </span>
              <span className="font-mono font-bold text-[#0c2340]">
                {student.matricule || "Non attribué"}
              </span>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Date d&apos;inscription :
              </span>
              <span className="font-semibold text-[#0c2340]">
                {formatDate(enrollment?.createdAt || student.createdAt)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Responsables Légaux (Parents) */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#eef2f7] pb-3">
          <span className="text-xl">👨‍👩‍👦</span>
          <h2 className="text-base font-bold text-[#0c2340]">
            Responsables Légaux &amp; Personnes à Prévenir
          </h2>
        </div>

        {parentLinks.length === 0 ? (
          <EmptyState message="Aucun responsable légal n'est rattaché à votre fiche pour le moment. Contactez la scolarité en cas de besoin." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {parentLinks.map((link) => (
              <div
                key={link.id}
                className="rounded-xl border border-[#c9d7ee] bg-[#f8fafc] p-4 space-y-1.5"
              >
                <span className="rounded-full bg-[#002b5b] px-2 py-0.5 text-[10px] font-bold text-white">
                  Responsable : {link.relation || "Parent"}
                </span>
                <h3 className="font-bold text-sm text-[#0c2340] pt-1">
                  {fullName(link.parent.firstName, link.parent.lastName)}
                </h3>
                {link.parent.phone && (
                  <p className="text-[#3d5278]">📞 {link.parent.phone}</p>
                )}
                {link.parent.email && (
                  <p className="text-[#5a7199]">✉️ {link.parent.email}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. Sécurité & Modification du Mot de Passe 🔒 */}
      <Card className="p-6 border-l-4 border-l-[#002b5b]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef5fc] text-2xl text-[#002b5b]">
              🔒
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0c2340]">
                Sécurité du Compte & Mot de Passe
              </h2>
              <p className="text-xs text-[#5a7199]">
                Changez votre mot de passe à tout moment pour protéger votre espace élève.
              </p>
            </div>
          </div>

          <Link
            href={`/s/${schoolId}/student/profile/password`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#002b5b] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#001e42] hover:shadow"
          >
            <span>🔑</span>
            <span>Modifier mon mot de passe</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
