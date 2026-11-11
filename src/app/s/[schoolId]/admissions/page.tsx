import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { enrollStudentAction } from "@/app/actions/admin";
import { fullName } from "@/lib/utils";

export default async function AdmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ classId?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  const classId = sp.classId || "";
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const [year, students, classes, enrollments] = await Promise.all([
    prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } }),
    prisma.student.findMany({
      where: {
        schoolId,
        active: true,
        ...(classId ? { enrollments: { some: { classId } } } : {}),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.enrollment.findMany({
      where: { schoolId, ...(classId ? { classId } : {}) },
      include: { student: true, class: true, academicYear: true },
      orderBy: [{ class: { name: "asc" } }, { student: { lastName: "asc" } }],
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Admissions et inscriptions"
        description="Inscrire un étudiant dans une classe pour l'année en cours."
      />
      <Card className="mb-6">
        <form method="get" className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Field label="Classe">
            <Select name="classId" defaultValue={classId}>
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="secondary">
              Filtrer
            </Button>
          </div>
        </form>
      </Card>
      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        {enrollments.length === 0 ? (
          <EmptyState message="Aucune inscription." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Étudiant</Th>
                <Th>Classe</Th>
                <Th>Année</Th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id}>
                  <Td className="font-medium">
                    {fullName(e.student.firstName, e.student.lastName)}
                  </Td>
                  <Td>{e.class.name}</Td>
                  <Td>{e.academicYear.name}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nouvelle inscription</h2>
          {!year ? (
            <p className="text-sm text-muted">
              Définissez une année scolaire courante dans les paramètres.
            </p>
          ) : (
            <form
              action={enrollStudentAction.bind(null, schoolId)}
              className="space-y-3"
            >
              <input type="hidden" name="academicYearId" value={year.id} />
              <Field label={`Année : ${year.name}`}>
                <Select name="studentId" required>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {fullName(s.firstName, s.lastName)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Classe">
                <Select name="classId" required>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit" className="w-full">
                Inscrire
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
