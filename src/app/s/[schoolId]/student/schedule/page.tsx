import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentForUser } from "@/lib/student";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { DAYS, fullName } from "@/lib/utils";

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
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

export default async function StudentSchedulePage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { user } = await requireSchoolAccess(schoolId, ["STUDENT", "SCHOOL_ADMIN"]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) {
    return <EmptyState message="Aucun profil étudiant associé." />;
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

  // Jours de la semaine complète (Lundi à Vendredi)
  const displayDays = DAYS.filter((d) => d.value <= 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emploi du temps de la semaine"
        description={`Planning complet du Lundi au Vendredi — Classe de ${enrollment.class.name} (${enrollment.academicYear.name})`}
        actions={<PrintButton />}
      />

      {/* Cartes d'information */}
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
            <p className="text-xs text-[#3d5278]">Total hebdomadaire</p>
            <p className="text-sm font-bold text-[#0c2340]">{entries.length} heures de cours / semaine</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3 py-3 border-l-4 border-l-[#264c93]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff4b8] text-lg font-bold text-[#002b5b]">
            🗓️
          </div>
          <div>
            <p className="text-xs text-[#3d5278]">Période</p>
            <p className="text-sm font-bold text-[#0c2340]">Semaine complète (Lundi - Vendredi)</p>
          </div>
        </Card>
      </div>

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
                {displayDays.map((d) => (
                  <th
                    key={d.value}
                    className="min-w-[170px] px-4 py-3.5 font-bold text-center text-sm"
                  >
                    {d.label}
                  </th>
                ))}
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

                    {displayDays.map((d) => {
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
                          className="p-2 border-r border-[#f0f4fa] last:border-r-0 align-top"
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
                                <span className={`truncate text-[11px] font-medium opacity-90 ${colors.text}`}>
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
