import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { formatDate, fullName } from "@/lib/utils";

export default async function ParentAttendancePage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { user } = await requireSchoolAccess(schoolId, ["PARENT", "SCHOOL_ADMIN"]);

  const parent = await prisma.parent.findFirst({
    where: { schoolId, userId: user.id },
    include: { children: true },
  });
  const studentIds = parent?.children.map((c) => c.studentId) || [];

  const rows = await prisma.attendance.findMany({
    where: {
      schoolId,
      studentId: { in: studentIds },
      status: { in: ["ABSENT", "LATE", "EXCUSED"] },
    },
    include: { student: true, class: true },
    orderBy: { date: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Absences"
        description="Historique des absences et retards."
      />
      {rows.length === 0 ? (
        <EmptyState message="Aucune absence enregistrée." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Élève</Th>
              <Th>Classe</Th>
              <Th>Statut</Th>
              <Th>Motif</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <Td>{formatDate(a.date)}</Td>
                <Td>{fullName(a.student.firstName, a.student.lastName)}</Td>
                <Td>{a.class.name}</Td>
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
                <Td>{a.reason || "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
