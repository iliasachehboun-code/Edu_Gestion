import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentForUser } from "@/lib/student";
import { Card, EmptyState, PageHeader, Button } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { fullName } from "@/lib/utils";

const SUBJECT_COLORS: Record<
  string,
  { bg: string; text: string; border: string; badge: string }
> = {
  Mathématiques: {
    bg: "bg-[#e8f1ff]",
    text: "text-[#002b5b]",
    border: "border-[#b7c9e6]",
    badge: "bg-[#002b5b] text-white",
  },
  Français: {
    bg: "bg-[#e5f8f3]",
    text: "text-[#004d40]",
    border: "border-[#8fe3cf]",
    badge: "bg-[#004d40] text-white",
  },
  Anglais: {
    bg: "bg-[#f3e8ff]",
    text: "text-[#581c87]",
    border: "border-[#d8b4fe]",
    badge: "bg-[#581c87] text-white",
  },
  "Histoire-Géo": {
    bg: "bg-[#fef3c7]",
    text: "text-[#78350f]",
    border: "border-[#fde68a]",
    badge: "bg-[#78350f] text-white",
  },
  SVT: {
    bg: "bg-[#ecfdf5]",
    text: "text-[#065f46]",
    border: "border-[#a7f3d0]",
    badge: "bg-[#065f46] text-white",
  },
  "Physique-Chimie": {
    bg: "bg-[#cffafe]",
    text: "text-[#155e75]",
    border: "border-[#a5f3fc]",
    badge: "bg-[#155e75] text-white",
  },
  EPS: {
    bg: "bg-[#ffe4e6]",
    text: "text-[#9f1239]",
    border: "border-[#fecdd3]",
    badge: "bg-[#9f1239] text-white",
  },
};

