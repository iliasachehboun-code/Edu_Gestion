import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { formatDate, formatMoney, fullName } from "@/lib/utils";
import { markAllNotificationsReadAction } from "@/app/actions/notifications";
import { Button } from "@/components/ui";

export default async function ParentDashboard({
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
                orderBy: { createdAt: "desc" },
                take: 1,
              },
              grades: {
                include: { subject: true, term: true },
                orderBy: { createdAt: "desc" },
                take: 5,
              },
              attendances: {
                where: { status: { in: ["ABSENT", "LATE", "EXCUSED"] } },
                orderBy: { date: "desc" },
                take: 5,
              },
              studentFees: {
                include: { feeType: true, payments: true },
                orderBy: { createdAt: "desc" },
                take: 5,
              },
            },
          },
        },
      },
    },
  });

  if (!parent) {
    return <EmptyState message="Aucun profil parent lié à ce compte." />;
  }

  const notifications = await prisma.notification.findMany({
    where: { schoolId, userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const children = parent.children.map((c) => c.student);

  return (
    <div>
      <PageHeader
        title={`Espace parent — ${parent.firstName}`}
        description="Suivi de vos enfants."
        actions={
          <form action={markAllNotificationsReadAction.bind(null, schoolId)}>
            <Button type="submit" variant="secondary">
              Tout marquer lu
            </Button>
          </form>
        }
      />

      {children.length === 0 ? (
        <EmptyState message="Aucun enfant lié." />
      ) : (
        <div className="space-y-8">
          {children.map((student) => {
            const enrollment = student.enrollments[0];
            return (
              <Card key={student.id}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {fullName(student.firstName, student.lastName)}
                    </h2>
                    <p className="text-sm text-[#3d5278]">
                      {enrollment
                        ? `${enrollment.class.name} · ${enrollment.academicYear.name}`
                        : "Non inscrit"}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <Link
                      href={`/s/${schoolId}/parent/bulletins`}
                      className="font-medium text-[#264c93] hover:underline"
                    >
                      Bulletins
                    </Link>
                    <Link
                      href={`/s/${schoolId}/parent/schedule`}
                      className="font-medium text-[#264c93] hover:underline"
                    >
                      EDT
                    </Link>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-[#3d5278]">
                      Dernières notes
                    </h3>
                    {student.grades.length === 0 ? (
                      <p className="text-sm text-[#5c7094]">—</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {student.grades.map((g) => (
                          <li key={g.id}>
                            {g.subject.name}:{" "}
                            <strong>
                              {g.score}/{g.maxScore}
                            </strong>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-[#3d5278]">
                      Absences / retards
                    </h3>
                    {student.attendances.length === 0 ? (
                      <p className="text-sm text-[#5c7094]">Aucune</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {student.attendances.map((a) => (
                          <li key={a.id}>
                            {formatDate(a.date)} — {a.status}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-[#3d5278]">
                      Frais
                    </h3>
                    {student.studentFees.length === 0 ? (
                      <p className="text-sm text-[#5c7094]">—</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {student.studentFees.map((f) => {
                          const paid = f.payments.reduce(
                            (s, p) => s + p.amount,
                            0
                          );
                          return (
                            <li key={f.id} className="flex items-center gap-2">
                              <span>
                                {f.feeType.name}: {formatMoney(paid)}/
                                {formatMoney(f.amount)}
                              </span>
                              <Badge
                                tone={
                                  f.status === "PAID" ? "success" : "warning"
                                }
                              >
                                {f.status}
                              </Badge>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 font-semibold">Notifications</h2>
        {notifications.length === 0 ? (
          <EmptyState message="Aucune notification." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Titre</Th>
                <Th>Message</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id}>
                  <Td>{formatDate(n.createdAt)}</Td>
                  <Td className="font-medium">{n.title}</Td>
                  <Td>{n.message}</Td>
                  <Td>
                    {!n.read ? <Badge tone="info">Nouveau</Badge> : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
