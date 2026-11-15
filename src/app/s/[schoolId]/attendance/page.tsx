import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
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
import { AttendanceLive } from "@/components/attendance-live";
import { reviewAttendanceJustificationAction } from "@/app/actions/attendance";
import { AttendanceScan } from "@/components/attendance-scan";
import { AutoFilterForm } from "@/components/auto-filter-form";
import { schoolTrail } from "@/components/breadcrumbs";
import { ExportMenu } from "@/components/export-menu";
import { GuidedEmpty } from "@/components/guided-empty";
import { buildQuery } from "@/lib/list-query";
import { formatDate, fullName } from "@/lib/utils";
import type { AttendanceStatus } from "@prisma/client";

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

  const selectedClass = classes.find((c) => c.id === classId);
  const exportQs = buildQuery(
    {},
    {
      classId: classId || undefined,
      date: dateStr || undefined,
    }
  );

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
        breadcrumbs={schoolTrail(
          schoolId,
          { label: "Présences", path: "/attendance" },
          selectedClass?.name
        )}
        actions={
          classId ? (
            <ExportMenu
              csvHref={`/s/${schoolId}/export/attendance${exportQs}`}
              pdfHref={`/s/${schoolId}/export/attendance/print${exportQs}`}
            />
          ) : undefined
        }
      />

      {/* Section validation des justificatifs d'absences */}
      {pendingJustifications.length > 0 && (
        <div className="mb-8 rounded-2xl border-2 border-[#f59e0b] bg-[#fffbeb] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">⏳</span>
              <div>
                <h3 className="font-bold text-sm text-[#92400e]">
                  Justificatifs d&apos;absence en attente de validation ({pendingJustifications.length})
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

      {!year ? (
        <div className="mb-6">
          <GuidedEmpty
            message="Aucune année scolaire courante. Configurez-en une pour pointer les présences."
            actionHref={`/s/${schoolId}/years`}
            actionLabel="Configurer l'année"
          />
        </div>
      ) : classes.length === 0 ? (
        <div className="mb-6">
          <GuidedEmpty
            message="Aucune classe disponible. Créez une classe puis inscrivez des élèves."
            actionHref={`/s/${schoolId}/admissions`}
            actionLabel="Créer une classe"
          />
        </div>
      ) : (
        <Card className="mb-6">
          <AutoFilterForm className="grid gap-3 sm:grid-cols-2">
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
          </AutoFilterForm>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr] xl:gap-8">
        <div className="min-w-0 space-y-6">
          {!year || classes.length === 0 ? (
            <Card>
              <EmptyState message="Sélectionnez une année et une classe pour commencer." />
            </Card>
          ) : students.length === 0 ? (
            <Card>
              <GuidedEmpty
                message="Aucun élève inscrit dans cette classe pour l'année courante."
                actionHref={`/s/${schoolId}/students`}
                actionLabel="Gérer les élèves"
              />
            </Card>
          ) : (
            <>
              <AttendanceLive
                key={`live-${classId}-${dateStr}`}
                schoolId={schoolId}
                classId={classId!}
                className={selectedClass?.name || "Classe"}
                dateStr={dateStr}
                dateLabel={formatDate(date)}
                students={students.map((s) => {
                  const current = byStudent.get(s.id);
                  return {
                    id: s.id,
                    name: fullName(s.firstName, s.lastName),
                    status: (current?.status || "PRESENT") as AttendanceStatus,
                    reason: current?.reason || "",
                  };
                })}
              />
              <AttendanceScan
                key={`scan-${classId}-${dateStr}`}
                schoolId={schoolId}
                schoolName={school.name}
                classId={classId!}
                className={selectedClass?.name || "Classe"}
                dateStr={dateStr}
                dateLabel={formatDate(date)}
                students={students.map((s) => ({
                  id: s.id,
                  name: fullName(s.firstName, s.lastName),
                }))}
              />
            </>
          )}
        </div>

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
                      <div className="text-xs text-muted">
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
    </div>
  );
}
