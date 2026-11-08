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
import { formatDate, formatMoney, fullName } from "@/lib/utils";

export default async function ParentPaymentsPage({
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

  const fees = await prisma.studentFee.findMany({
    where: { schoolId, studentId: { in: studentIds } },
    include: {
      student: true,
      feeType: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Paiements"
        description="Suivi des frais scolaires."
      />
      {fees.length === 0 ? (
        <EmptyState message="Aucun frais." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Élève</Th>
              <Th>Frais</Th>
              <Th>Montant</Th>
              <Th>Payé</Th>
              <Th>Échéance</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody>
            {fees.map((f) => {
              const paid = f.payments.reduce((s, p) => s + p.amount, 0);
              return (
                <tr key={f.id}>
                  <Td>
                    {fullName(f.student.firstName, f.student.lastName)}
                  </Td>
                  <Td>{f.feeType.name}</Td>
                  <Td>{formatMoney(f.amount)}</Td>
                  <Td>{formatMoney(paid)}</Td>
                  <Td>{formatDate(f.dueDate)}</Td>
                  <Td>
                    <Badge
                      tone={
                        f.status === "PAID"
                          ? "success"
                          : f.status === "OVERDUE"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {f.status}
                    </Badge>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
