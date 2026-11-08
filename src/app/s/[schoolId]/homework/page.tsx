import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { createGradeAction, deleteGradeAction } from "@/app/actions/grades";
import { fullName } from "@/lib/utils";

export default async function HomeworkPage({
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

  const [students, subjects, grades] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId, active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.grade.findMany({
      where: { schoolId, type: { in: ["DEVOIR", "AUTRE"] } },
      include: { student: true, subject: true, term: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Devoirs et évaluations"
        description="Travaux notés hors examens. Les examens restent dans Examens et notes."
        actions={
          <Link
            href={`/s/${schoolId}/grades`}
            className="text-sm font-medium text-[#264c93] hover:underline"
          >
            Voir les examens
          </Link>
        }
      />
      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        {grades.length === 0 ? (
          <EmptyState message="Aucun devoir enregistré." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Étudiant</Th>
                <Th>Matière</Th>
                <Th>Titre</Th>
                <Th>Note</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.id}>
                  <Td>{fullName(g.student.firstName, g.student.lastName)}</Td>
                  <Td>{g.subject.name}</Td>
                  <Td>{g.title || g.type}</Td>
                  <Td className="font-medium">
                    {g.score}/{g.maxScore}
                  </Td>
                  <Td>
                    <form
                      action={async () => {
                        "use server";
                        await deleteGradeAction(schoolId, g.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-sm text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nouveau devoir</h2>
          <form
            action={createGradeAction.bind(null, schoolId)}
            className="space-y-3"
          >
            <input type="hidden" name="type" value="DEVOIR" />
            <Field label="Étudiant">
              <Select name="studentId" required>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {fullName(s.firstName, s.lastName)}
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
            <Field label="Trimestre">
              <Select name="termId" required>
                {(year?.terms || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Titre">
              <Input name="title" placeholder="Devoir maison n°2" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Note">
                <Input name="score" type="number" step="0.25" required />
              </Field>
              <Field label="Sur">
                <Input name="maxScore" type="number" defaultValue={20} />
              </Field>
            </div>
            <Button type="submit" className="w-full">
              Enregistrer
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
