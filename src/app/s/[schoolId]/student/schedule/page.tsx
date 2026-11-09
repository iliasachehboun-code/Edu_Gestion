import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentForUser } from "@/lib/student";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { DAYS, fullName } from "@/lib/utils";

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

  const activeDays = DAYS.filter((d) => d.value <= 5); // Lundi à Vendredi (ou Samedi si cours)
  const hasSaturday = entries.some((e) => e.dayOfWeek === 6);
  const displayDays = hasSaturday ? DAYS : activeDays;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon emploi du temps"
        description={`Planning hebdomadaire — Classe de ${enrollment.class.name} (${enrollment.academicYear.name})`}
        actions={<PrintButton />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5f8f3] text-lg font-bold text-[#002b5b]">
            🏫
          </div>
          <div>
            <p className="text-xs text-[#3d5278]">Classe</p>
            <p className="text-sm font-bold text-[#0c2340]">{enrollment.class.name}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf8] text-lg font-bold text-[#264c93]">
            📚
          </div>
          <div>
            <p className="text-xs text-[#3d5278]">Total de cours / semaine</p>
            <p className="text-sm font-bold text-[#0c2340]">{entries.length} créneaux</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff4b8] text-lg font-bold text-[#002b5b]">
            🗓️
          </div>
          <div>
            <p className="text-xs text-[#3d5278]">Année scolaire</p>
            <p className="text-sm font-bold text-[#0c2340]">{enrollment.academicYear.name}</p>
          </div>
        </Card>
      </div>

      {timeSlots.length === 0 ? (
        <EmptyState message="Aucun créneau horaire configuré dans l'établissement." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#c9d7ee] bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#d7efe8] bg-[#e5f8f3]">
                <th className="w-28 px-4 py-3 font-semibold text-[#002b5b]">
                  Créneau
                </th>
                {displayDays.map((d) => (
                  <th
                    key={d.value}
                    className="min-w-[140px] px-4 py-3 font-semibold text-[#002b5b]"
                  >
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => (
                <tr key={slot.id} className="border-b border-[#f4f8fc]">
                  <td className="bg-[#fbfdff] px-4 py-3 font-medium text-[#3d5278]">
                    <div className="text-xs font-bold text-[#0c2340]">{slot.label}</div>
                    <div className="text-[11px] text-[#8a9bb5]">
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </td>
                  {displayDays.map((d) => {
                    const entry = entries.find(
                      (e) =>
                        e.timeSlotId === slot.id && e.dayOfWeek === d.value
                    );
                    return (
                      <td key={d.value} className="p-2 align-top">
                        {entry ? (
                          <div className="h-full rounded-xl border border-[#8fe3cf]/60 bg-gradient-to-b from-[#e5f8f3] to-[#d7f6ee]/60 p-2.5 transition hover:shadow-sm">
                            <div className="font-semibold text-[#002b5b]">
                              {entry.subject.name}
                            </div>
                            <div className="mt-1 text-xs text-[#264c93]">
                              {fullName(
                                entry.teacher.firstName,
                                entry.teacher.lastName
                              )}
                            </div>
                            {entry.room ? (
                              <div className="mt-2 inline-block rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-[#002b5b]">
                                📍 {entry.room.name}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="h-16 rounded-xl border border-dashed border-[#e6eef8] bg-[#fbfdff]/50" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
