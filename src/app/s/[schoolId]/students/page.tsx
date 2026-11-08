import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
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
import { createStudentAction, deleteStudentAction } from "@/app/actions/people";
import { formatDate, fullName } from "@/lib/utils";

export default async function StudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ classId?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const classId = sp.classId || "";

  const [students, classes, year] = await Promise.all([
    prisma.student.findMany({
      where: {
        schoolId,
        ...(classId ? { enrollments: { some: { classId } } } : {}),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        enrollments: {
          include: { class: true, academicYear: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Étudiants"
        description="Dossiers des étudiants de l'établissement."
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
      <p className="mb-3 text-sm text-[#3d5278]">
        {students.length} étudiant{students.length > 1 ? "s" : ""}
      </p>
      <div className="grid gap-8 xl:grid-cols-[1.4fr_0.8fr]">
        <div>
          {students.length === 0 ? (
            <EmptyState message="Aucun élève enregistré." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Élève</Th>
                  <Th>Matricule</Th>
                  <Th>Classe</Th>
                  <Th>Naissance</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <Td className="font-medium">
                      {fullName(s.firstName, s.lastName)}
                    </Td>
                    <Td>{s.matricule || "—"}</Td>
                    <Td>{s.enrollments[0]?.class.name || "—"}</Td>
                    <Td>{formatDate(s.dateOfBirth)}</Td>
                    <Td>
                      <form
                        action={async () => {
                          "use server";
                          await deleteStudentAction(schoolId, s.id);
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
        </div>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nouvel élève</h2>
          <form
            action={createStudentAction.bind(null, schoolId)}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom">
                <Input name="firstName" required />
              </Field>
              <Field label="Nom">
                <Input name="lastName" required />
              </Field>
            </div>
            <Field label="Matricule">
              <Input name="matricule" />
            </Field>
            <Field label="Date de naissance">
              <Input name="dateOfBirth" type="date" />
            </Field>
            <Field label="Genre">
              <Select name="gender" defaultValue="">
                <option value="">—</option>
                <option value="M">Garçon</option>
                <option value="F">Fille</option>
              </Select>
            </Field>
            {year ? (
              <>
                <input type="hidden" name="academicYearId" value={year.id} />
                <Field label="Classe">
                  <Select name="classId" defaultValue="">
                    <option value="">Non inscrit</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}
            <Button type="submit" className="w-full">
              Ajouter
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
