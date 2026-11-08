import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader, Card } from "@/components/ui";
import { DAYS, fullName } from "@/lib/utils";

export default async function ParentSchedulePage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { user } = await requireSchoolAccess(schoolId, ["PARENT", "SCHOOL_ADMIN"]);

  const parent = await prisma.parent.findFirst({
    where: { schoolId, userId: user.id },
    include: {
      children: {
        include: {
          student: {
            include: {
              enrollments: {
                include: { class: true, academicYear: true },
                where: { academicYear: { isCurrent: true } },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const timeSlots = await prisma.timeSlot.findMany({
    where: { schoolId },
    orderBy: { order: "asc" },
  });

  if (!parent?.children.length) {
    return <EmptyState message="Aucun enfant lié." />;
  }

  return (
    <div>
      <PageHeader
        title="Emplois du temps"
        description="Planning des classes de vos enfants."
      />
      <div className="space-y-8">
        {await Promise.all(
          parent.children.map(async (link) => {
            const student = link.student;
            const enrollment = student.enrollments[0];
            if (!enrollment) {
              return (
                <Card key={student.id}>
                  <h2 className="font-semibold">
                    {fullName(student.firstName, student.lastName)}
                  </h2>
                  <p className="mt-2 text-sm text-[#3d5278]">Non inscrit.</p>
                </Card>
              );
            }

            const entries = await prisma.scheduleEntry.findMany({
              where: { schoolId, classId: enrollment.classId },
              include: {
                subject: true,
                teacher: true,
                timeSlot: true,
                room: true,
              },
            });

            return (
              <div key={student.id}>
                <h2 className="mb-3 font-semibold">
                  {fullName(student.firstName, student.lastName)} —{" "}
                  {enrollment.class.name}
                </h2>
                {timeSlots.length === 0 ? (
                  <EmptyState message="Pas de créneaux." />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#c9d7ee] bg-white">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-[#f4f8fc]">
                          <th className="px-3 py-2 text-left">Créneau</th>
                          {DAYS.map((d) => (
                            <th key={d.value} className="px-3 py-2 text-left">
                              {d.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map((slot) => (
                          <tr key={slot.id} className="border-t border-[#e6eef8]">
                            <td className="px-3 py-2 text-[#3d5278]">
                              {slot.label}
                            </td>
                            {DAYS.map((d) => {
                              const cell = entries.find(
                                (e) =>
                                  e.timeSlotId === slot.id &&
                                  e.dayOfWeek === d.value
                              );
                              return (
                                <td key={d.value} className="px-2 py-2">
                                  {cell ? (
                                    <div className="rounded-lg bg-[#e5f8f3] p-2 text-xs">
                                      <div className="font-semibold">
                                        {cell.subject.name}
                                      </div>
                                      <div>
                                        {fullName(
                                          cell.teacher.firstName,
                                          cell.teacher.lastName
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    "—"
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
          })
        )}
      </div>
    </div>
  );
}