// Fonctions utilitaires pour le calcul et formatage dynamique des dates de la semaine
function getMonday(dateInput: Date) {
  const d = new Date(dateInput);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(d: Date, days: number) {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function toISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeekRange(monday: Date, friday: Date) {
  const startDay = monday.getDate();
  const startMonth = monday.toLocaleDateString("fr-FR", { month: "long" });
  const endDay = friday.getDate();
  const endMonth = friday.toLocaleDateString("fr-FR", { month: "long" });
  const year = friday.getFullYear();

  if (startMonth === endMonth) {
    return `Semaine du ${startDay} au ${endDay} ${endMonth} ${year}`;
  }
  return `Semaine du ${startDay} ${startMonth} au ${endDay} ${endMonth} ${year}`;
}

export default async function StudentSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  const { user } = await requireSchoolAccess(schoolId, ["STUDENT", "SCHOOL_ADMIN"]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) {
    return <EmptyState message="Aucun profil élève associé." />;
  }

  const enrollment = student.enrollments[0];
  if (!enrollment) {
    return (
      <div>
        <PageHeader
          title="Mon emploi du temps"
          description="Consultez votre planning de la semaine."
        />
        <EmptyState message="Vous n'êtes actuellement inscrit dans aucune classe." />
      </div>
    );
  }

  // Calcul dynamique de la semaine sélectionnée
  const refDate = sp.date ? new Date(sp.date) : new Date();
  const validRefDate = isNaN(refDate.getTime()) ? new Date() : refDate;
  const monday = getMonday(validRefDate);
  const friday = addDays(monday, 4);

  const prevWeekStr = toISODate(addDays(monday, -7));
  const nextWeekStr = toISODate(addDays(monday, 7));
  const todayStr = toISODate(new Date());

  const weekDays = [
    { value: 1, label: "Lundi", date: monday },
    { value: 2, label: "Mardi", date: addDays(monday, 1) },
    { value: 3, label: "Mercredi", date: addDays(monday, 2) },
    { value: 4, label: "Jeudi", date: addDays(monday, 3) },
    { value: 5, label: "Vendredi", date: friday },
  ];

  const [timeSlots, entries] = await Promise.all([
    prisma.timeSlot.findMany({
      where: { schoolId },
      orderBy: { order: "asc" },
    }),
    prisma.scheduleEntry.findMany({
      where: { schoolId, classId: enrollment.classId },
      include: {
        subject: true,
        teacher: true,
        room: true,
        timeSlot: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emploi du temps"
        description={`Planning hebdomadaire de la classe de ${enrollment.class.name} (${enrollment.academicYear.name})`}
        actions={<PrintButton />}
      />

      {/* Bannière dynamique avec la date de la semaine et les contrôles pour changer de semaine */}
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-[#002b5b] to-[#1a4a82] p-5 text-white shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8fe3cf] text-xl font-bold text-[#002b5b] shadow-xs">
            📅
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8fe3cf]">
              Semaine en cours
            </p>
            <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-bold sm:text-xl">
              {formatWeekRange(monday, friday)}
            </h2>
          </div>
        </div>

        {/* Contrôles interactifs pour changer de semaine */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/s/${schoolId}/student/schedule?date=${prevWeekStr}`}>
            <Button
              variant="secondary"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs px-3 py-1.5"
            >
              &larr; Semaine préc.
            </Button>
          </Link>

          <Link href={`/s/${schoolId}/student/schedule`}>
            <Button
              variant="secondary"
              className="bg-[#8fe3cf] text-[#002b5b] border-transparent hover:bg-[#7ed1be] text-xs px-3.5 py-1.5 font-bold"
            >
              Aujourd&apos;hui
            </Button>
          </Link>

          <Link href={`/s/${schoolId}/student/schedule?date=${nextWeekStr}`}>
            <Button
              variant="secondary"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs px-3 py-1.5"
            >
              Semaine suiv. &rarr;
            </Button>
          </Link>
        </div>
      </div>

      {/* Résumé de classe */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3 py-3 border-l-4 border-l-[#002b5b]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5f8f3] text-lg font-bold text-[#002b5b]">
            🏫
          </div>
          <div>
            <p className="text-xs text-[#3d5278]">Classe</p>
            <p className="text-sm font-bold text-[#0c2340]">{enrollment.class.name}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3 py-3 border-l-4 border-l-[#8fe3cf]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf8] text-lg font-bold text-[#264c93]">
            📚
          </div>
          <div>
            <p className="text-xs text-[#3d5278]">Volume hebdomadaire</p>
            <p className="text-sm font-bold text-[#0c2340]">{entries.length} heures de cours / semaine</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3 py-3 border-l-4 border-l-[#264c93]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff4b8] text-lg font-bold text-[#002b5b]">
            🗓️
          </div>
          <div>
            <p className="text-xs text-[#3d5278]">Année scolaire</p>
            <p className="text-sm font-bold text-[#0c2340]">{enrollment.academicYear.name}</p>
          </div>
        </Card>
      </div>

      {/* Grille hebdomadaire avec en-têtes dynamiques par date */}
      {timeSlots.length === 0 ? (
        <EmptyState message="Aucun créneau horaire configuré dans l'établissement." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#c9d7ee] bg-white shadow-sm">
          <table className="min-w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#d7efe8] bg-[#002b5b] text-white">
                <th className="w-28 px-4 py-3.5 font-bold tracking-wider text-xs uppercase text-[#8fe3cf]">
                  Créneau
                </th>
                {weekDays.map((d) => {
                  const dayISODate = toISODate(d.date);
                  const isToday = dayISODate === todayStr;
                  const dayNumber = d.date.getDate();
                  const monthShort = d.date.toLocaleDateString("fr-FR", {
                    month: "short",
                  });

                  return (
                    <th
                      key={d.value}
                      className={`min-w-[170px] px-4 py-3.5 text-center ${
                        isToday ? "bg-[#1a4a82]" : ""
                      }`}
                    >
                      <div className="font-bold text-sm text-white">
                        {d.label}
                      </div>
                      <div className="mt-0.5 flex items-center justify-center gap-1.5">
                        <span className="text-xs text-[#8fe3cf] font-medium">
                          {dayNumber} {monthShort}
                        </span>
                        {isToday ? (
                          <span className="rounded-full bg-[#8fe3cf] px-2 py-0.2 text-[9px] font-extrabold uppercase tracking-wider text-[#002b5b]">
                            Aujourd&apos;hui
                          </span>
                        ) : null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, slotIndex) => {
                const isEven = slotIndex % 2 === 0;
                return (
                  <tr
                    key={slot.id}
                    className={`border-b border-[#eef2f7] ${
                      isEven ? "bg-white" : "bg-[#fbfdff]"
                    }`}
                  >
                    <td className="border-r border-[#eef2f7] bg-[#f8fbfe] px-4 py-3 text-center">
                      <div className="text-xs font-bold text-[#002b5b]">
                        {slot.label}
                      </div>
                      <div className="text-[11px] font-medium text-[#5a7199]">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </td>

                    {weekDays.map((d) => {
                      const dayISODate = toISODate(d.date);
                      const isToday = dayISODate === todayStr;
                      const entry = entries.find(
                        (e) =>
                          e.timeSlotId === slot.id && e.dayOfWeek === d.value
                      );

                      const colors =
                        (entry && SUBJECT_COLORS[entry.subject.name]) || {
                          bg: "bg-[#e5f8f3]",
                          text: "text-[#002b5b]",
                          border: "border-[#8fe3cf]",
                          badge: "bg-[#002b5b] text-white",
                        };

                      return (
                        <td
                          key={d.value}
                          className={`p-2 border-r border-[#f0f4fa] last:border-r-0 align-top ${
                            isToday ? "bg-[#f0f7ff]/40" : ""
                          }`}
                        >
                          {entry ? (
                            <div
                              className={`h-full min-h-[72px] rounded-xl border p-2.5 transition duration-150 hover:shadow-md ${colors.bg} ${colors.border}`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span
                                  className={`font-bold text-sm leading-tight ${colors.text}`}
                                >
                                  {entry.subject.name}
                                </span>
                                {entry.room ? (
                                  <span className="shrink-0 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-[#002b5b] shadow-2xs">
                                    {entry.room.name}
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-2 flex items-center justify-between text-xs">
                                <span
                                  className={`truncate text-[11px] font-medium opacity-90 ${colors.text}`}
                                >
                                  {fullName(
                                    entry.teacher.firstName,
                                    entry.teacher.lastName
                                  )}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-full min-h-[72px] items-center justify-center rounded-xl border border-dashed border-[#e6eef8] bg-[#fbfdff]/40 text-xs text-[#a0aec0]">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
