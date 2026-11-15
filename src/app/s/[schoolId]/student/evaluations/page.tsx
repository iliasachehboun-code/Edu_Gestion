import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui";
import Link from "next/link";
import { EvaluationSubjectFilter } from "@/components/evaluation-subject-filter";
import {
  filterUpcomingEvaluations,
  getDaysUntil,
  getEvaluationQueryFloor,
} from "@/lib/student-evaluations";
import { getClassRelevantSubjects } from "@/lib/student-grades";
import { getEvaluationI18n } from "@/lib/student-evaluations-i18n";

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
  if (name.includes("angl") || name.includes("english")) {
    return {
      bg: "bg-indigo-50/70",
      border: "border-indigo-200",
      badge: "bg-indigo-600 text-white",
      calendarHeader: "bg-indigo-600 text-white",
      text: "text-indigo-900",
      icon: "🇬🇧",
    };
  }
  if (name.includes("arab") || name.includes("عرب")) {
    return {
      bg: "bg-teal-50/70",
      border: "border-teal-200",
      badge: "bg-teal-700 text-white",
      calendarHeader: "bg-teal-700 text-white",
      text: "text-teal-900",
      icon: "📖",
    };
  }
  if (name.includes("espagn") || name.includes("spanis")) {
    return {
      bg: "bg-orange-50/70",
      border: "border-orange-200",
      badge: "bg-orange-600 text-white",
      calendarHeader: "bg-orange-600 text-white",
      text: "text-orange-900",
      icon: "🇪🇸",
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
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
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

  const subjects = await getClassRelevantSubjects(schoolId, student.id, classId);

  const now = new Date();
  const evalQueryFloor = getEvaluationQueryFloor(now);

  // Requête en base : filtre automatiquement pour ne récupérer que les dates actuelles et futures
  const evaluations = await prisma.evaluation.findMany({
    where: {
      schoolId,
      classId,
      date: { gte: evalQueryFloor },
      ...(subjectId ? { subjectId } : {}),
    },
    include: {
      subject: true,
      class: true,
      term: true,
    },
    orderBy: { date: "asc" },
  });

  // Suppression / Retrait automatique dès que la date ou l'heure de fin de l'épreuve est passée
  const displayedEvals = filterUpcomingEvaluations(evaluations, now);

  const nextExam = displayedEvals[0] || null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* En-tête simple et direct */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#002b5b] font-[family-name:var(--font-fraunces)] sm:text-3xl">
            📅 Mes Contrôles & Examens
          </h1>
          <p className="text-xs text-[#5a7199] mt-1">
            Classe de {enrollment.class.name} · Calendrier personnalisé selon la langue de chaque matière
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

      {/* Bannière "Prochain contrôle" - Multilingue selon la matière */}
      {nextExam ? (() => {
        const nextI18n = getEvaluationI18n(nextExam.subject.name);
        const nextTheme = getSubjectTheme(nextExam.subject.name);
        const nextDays = getDaysUntil(nextExam.date, now);
        const nextCountdown = nextI18n.getCountdown(nextDays);
        const nextParts = nextI18n.formatDayParts(nextExam.date);

        return (
          <div
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#002b5b] via-[#1a4a82] to-[#002b5b] p-5 text-white shadow-md"
            dir={nextI18n.dir}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#8fe3cf] text-2xl text-[#002b5b]">
                  {nextTheme.icon}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8fe3cf]">
                      {nextI18n.nextBadge}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${nextCountdown.color}`}>
                      {nextCountdown.label}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-white sm:text-xl">
                    {nextI18n.subjectDisplayName} : {nextExam.title}
                  </h2>
                  <p className="text-xs text-[#d7e6fb] mt-0.5 flex flex-wrap items-center gap-3 font-medium">
                    <span>📅 {nextParts.fullDate}</span>
                    <span>
                      ⏰ {nextExam.startTime ? nextI18n.timeLabel(nextExam.startTime, nextExam.durationMin) : nextI18n.durationLabel(nextExam.durationMin)}
                    </span>
                    {nextExam.room && <span>📍 {nextI18n.roomLabel(nextExam.room)}</span>}
                    <span>⚖️ {nextI18n.coeffLabel} {nextExam.coefficient}</span>
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                <span className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-[#8fe3cf]">
                  {nextI18n.upcomingCountLabel(displayedEvals.length)}
                </span>
              </div>
            </div>
          </div>
        );
      })() : null}

      {/* Barre d'en-tête de liste : Titre & Sélecteur de matière */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#c9d7ee] pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl bg-[#002b5b] px-4 py-2 text-xs font-bold text-white shadow-xs">
            <span>⏳</span>
            <span>Contrôles à venir ({displayedEvals.length})</span>
          </span>
        </div>

        {/* Sélecteur de matière */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#5a7199]">Filtrer par matière :</span>
          <EvaluationSubjectFilter
            schoolId={schoolId}
            subjects={subjects}
            currentSubjectId={subjectId}
          />
        </div>
      </div>

      {/* Liste des Évaluations - Chaque épreuve suit sa langue dédiée */}
      {displayedEvals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#8fe3cf] bg-[#f4f8fc] px-6 py-12 text-center text-sm font-medium text-[#002b5b]">
          🎉 Aucun contrôle programmé pour le moment. Tout est à jour !
        </div>
      ) : (
        <div className="space-y-3.5">
          {displayedEvals.map((ev) => {
            const i18n = getEvaluationI18n(ev.subject.name);
            const theme = getSubjectTheme(ev.subject.name);
            const diffDays = getDaysUntil(ev.date, now);
            const countdown = i18n.getCountdown(diffDays);
            const { dayName, dayNum, monthName } = i18n.formatDayParts(ev.date);

            return (
              <div
                key={ev.id}
                dir={i18n.dir}
                className="flex flex-col sm:flex-row items-stretch rounded-2xl border border-[#c9d7ee] bg-white hover:border-[#002b5b] hover:shadow-md transition overflow-hidden shadow-xs"
              >
                {/* Bloc Date Calendrier (localisé selon la langue de la matière) */}
                <div
                  className={`flex sm:flex-col items-center justify-between sm:justify-center p-3.5 sm:w-28 shrink-0 text-center border-b sm:border-b-0 ${
                    i18n.dir === "rtl" ? "sm:border-l" : "sm:border-r"
                  } border-[#eef2f7] bg-[#f4f8fc]`}
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

                  {/* Pastille Décompte dans la langue de la matière */}
                  <span
                    className={`mt-2 rounded-full px-2 py-0.5 text-[10px] ${countdown.color}`}
                  >
                    {countdown.label}
                  </span>
                </div>

                {/* Corps de l'épreuve */}
                <div
                  className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-3"
                >
                  <div>
                    {/* Badge Matière + Type d'épreuve localisé */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold ${theme.badge}`}
                      >
                        <span>{theme.icon}</span>
                        <span>{i18n.subjectDisplayName}</span>
                      </span>

                      <span className="rounded-md bg-[#eef2f7] px-2 py-0.5 text-[11px] font-bold text-[#3d5278]">
                        {i18n.evalTypes[ev.type] || "Evaluation"}
                      </span>

                      <span className="text-[11px] font-semibold text-[#5a7199]">
                        {i18n.coeffLabel} {ev.coefficient}
                      </span>
                    </div>

                    {/* Titre clair du contrôle */}
                    <h3 className="mt-2 text-base sm:text-lg font-black text-[#0c2340]">
                      {ev.title}
                    </h3>

                    {/* Heure, Durée, Salle dans la langue du devoir */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-[#264c93]">
                      <span className="inline-flex items-center gap-1">
                        ⏰{" "}
                        {ev.startTime
                          ? i18n.timeLabel(ev.startTime, ev.durationMin)
                          : i18n.durationLabel(ev.durationMin)}
                      </span>
                      {ev.room && (
                        <span className="inline-flex items-center gap-1">
                          📍 <span>{i18n.roomLabel(ev.room)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Consignes & Programme à réviser (titres et présentation adaptés à la matière) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                    {ev.topics && (
                      <div className="rounded-xl bg-[#f8fafc] border border-[#eef2f7] p-2.5 text-[#3d5278]">
                        <span className="font-bold text-[#002b5b] block mb-0.5">
                          {i18n.toReviseHeader}
                        </span>
                        <span>{ev.topics}</span>
                      </div>
                    )}

                    {ev.instructions && (
                      <div className="rounded-xl bg-[#fff8f8] border border-[#ffe4e6] p-2.5 text-[#9f1239]">
                        <span className="font-bold text-[#be123c] block mb-0.5">
                          {i18n.instructionsHeader}
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
