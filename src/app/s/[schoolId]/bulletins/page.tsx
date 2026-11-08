import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  Button,
  Card,
  Field,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
  EmptyState,
} from "@/components/ui";
import {
  generateBulletinAction,
  publishBulletinAction,
} from "@/app/actions/grades";
import { fullName } from "@/lib/utils";

export default async function BulletinsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN", "TEACHER"]);

  const year = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
    include: { terms: { orderBy: { order: "asc" } } },
  });

  const students = await prisma.student.findMany({
    where: { schoolId, active: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const reportCards = year
    ? await prisma.reportCard.findMany({
        where: { schoolId, academicYearId: year.id },
        include: { student: true, term: true },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Bulletins"
        description="Génération et publication des bulletins trimestriels."
      />

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          {reportCards.length === 0 ? (
            <EmptyState message="Aucun bulletin généré." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Élève</Th>
                  <Th>Trimestre</Th>
                  <Th>Moyenne</Th>
                  <Th>Statut</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {reportCards.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      {fullName(r.student.firstName, r.student.lastName)}
                    </Td>
                    <Td>{r.term.name}</Td>
                    <Td className="font-medium">
                      {r.average != null ? `${r.average}/20` : "—"}
                    </Td>
                    <Td>
                      <Badge tone={r.published ? "success" : "warning"}>
                        {r.published ? "Publié" : "Brouillon"}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex gap-3">
                        <Link
                          href={`/s/${schoolId}/bulletins/${r.id}`}
                          className="text-sm font-medium text-[#264c93] hover:underline"
                        >
                          Voir
                        </Link>
                        {!r.published ? (
                          <form
                            action={async () => {
                              "use server";
                              await publishBulletinAction(schoolId, r.id);
                            }}
                          >
                            <button
                              type="submit"
                              className="text-sm text-[#1a3d6e] hover:underline"
                            >
                              Publier
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Générer un bulletin</h2>
          {!year ? (
            <p className="text-sm text-[#3d5278]">Aucune année courante.</p>
          ) : (
            <form
              action={generateBulletinAction.bind(null, schoolId)}
              className="space-y-3"
            >
              <input type="hidden" name="academicYearId" value={year.id} />
              <Field label="Élève">
                <Select name="studentId" required>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {fullName(s.firstName, s.lastName)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Trimestre">
                <Select name="termId" required>
                  {year.terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="publish" />
                Publier immédiatement (notifie les parents)
              </label>
              <Button type="submit" className="w-full">
                Générer
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
