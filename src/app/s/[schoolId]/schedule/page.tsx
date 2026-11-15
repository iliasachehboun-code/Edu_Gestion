import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  EmptyState,
} from "@/components/ui";
import {
  createRoomAction,
  createScheduleEntryAction,
  createTimeSlotAction,
  deleteScheduleEntryAction,
} from "@/app/actions/schedule";
import { DAYS, dayLabel, fullName } from "@/lib/utils";
import { ConfirmSubmit } from "@/components/confirm-submit";

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ classId?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  const { role, user } = await requireSchoolAccess(schoolId, [
    "SCHOOL_ADMIN",
    "TEACHER",
  ]);

  const [classes, subjects, teachers, timeSlots, rooms] = await Promise.all([
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.teacher.findMany({
      where: { schoolId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.timeSlot.findMany({
      where: { schoolId },
      orderBy: { order: "asc" },
    }),
    prisma.room.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
  ]);

  let teacherId: string | undefined;
  if (role === "TEACHER") {
    const t = await prisma.teacher.findFirst({
      where: { schoolId, userId: user.id },
    });
    teacherId = t?.id;
  }

  const classId = sp.classId || classes[0]?.id;

  const entries = await prisma.scheduleEntry.findMany({
    where: {
      schoolId,
      ...(teacherId && role === "TEACHER"
        ? { teacherId }
        : classId
          ? { classId }
          : {}),
    },
    include: {
      class: true,
      subject: true,
      teacher: true,
      timeSlot: true,
      room: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Emplois du temps"
        description="Grille hebdomadaire avec détection de conflits."
      />

      {role === "SCHOOL_ADMIN" ? (
        <Card className="mb-6">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1">
              <Field label="Classe">
                <Select name="classId" defaultValue={classId}>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="submit" variant="secondary">
              Afficher
            </Button>
          </form>
        </Card>
      ) : null}

      {timeSlots.length === 0 ? (
        <EmptyState message="Aucun créneau horaire configuré." />
      ) : (
        <div className="mb-8 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-brand-soft">
                <th className="border-b border-line px-3 py-2 text-left">
                  Créneau
                </th>
                {DAYS.map((d) => (
                  <th
                    key={d.value}
                    className="border-b border-line px-3 py-2 text-left"
                  >
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => (
                <tr key={slot.id}>
                  <td className="border-b border-line px-3 py-2 font-medium text-muted">
                    {slot.label}
                  </td>
                  {DAYS.map((d) => {
                    const cell = entries.find(
                      (e) =>
                        e.timeSlotId === slot.id && e.dayOfWeek === d.value
                    );
                    return (
                      <td
                        key={d.value}
                        className="border-b border-line px-2 py-2 align-top"
                      >
                        {cell ? (
                          <div className="rounded-lg bg-brand-soft p-2 text-xs text-brand">
                            <div className="font-semibold">
                              {cell.subject.name}
                            </div>
                            <div>{cell.class.name}</div>
                            <div className="text-brand/80">
                              {fullName(
                                cell.teacher.firstName,
                                cell.teacher.lastName
                              )}
                            </div>
                            {cell.room ? <div>{cell.room.name}</div> : null}
                            {role === "SCHOOL_ADMIN" ? (
                              <form
                                action={async () => {
                                  "use server";
                                  await deleteScheduleEntryAction(
                                    schoolId,
                                    cell.id
                                  );
                                }}
                                className="mt-1"
                              >
                                <ConfirmSubmit message="Confirmer ce retrait ?">Retirer</ConfirmSubmit>
                              </form>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-line-strong">—</span>
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

      {role === "SCHOOL_ADMIN" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <h2 className="mb-4 font-semibold">Ajouter un cours</h2>
            <form
              action={createScheduleEntryAction.bind(null, schoolId)}
              className="space-y-3"
            >
              <Field label="Classe">
                <Select name="classId" required defaultValue={classId}>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Matière">
                <Select name="subjectId" required>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Enseignant">
                <Select name="teacherId" required>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {fullName(t.firstName, t.lastName)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Jour">
                <Select name="dayOfWeek" required>
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Créneau">
                <Select name="timeSlotId" required>
                  {timeSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Salle">
                <Select name="roomId" defaultValue="">
                  <option value="">—</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit" className="w-full">
                Ajouter
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold">Nouveau créneau</h2>
            <form
              action={createTimeSlotAction.bind(null, schoolId)}
              className="space-y-3"
            >
              <Field label="Libellé">
                <Input name="label" required placeholder="16h-17h" />
              </Field>
              <Field label="Début">
                <Input name="startTime" required placeholder="16:00" />
              </Field>
              <Field label="Fin">
                <Input name="endTime" required placeholder="17:00" />
              </Field>
              <Field label="Ordre">
                <Input
                  name="order"
                  type="number"
                  required
                  defaultValue={timeSlots.length + 1}
                />
              </Field>
              <Button type="submit" className="w-full">
                Créer
              </Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold">Nouvelle salle</h2>
            <form
              action={createRoomAction.bind(null, schoolId)}
              className="space-y-3"
            >
              <Field label="Nom">
                <Input name="name" required placeholder="Salle 12" />
              </Field>
              <Button type="submit" className="w-full">
                Créer
              </Button>
            </form>
            {rooms.length > 0 ? (
              <ul className="mt-4 space-y-1 text-sm text-muted">
                {rooms.map((r) => (
                  <li key={r.id}>{r.name}</li>
                ))}
              </ul>
            ) : null}
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Vue enseignant — vos cours uniquement.
          {entries.length === 0
            ? " Aucun cours planifié."
            : ` ${entries.length} séance(s) cette semaine.`}
        </p>
      )}

      {/* silence unused */}
      <span className="hidden">{dayLabel(1)}</span>
    </div>
  );
}
