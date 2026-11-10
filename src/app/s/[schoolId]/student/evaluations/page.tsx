import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function StudentEvaluationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ filter?: string; subjectId?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  const filter = sp.filter || "upcoming";
  const subjectId = sp.subjectId || "";

  const { user } = await requireSchoolAccess(schoolId, [
    "STUDENT",
    "SCHOOL_ADMIN",
  ]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) {
    return <EmptyState message="Dossier élève introuvable." />;
  }

  const enrollment = student.enrollments[0];
  const classId = enrollment?.classId;

  if (!classId) {
    return (
      <EmptyState message="Aucune classe associée à votre dossier pour afficher le calendrier des évaluations." />
    );
  }

  // Récupérer les matières de l'école
  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
  });

  // Récupérer toutes les évaluations de la classe de l'élève
  const evaluations = await prisma.evaluation.findMany({
    where: {
      schoolId,
      classId,
      ...(subjectId ? { subjectId } : {}),
    },
    include: {
      subject: true,
      class: true,
      term: true,
    },
    orderBy: { date: "asc" },
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Séparation à venir / passées
  const upcomingEvals = evaluations.filter((ev) => new Date(ev.date) >= now);
  const pastEvals = evaluations.filter((ev) => new Date(ev.date) < now);

  const displayedEvals =
    filter === "all"
      ? evaluations
      : filter === "past"
      ? pastEvals
      : upcomingEvals;

  // Calcul du prochain examen
  const nextExam = upcomingEvals[0] || null;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "DEVOIR_COMMUN":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
            🏛️ Devoir Commun
          </span>
        );
      case "EXAMEN_BLANC":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            🎓 Examen Blanc
          </span>
        );
      case "TP_NOTE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            🔬 TP Noté
          </span>
        );
      case "INTERROGATION":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
            🗣️ Interrogation
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e4ecf8] px-2.5 py-0.5 text-xs font-bold text-[#002b5b]">
            📝 Contrôle Continu
          </span>
        );
    }
  };

  const getDaysDiffLabel = (targetDate: Date) => {
    const t = new Date(targetDate);
    t.setHours(0, 0, 0, 0);
    const diffTime = t.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: "Aujourd'hui !", tone: "danger" };
    if (diffDays === 1) return { label: "Demain", tone: "warning" };
    if (diffDays > 1) return { label: `Dans ${diffDays} jours`, tone: "info" };
    return { label: `Passé (${Math.abs(diffDays)}j)`, tone: "muted" };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examens & Évaluations"
        description="Calendrier officiel des contrôles continus, devoirs surveillés et épreuves programmées."
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/s/${schoolId}/student/grades`}>
              <Button variant="secondary" className="text-xs">
                📊 Voir mes notes de CC
              </Button>
            </Link>
          </div>
        }
      />

      {/* Cartes Synthétiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Prochaine épreuve */}
        <Card className="border-l-4 border-l-[#be123c] bg-gradient-to-br from-white to-[#fff8f8] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9f1239]">
              Prochaine Épreuve
            </span>
            {nextExam && (
              <span className="rounded-full bg-[#ffe4e6] px-2 py-0.5 text-[10px] font-bold text-[#9f1239]">
                {getDaysDiffLabel(nextExam.date).label}
              </span>
            )}
          </div>
          {nextExam ? (
            <div className="mt-3">
              <h3 className="text-base font-extrabold text-[#0c2340] line-clamp-1">
                {nextExam.subject.name}
              </h3>
              <p className="text-xs font-semibold text-[#5a7199] mt-0.5">
                {nextExam.title}
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs font-bold text-[#002b5b]">
                <span>📅 {formatDate(nextExam.date)}</span>
                <span>⏱️ {nextExam.startTime || "09h00"}</span>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-[#5a7199]">
              Aucune épreuve imminente.
            </div>
          )}
        </Card>

        {/* Évaluations à venir */}
        <Card className="border-l-4 border-l-[#002b5b] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5a7199]">
            Épreuves programmées
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#002b5b]">
              {upcomingEvals.length}
            </span>
            <span className="text-xs text-[#5a7199]">à passer ce semestre</span>
          </div>
          <p className="mt-2 text-xs text-[#264c93]">
            Classe de {enrollment.class.name}
          </p>
        </Card>

        {/* Épreuves déjà passées */}
        <Card className="border-l-4 border-l-[#8fe3cf] p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5a7199]">
            Épreuves passées
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0c2340]">
              {pastEvals.length}
            </span>
            <span className="text-xs text-[#5a7199]">évaluations terminées</span>
          </div>
          <p className="mt-2 text-xs text-[#5a7199]">
            Consultez les résultats dans le relevé de notes
          </p>
        </Card>
      </div>

      {/* Onglets de filtrage & Sélection de matière */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#c9d7ee] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/s/${schoolId}/student/evaluations?filter=upcoming${
              subjectId ? `&subjectId=${subjectId}` : ""
            }`}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "upcoming"
                ? "bg-[#002b5b] text-white shadow-sm"
                : "bg-white text-[#3d5278] border border-[#c9d7ee] hover:bg-[#f4f8fc]"
            }`}
          >
            ⏳ À venir ({upcomingEvals.length})
          </Link>
          <Link
            href={`/s/${schoolId}/student/evaluations?filter=all${
              subjectId ? `&subjectId=${subjectId}` : ""
            }`}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "all"
                ? "bg-[#002b5b] text-white shadow-sm"
                : "bg-white text-[#3d5278] border border-[#c9d7ee] hover:bg-[#f4f8fc]"
            }`}
          >
            📋 Toutes ({evaluations.length})
          </Link>
          <Link
            href={`/s/${schoolId}/student/evaluations?filter=past${
              subjectId ? `&subjectId=${subjectId}` : ""
            }`}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "past"
                ? "bg-[#002b5b] text-white shadow-sm"
                : "bg-white text-[#3d5278] border border-[#c9d7ee] hover:bg-[#f4f8fc]"
            }`}
          >
            ✓ Passées ({pastEvals.length})
          </Link>
        </div>

        {/* Filtre Matière */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#5a7199]">Matière :</span>
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="filter" value={filter} />
            <select
              name="subjectId"
              defaultValue={subjectId}
              onChange={(e) => e.target.form?.submit()}
              className="rounded-xl border border-[#b7c9e6] bg-white px-3 py-1.5 text-xs font-semibold text-[#0c2340] outline-none focus:border-[#264c93]"
            >
              <option value="">Toutes les matières</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </form>
        </div>
      </div>

      {/* Liste des Évaluations */}
      {displayedEvals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#8fe3cf] bg-[#f4f8fc] px-6 py-12 text-center text-sm font-medium text-[#002b5b]">
          🎉 Aucune évaluation trouvée pour ces critères de recherche.
        </div>
      ) : (
        <div className="space-y-4">
          {displayedEvals.map((ev) => {
            const daysDiff = getDaysDiffLabel(ev.date);
            const isPast = new Date(ev.date) < now;

            return (
              <div
                key={ev.id}
                className={`rounded-2xl border transition p-5 shadow-sm space-y-4 ${
                  isPast
                    ? "bg-[#fbfcfe] border-[#e2e8f0] opacity-80"
                    : "bg-white border-[#c9d7ee] hover:border-[#002b5b] hover:shadow-md"
                }`}
              >
                {/* En-tête de la carte */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getTypeBadge(ev.type)}
                      <span className="rounded-lg bg-[#eef2f7] px-2.5 py-0.5 text-xs font-extrabold text-[#002b5b]">
                        {ev.subject.name}
                      </span>
                      <span className="text-xs text-[#5a7199]">
                        Coeff. {ev.coefficient}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#0c2340] pt-1">
                      {ev.title}
                    </h3>
                  </div>

                  {/* Date & Décompte */}
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        daysDiff.tone === "danger"
                          ? "bg-red-100 text-red-700 animate-pulse"
                          : daysDiff.tone === "warning"
                          ? "bg-amber-100 text-amber-800"
                          : daysDiff.tone === "info"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {daysDiff.label}
                    </span>
                    <span className="text-xs font-bold text-[#0c2340]">
                      {formatDate(ev.date)}
                    </span>
                  </div>
                </div>

                {/* Métadonnées : Heure, Durée, Salle */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#3d5278] bg-[#f8fafc] rounded-xl p-3 border border-[#f0f4f9]">
                  <div className="flex items-center gap-1.5">
                    <span>⏱️</span>
                    <span>
                      Horaire : {ev.startTime || "09h00"} ({ev.durationMin} min)
                    </span>
                  </div>
                  {ev.room && (
                    <div className="flex items-center gap-1.5">
                      <span>📍</span>
                      <span>Salle : {ev.room}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span>🏫</span>
                    <span>Classe : {ev.class.name}</span>
                  </div>
                </div>

                {/* Programme & Consignes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {ev.topics && (
                    <div className="rounded-xl border border-[#e2e8f0] bg-white p-3 space-y-1">
                      <span className="font-bold text-[#002b5b] flex items-center gap-1">
                        <span>📚</span> Programme & Révisions :
                      </span>
                      <p className="text-[#3d5278] leading-relaxed">
                        {ev.topics}
                      </p>
                    </div>
                  )}

                  {ev.instructions && (
                    <div className="rounded-xl border border-[#ffe4e6] bg-[#fff8f8] p-3 space-y-1">
                      <span className="font-bold text-[#9f1239] flex items-center gap-1">
                        <span>⚠️</span> Consignes & Matériel requis :
                      </span>
                      <p className="text-[#7f1d1d] leading-relaxed">
                        {ev.instructions}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
