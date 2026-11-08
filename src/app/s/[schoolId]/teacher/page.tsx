import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { DAYS, fullName } from "@/lib/utils";

export default async function TeacherDashboard({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { user } = await requireSchoolAccess(schoolId, ["TEACHER", "SCHOOL_ADMIN"]);

  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId: user.id },
    include: {
      assignments: { include: { class: true, subject: true } },
      scheduleEntries: {
        include: { class: true, subject: true, timeSlot: true },
        orderBy: [{ dayOfWeek: "asc" }, { timeSlot: { order: "asc" } }],
      },
    },
  });

  if (!teacher) {
    return (
      <EmptyState message="Aucun profil enseignant lié à ce compte." />
    );
  }

  return (
    <div>
      <PageHeader
        title={`Bonjour ${teacher.firstName}`}
        description="Votre espace enseignant."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Link href={`/s/${schoolId}/grades`}>
          <Card className="border-l-4 border-l-[#002b5b] transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-[#3d5278]">Notes</p>
            <p className="mt-1 font-semibold text-[#002b5b]">Saisir des notes</p>
          </Card>
        </Link>
        <Link href={`/s/${schoolId}/attendance`}>
          <Card className="border-l-4 border-l-[#e2c200] transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-[#3d5278]">Présences</p>
            <p className="mt-1 font-semibold text-[#002b5b]">Faire l&apos;appel</p>
          </Card>
        </Link>
        <Link href={`/s/${schoolId}/schedule`}>
          <Card className="border-l-4 border-l-[#264c93] transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-[#3d5278]">Planning</p>
            <p className="mt-1 font-semibold text-[#002b5b]">Mon emploi du temps</p>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Mes classes</h2>
          {teacher.assignments.length === 0 ? (
            <p className="text-sm text-[#3d5278]">Aucune affectation.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {teacher.assignments.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg bg-[#f4f8fc] px-3 py-2"
                >
                  {a.subject.name} — {a.class.name}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Cours de la semaine</h2>
          {teacher.scheduleEntries.length === 0 ? (
            <p className="text-sm text-[#3d5278]">Aucun cours planifié.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {teacher.scheduleEntries.map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg bg-[#e5f8f3] px-3 py-2 text-[#002b5b]"
                >
                  {DAYS.find((d) => d.value === e.dayOfWeek)?.label}{" "}
                  {e.timeSlot.label} — {e.subject.name} ({e.class.name})
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <p className="mt-4 hidden text-xs">{fullName(teacher.firstName, teacher.lastName)}</p>
    </div>
  );
}
