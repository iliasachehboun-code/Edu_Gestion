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

  return (
    <div>
      <PageHeader
        title="Présences et absences"
        description="Pointage quotidien par classe."
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
            actionHref={`/s/${schoolId}/classes`}
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
