import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
  EmptyState,
} from "@/components/ui";
import {
  saveAttendanceAction,
  reviewAttendanceJustificationAction,
} from "@/app/actions/attendance";
import { AttendanceScan } from "@/components/attendance-scan";
import { formatDate, fullName } from "@/lib/utils";

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ classId?: string; date?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  const { school } = await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN", "TEACHER"]);

  const year = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
  });
  const classes = await prisma.class.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
  });

  const classId = sp.classId || classes[0]?.id;
  const dateStr = sp.date || new Date().toISOString().slice(0, 10);
  const date = new Date(dateStr);
  date.setHours(12, 0, 0, 0);

  const students =
    classId && year
      ? await prisma.student.findMany({
          where: {
            schoolId,
            enrollments: { some: { classId, academicYearId: year.id } },
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        })
      : [];

  const existing = classId
    ? await prisma.attendance.findMany({
        where: { schoolId, classId, date },
      })
    : [];
  const byStudent = new Map(existing.map((a) => [a.studentId, a]));

  const recent = await prisma.attendance.findMany({
    where: {
      schoolId,
      status: { in: ["ABSENT", "LATE", "EXCUSED"] },
    },
    include: { student: true, class: true },
    orderBy: { date: "desc" },
    take: 20,
  });

  const pendingJustifications = await prisma.attendance.findMany({
    where: {
      schoolId,
      justificationStatus: "EN_ATTENTE_VALIDATION",
    },
    include: { student: true, class: true, subject: true },
    orderBy: { date: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Présences et absences"
        description="Pointage quotidien par classe et validation des justificatifs d'absence."
      />

      {/* Section validation des justificatifs par la vie scolaire */}
      {pendingJustifications.length > 0 && (
        <div className="mb-8 rounded-2xl border-2 border-[#f59e0b] bg-[#fffbeb] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">⏳</span>
              <div>
                <h3 className="font-bold text-sm text-[#92400e]">
                  Justificatifs médicaux en attente de validation ({pendingJustifications.length})
                </h3>
                <p className="text-xs text-[#b45309]">
                  Examinez les pièces jointes confidentielles et validez ou refusez la justification.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#fde68a] bg-white rounded-xl border border-[#fde68a] overflow-hidden">
            {pendingJustifications.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#0c2340]">
                      {fullName(item.student.firstName, item.student.lastName)}
                    </span>
                    <span className="text-xs rounded-lg bg-[#e4ecf8] px-2 py-0.5 font-bold text-[#002b5b]">
                      {item.class.name}
                    </span>
                  </div>
                  <p className="text-xs text-[#5a7199] mt-0.5">
                    📅 Absence du {formatDate(item.date)} ({item.time || "08h00 - 10h00"}) · {item.subject?.name || "Matière"}
                  </p>
                  <p className="text-xs text-[#1a3d6e] font-semibold mt-1">
                    Motif : {item.justificationType || "Certificat médical"}
                    {item.justificationComment ? ` (${item.justificationComment})` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {item.justificationFile && (
                    <a
                      href={`/api/s/${schoolId}/attendance/${item.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-[#c9d7ee] bg-white px-3 py-1.5 text-xs font-bold text-[#002b5b] hover:bg-[#f0f4f9] transition inline-flex items-center gap-1.5"
                    >
                      <span>🔒</span>
                      <span>Voir la pièce</span>
                    </a>
                  )}

                  <form
                    action={async () => {
                      "use server";
                      await reviewAttendanceJustificationAction(schoolId, item.id, "APPROVE");
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-xl bg-[#00875a] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#00704a] transition cursor-pointer"
                    >
                      ✓ Valider
                    </button>
                  </form>

                  <form
                    action={async () => {
                      "use server";
                      await reviewAttendanceJustificationAction(
                        schoolId,
                        item.id,
                        "REJECT",
                        "Pièce non recevable ou illisible"
                      );
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-xl bg-[#be123c] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#9f1239] transition cursor-pointer"
                    >
                      ✕ Refuser
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="mb-6">
        <form method="get" className="grid gap-3 md:grid-cols-3">
          <Field label="Classe">
            <Select name="classId" defaultValue={classId}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date">
            <Input name="date" type="date" defaultValue={dateStr} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="secondary" className="w-full">
              Afficher
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <h2 className="mb-4 font-semibold">
            Pointage — {formatDate(date)}
          </h2>
          {students.length === 0 ? (
            <EmptyState message="Aucun élève dans cette classe." />
          ) : (
            <form action={saveAttendanceAction.bind(null, schoolId)}>
              <input type="hidden" name="classId" value={classId} />
              <input type="hidden" name="date" value={dateStr} />
              <div className="space-y-3">
                {students.map((s) => {
                  const current = byStudent.get(s.id);
                  return (
                    <div
                      key={s.id}
                      className="grid gap-2 rounded-lg border border-[#e6eef8] p-3 md:grid-cols-[1fr_160px_1fr]"
                    >
                      <input type="hidden" name="studentId" value={s.id} />
                      <div className="font-medium">
                        {fullName(s.firstName, s.lastName)}
                      </div>
                      <Select
                        name={`status_${s.id}`}
                        defaultValue={current?.status || "PRESENT"}
                      >
                        <option value="PRESENT">Présent</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LATE">Retard</option>
                        <option value="EXCUSED">Excusé</option>
                      </Select>
                      <Input
                        name={`reason_${s.id}`}
                        placeholder="Motif"
                        defaultValue={current?.reason || ""}
                      />
                    </div>
                  );
                })}
              </div>
              <Button type="submit" className="mt-4">
                Enregistrer le pointage
              </Button>
            </form>
          )}
        </Card>

        <div>
          <h2 className="mb-3 font-semibold">Historique récent</h2>
          {recent.length === 0 ? (
            <EmptyState message="Aucune absence récente." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Élève</Th>
                  <Th>Statut</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <Td>{formatDate(a.date)}</Td>
                    <Td>
                      {fullName(a.student.firstName, a.student.lastName)}
                      <div className="text-xs text-[#3d5278]">
                        {a.class.name}
                      </div>
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          a.status === "ABSENT"
                            ? "danger"
                            : a.status === "LATE"
                              ? "warning"
                              : "info"
                        }
                      >
                        {a.status}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>

      {classId && students.length > 0 ? (
        <AttendanceScan
          schoolId={schoolId}
          schoolName={school.name}
          classId={classId}
          className={classes.find((c) => c.id === classId)?.name || "Classe"}
          dateStr={dateStr}
          dateLabel={formatDate(date)}
          students={students.map((s) => ({
            id: s.id,
            name: fullName(s.firstName, s.lastName),
          }))}
        />
      ) : null}
    </div>
  );
}
