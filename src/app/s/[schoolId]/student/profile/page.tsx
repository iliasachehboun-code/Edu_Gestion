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

  // Récupération de l'inscription et des parents rattachés
  const enrollment = student.enrollments[0];
  const parentLinks = await prisma.parentStudent.findMany({
    where: { studentId: student.id },
    include: {
      parent: {
        include: { user: true },
      },
    },
  });

  // Calcul de l'âge
  const birthDate = student.dateOfBirth ? new Date(student.dateOfBirth) : null;
  const age = birthDate
    ? Math.floor(
        (new Date().getTime() - birthDate.getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

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
              Matricule : {student.matricule || "STU-001"} · Classe de{" "}
              {enrollment?.class.name || "6ème A"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/s/${schoolId}/student/documents/certificat-scolarite`}>
            <button
              type="button"
              className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-xs font-bold text-white transition active:scale-95"
            >
              📜 Certificat de scolarité
            </button>
          </Link>
          <Link href={`/s/${schoolId}/student/requests`}>
            <button
              type="button"
              className="rounded-xl bg-[#8fe3cf] hover:bg-[#7ed1be] px-4 py-2 text-xs font-bold text-[#002b5b] transition active:scale-95 shadow-sm"
            >
              ✉️ Démarche Vie Scolaire
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
              État Civil & Coordonnées de l'Élève
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
                {birthDate ? formatDate(birthDate) : "12 avril 2014"}
                {age !== null ? ` (${age} ans)` : " (12 ans)"}
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
                Identifiant / Email de connexion à l'Espace Élève :
              </span>
              <span className="font-mono font-bold text-[#002b5b] bg-[#f0f4f9] px-2.5 py-1 rounded-lg inline-block mt-0.5">
                {user.email}
              </span>
            </div>

            <div className="col-span-2">
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Adresse de résidence :
              </span>
              <span className="font-medium text-[#3d5278]">
                {student.address || "14 rue de la République, 75011 Paris"}
              </span>
            </div>
          </div>
        </Card>

        {/* 2. Scolarité & Vie Scolaire */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#eef2f7] pb-3">
            <span className="text-xl">🏫</span>
            <h2 className="text-base font-bold text-[#0c2340]">
              Scolarité & Régime de Vie Scolaire
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Établissement scolaire :
              </span>
              <span className="font-bold text-[#0c2340]">
                {school.name}
              </span>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Année Scolaire :
              </span>
              <span className="font-bold text-[#0c2340]">
                {enrollment?.academicYear.name || "2025-2026"}
              </span>
            </div>

            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Classe inscrite :
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-[#002b5b] bg-[#e4ecf8] px-2.5 py-0.5 rounded-md">
                🎓 {enrollment?.class.name || "6ème A"}
              </span>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Régime Cantine :
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-[#0c2340] bg-[#d7f6ee] text-[#002b5b] px-2.5 py-0.5 rounded-md">
                🍽️ Demi-pensionnaire (4 jours)
              </span>
            </div>

            <div className="col-span-2">
              <span className="block font-bold uppercase tracking-wider text-[#5a7199] text-[10px]">
                Régime d'autorisation de sortie (Carnet de correspondance) :
              </span>
              <div className="mt-1 rounded-xl bg-[#f4f8fc] border border-[#c9d7ee] p-3 text-xs text-[#0c2340]">
                <span className="font-bold text-[#002b5b]">Régime Vert : </span>
                L'élève est autorisé(e) à quitter l'établissement à la fin de son
                dernier cours de la journée ou en cas d'absence d'un professeur en fin d'après-midi.
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Responsables Légaux (Parents) */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#eef2f7] pb-3">
          <span className="text-xl">👨‍👩‍👦</span>
          <h2 className="text-base font-bold text-[#0c2340]">
            Responsables Légaux & Personnes à Prévenir en Urgence
          </h2>
        </div>

        {parentLinks.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-[#c9d7ee] bg-[#f8fafc] p-4 space-y-1.5">
              <span className="rounded-full bg-[#002b5b] px-2 py-0.5 text-[10px] font-bold text-white">
                Responsable Légal 1 (Père / Mère)
              </span>
              <h3 className="font-bold text-sm text-[#0c2340] pt-1">
                M. Thomas BERNARD
              </h3>
              <p className="text-[#3d5278]">📞 06 12 34 56 78</p>
              <p className="text-[#5a7199]">✉️ parent@ecole-demo.fr</p>
            </div>
            <div className="rounded-xl border border-[#c9d7ee] bg-[#f8fafc] p-4 space-y-1.5">
              <span className="rounded-full bg-[#264c93] px-2 py-0.5 text-[10px] font-bold text-white">
                Responsable Légal 2
              </span>
              <h3 className="font-bold text-sm text-[#0c2340] pt-1">
                Mme Sophie BERNARD
              </h3>
              <p className="text-[#3d5278]">📞 06 98 76 54 32</p>
              <p className="text-[#5a7199]">✉️ s.bernard@famille.fr</p>
            </div>
          </div>
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
