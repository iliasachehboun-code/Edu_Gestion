import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/ui";
import Link from "next/link";
import { EvaluationSubjectFilter } from "@/components/evaluation-subject-filter";

function getSubjectTheme(subjectName: string) {
  const name = subjectName.toLowerCase();
  if (name.includes("math")) {
    return {
      bg: "bg-blue-50/70",
      border: "border-blue-200",
      badge: "bg-blue-600 text-white",
      calendarHeader: "bg-blue-600 text-white",
      text: "text-blue-900",
      icon: "📐",
    };
  }
  if (name.includes("fran")) {
    return {
      bg: "bg-purple-50/70",
      border: "border-purple-200",
      badge: "bg-purple-600 text-white",
      calendarHeader: "bg-purple-600 text-white",
      text: "text-purple-900",
      icon: "📚",
    };
  }
  if (name.includes("hist") || name.includes("géo")) {
    return {
      bg: "bg-amber-50/70",
      border: "border-amber-200",
      badge: "bg-amber-600 text-white",
      calendarHeader: "bg-amber-600 text-white",
      text: "text-amber-900",
      icon: "🌍",
    };
  }
  if (name.includes("svt") || name.includes("bio")) {
    return {
      bg: "bg-emerald-50/70",
      border: "border-emerald-200",
      badge: "bg-emerald-600 text-white",
      calendarHeader: "bg-emerald-600 text-white",
      text: "text-emerald-900",
      icon: "🔬",
    };
  }
  if (name.includes("angl")) {
    return {
      bg: "bg-indigo-50/70",
      border: "border-indigo-200",
      badge: "bg-indigo-600 text-white",
      calendarHeader: "bg-indigo-600 text-white",
      text: "text-indigo-900",
      icon: "🇬🇧",
    };
  }
  if (name.includes("phys")) {
    return {
      bg: "bg-cyan-50/70",
      border: "border-cyan-200",
      badge: "bg-cyan-700 text-white",
      calendarHeader: "bg-cyan-700 text-white",
      text: "text-cyan-900",
      icon: "⚡",
    };
  }
  if (name.includes("eps") || name.includes("sport")) {
    return {
      bg: "bg-rose-50/70",
      border: "border-rose-200",
      badge: "bg-rose-600 text-white",
      calendarHeader: "bg-rose-600 text-white",
      text: "text-rose-900",
      icon: "🏃",
    };
  }
  return {
    bg: "bg-slate-50",
    border: "border-slate-200",
    badge: "bg-[#002b5b] text-white",
    calendarHeader: "bg-[#002b5b] text-white",
    text: "text-slate-900",
    icon: "📝",
  };
}

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
      <EmptyState message="Aucune classe associée à votre dossier pour afficher vos évaluations." />
    );
  }

  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
  });

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

  const upcomingEvals = evaluations.filter((ev) => new Date(ev.date) >= now);
  const pastEvals = evaluations.filter((ev) => new Date(ev.date) < now);

  const displayedEvals =
    filter === "all"
      ? evaluations
      : filter === "past"
      ? pastEvals
      : upcomingEvals;

  const nextExam = upcomingEvals[0] || null;

  const getCountdownLabel = (date: Date) => {
    const t = new Date(date);
    t.setHours(0, 0, 0, 0);
    const diffTime = t.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: "Aujourd'hui !", color: "bg-red-500 text-white font-black animate-pulse" };
    if (diffDays === 1) return { label: "Demain !", color: "bg-amber-500 text-white font-bold" };
    if (diffDays === 2) return { label: "Dans 2 jours", color: "bg-blue-600 text-white font-bold" };
    if (diffDays > 2) return { label: `Dans ${diffDays} jours`, color: "bg-[#e8f1fc] text-[#002b5b] font-bold" };
    return { label: `Passé`, color: "bg-gray-100 text-gray-500 font-medium" };
  };

  const getDayParts = (date: Date) => {
    const d = new Date(date);
    const dayName = d.toLocaleDateString("fr-FR", { weekday: "short" }).toUpperCase().replace(".", "");
    const dayNum = d.getDate();
    const monthName = d.toLocaleDateString("fr-FR", { month: "short" }).toUpperCase().replace(".", "");
    const fullDate = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    return { dayName, dayNum, monthName, fullDate };
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* En-tête simple et direct */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#002b5b] font-[family-name:var(--font-fraunces)] sm:text-3xl">
            📅 Mes Contrôles & Examens
          </h1>
          <p className="text-xs text-[#5a7199] mt-1">
            Classe de {enrollment.class.name} · Tout ce que tu dois réviser et préparer
          </p>
        </div>

        <Link
          href={`/s/${schoolId}/student/grades`}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-[#c9d7ee] bg-white px-3.5 py-2 text-xs font-bold text-[#002b5b] shadow-xs hover:bg-[#f4f8fc] transition"
        >
          <span>📊</span>
          <span>Voir mes notes sur le bulletin &rarr;</span>
        </Link>
      </div>

      {/* Bannière "Prochain contrôle" - Ultra claire & motivante */}
      {nextExam ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#002b5b] via-[#1a4a82] to-[#002b5b] p-5 text-white shadow-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#8fe3cf] text-2xl text-[#002b5b]">
                {getSubjectTheme(nextExam.subject.name).icon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8fe3cf]">
                    Prochain contrôle
                  </span>
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                    {getCountdownLabel(nextExam.date).label}
                  </span>
                </div>
                <h2 className="text-lg font-black text-white sm:text-xl">
                  {nextExam.subject.name} : {nextExam.title}
                </h2>
                <p className="text-xs text-[#d7e6fb] mt-0.5 flex flex-wrap items-center gap-3 font-medium">
                  <span>📅 {getDayParts(nextExam.date).fullDate}</span>
                  <span>⏰ {nextExam.startTime || "09h00"} ({nextExam.durationMin} min)</span>
                  {nextExam.room && <span>📍 {nextExam.room}</span>}
                  <span>⚖️ Coeff. {nextExam.coefficient}</span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
              <span className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-[#8fe3cf]">
                {upcomingEvals.length} contrôle{upcomingEvals.length > 1 ? "s" : ""} à venir
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Filtres simples : Onglets & Matières */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#c9d7ee] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/s/${schoolId}/student/evaluations?filter=upcoming${
              subjectId ? `&subjectId=${subjectId}` : ""
            }`}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "upcoming"
                ? "bg-[#002b5b] text-white shadow-sm"
                : "bg-white text-[#5a7199] border border-[#c9d7ee] hover:bg-[#f4f8fc]"
            }`}
          >
            ⏳ À venir ({upcomingEvals.length})
          </Link>
          <Link
            href={`/s/${schoolId}/student/evaluations?filter=past${
              subjectId ? `&subjectId=${subjectId}` : ""
            }`}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "past"
                ? "bg-[#002b5b] text-white shadow-sm"
                : "bg-white text-[#5a7199] border border-[#c9d7ee] hover:bg-[#f4f8fc]"
            }`}
          >
            ✅ Passés ({pastEvals.length})
          </Link>
          <Link
            href={`/s/${schoolId}/student/evaluations?filter=all${
              subjectId ? `&subjectId=${subjectId}` : ""
            }`}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === "all"
                ? "bg-[#002b5b] text-white shadow-sm"
                : "bg-white text-[#5a7199] border border-[#c9d7ee] hover:bg-[#f4f8fc]"
            }`}
          >
            Tout voir ({evaluations.length})
          </Link>
        </div>

        {/* Sélecteur de matière épuré */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#5a7199]">Filtrer :</span>
          <EvaluationSubjectFilter
            schoolId={schoolId}
            subjects={subjects}
            currentSubjectId={subjectId}
            currentFilter={filter}
          />
        </div>
      </div>

      {/* Liste des Évaluations - Format Agenda simple & aéré */}
      {displayedEvals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#8fe3cf] bg-[#f4f8fc] px-6 py-12 text-center text-sm font-medium text-[#002b5b]">
          🎉 Aucun contrôle programmé pour le moment. Tout est à jour !
        </div>
      ) : (
        <div className="space-y-3.5">
          {displayedEvals.map((ev) => {
            const isPast = new Date(ev.date) < now;
            const theme = getSubjectTheme(ev.subject.name);
            const countdown = getCountdownLabel(ev.date);
            const { dayName, dayNum, monthName } = getDayParts(ev.date);

            return (
              <div
                key={ev.id}
                className={`flex flex-col sm:flex-row items-stretch rounded-2xl border transition overflow-hidden shadow-xs ${
                  isPast
                    ? "bg-[#fcfdfd] border-gray-200 opacity-75"
                    : "bg-white border-[#c9d7ee] hover:border-[#002b5b] hover:shadow-md"
                }`}
              >
                {/* Bloc Date Calendrier (Très visuel, style agenda collège) */}
                <div
                  className={`flex sm:flex-col items-center justify-between sm:justify-center p-3.5 sm:w-28 shrink-0 text-center border-b sm:border-b-0 sm:border-r border-[#eef2f7] ${
                    isPast ? "bg-gray-100 text-gray-500" : "bg-[#f4f8fc]"
                  }`}
                >
                  <div className="flex sm:flex-col items-center gap-2 sm:gap-0">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#5a7199]">
                      {dayName}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#002b5b] leading-none my-0.5">
                      {dayNum}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-[#5a7199]">
                      {monthName}
                    </span>
                  </div>

                  {/* Pastille Décompte */}
                  <span
                    className={`mt-2 rounded-full px-2 py-0.5 text-[10px] ${countdown.color}`}
                  >
                    {countdown.label}
                  </span>
                </div>

                {/* Corps de l'épreuve */}
                <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Badge Matière + Type d'épreuve */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold ${theme.badge}`}
                      >
                        <span>{theme.icon}</span>
                        <span>{ev.subject.name}</span>
                      </span>

                      <span className="rounded-md bg-[#eef2f7] px-2 py-0.5 text-[11px] font-bold text-[#3d5278]">
                        {ev.type === "DEVOIR_COMMUN"
                          ? "Devoir Commun"
                          : ev.type === "TP_NOTE"
                          ? "TP Noté"
                          : ev.type === "INTERROGATION"
                          ? "Interrogation"
                          : "Contrôle Continu"}
                      </span>

                      <span className="text-[11px] font-semibold text-[#5a7199]">
                        Coeff. {ev.coefficient}
                      </span>
                    </div>

                    {/* Titre clair du contrôle */}
                    <h3 className="mt-2 text-base sm:text-lg font-black text-[#0c2340]">
                      {ev.title}
                    </h3>

                    {/* Heure, Durée, Salle */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-[#264c93]">
                      <span className="inline-flex items-center gap-1">
                        ⏰ <span>{ev.startTime || "09h00"}</span>
                        <span className="font-normal text-[#5a7199]">
                          ({ev.durationMin} minutes)
                        </span>
                      </span>
                      {ev.room && (
                        <span className="inline-flex items-center gap-1">
                          📍 <span>{ev.room}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Consignes simples & Ce qu'il faut réviser */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                    {ev.topics && (
                      <div className="rounded-xl bg-[#f8fafc] border border-[#eef2f7] p-2.5 text-[#3d5278]">
                        <span className="font-bold text-[#002b5b] block mb-0.5">
                          📖 À réviser :
                        </span>
                        <span>{ev.topics}</span>
                      </div>
                    )}

                    {ev.instructions && (
                      <div className="rounded-xl bg-[#fff8f8] border border-[#ffe4e6] p-2.5 text-[#9f1239]">
                        <span className="font-bold text-[#be123c] block mb-0.5">
                          🎒 À ne pas oublier :
                        </span>
                        <span>{ev.instructions}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
