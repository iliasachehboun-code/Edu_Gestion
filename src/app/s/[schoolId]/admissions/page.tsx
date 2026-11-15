import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SectionTitle,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { enrollStudentAction } from "@/app/actions/admin";
import { createClassAction, deleteClassAction } from "@/app/actions/academic";
import { AutoFilterForm } from "@/components/auto-filter-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { schoolTrail } from "@/components/breadcrumbs";
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

  const year = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
  });

  const [students, classes, enrollments] = await Promise.all([
    prisma.student.findMany({
      where: {
        schoolId,
        active: true,
        ...(classId ? { enrollments: { some: { classId } } } : {}),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: year
          ? { where: { academicYearId: year.id } }
          : false,
      },
    }),
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
        description="Classes, inscriptions et affectations pour l'année en cours."
        breadcrumbs={schoolTrail(schoolId, {
          label: "Admissions",
          path: "/admissions",
        })}
      />

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <SectionTitle>Classes</SectionTitle>
          {classes.length === 0 ? (
            <EmptyState message="Aucune classe. Créez-en une à droite." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Nom</Th>
                  <Th>Niveau</Th>
                  <Th>Effectif</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <Td className="font-medium">{c.name}</Td>
                    <Td>{c.level || "—"}</Td>
                    <Td>
                      {Array.isArray(c.enrollments)
                        ? c.enrollments.length
                        : c._count.enrollments}
                    </Td>
                    <Td>
                      <form
                        action={async () => {
                          "use server";
                          await deleteClassAction(schoolId, c.id);
                        }}
                      >
                        <ConfirmSubmit message={`Supprimer la classe ${c.name} ?`}>
                          Supprimer
                        </ConfirmSubmit>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <SectionTitle>Nouvelle classe</SectionTitle>
          <form
            action={createClassAction.bind(null, schoolId)}
            className="space-y-3"
          >
            <Field label="Nom">
              <Input name="name" required placeholder="6ème A" />
            </Field>
            <Field label="Niveau">
              <Input name="level" placeholder="6ème" />
            </Field>
            <Field label="Capacité">
              <Input name="capacity" type="number" min={1} />
            </Field>
            <Button type="submit" className="w-full">
              Créer la classe
            </Button>
          </form>
        </Card>
      </div>

      <Card className="mb-6">
        <AutoFilterForm className="grid gap-3 sm:grid-cols-2">
          <Field label="Filtrer les inscriptions">
            <Select name="classId" defaultValue={classId}>
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </AutoFilterForm>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        {enrollments.length === 0 ? (
          <EmptyState message="Aucune inscription." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Élève</Th>
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
              Définissez une année scolaire courante dans Configuration › Années.
            </p>
          ) : classes.length === 0 ? (
            <p className="text-sm text-muted">
              Créez d&apos;abord une classe ci-dessus.
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
