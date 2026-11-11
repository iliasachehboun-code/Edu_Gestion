import Link from "next/link";
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
import { fullName } from "@/lib/utils";

export default async function ParentBulletinsPage({
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

  const cards = await prisma.reportCard.findMany({
    where: {
      schoolId,
      studentId: { in: studentIds },
      published: true,
    },
    include: { student: true, term: true, academicYear: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Bulletins"
        description="Bulletins publiés de vos enfants."
      />
      {cards.length === 0 ? (
        <EmptyState message="Aucun bulletin publié." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Élève</Th>
              <Th>Période</Th>
              <Th>Moyenne</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id}>
                <Td>{fullName(c.student.firstName, c.student.lastName)}</Td>
                <Td>
                  {c.term.name} · {c.academicYear.name}
                </Td>
                <Td>
                  <Badge tone="success">
                    {c.average != null ? `${c.average}/20` : "—"}
                  </Badge>
                </Td>
                <Td>
                  <Link
                    href={`/s/${schoolId}/parent/bulletins/${c.id}`}
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    Consulter
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
