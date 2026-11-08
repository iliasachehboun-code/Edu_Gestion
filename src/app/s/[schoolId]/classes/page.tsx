import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Table,
  Td,
  Th,
  EmptyState,
} from "@/components/ui";
import { createClassAction, deleteClassAction } from "@/app/actions/academic";

export default async function ClassesPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const year = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
  });

  const classes = await prisma.class.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          enrollments: true,
        },
      },
      enrollments: year
        ? { where: { academicYearId: year.id } }
        : false,
    },
  });

  return (
    <div>
      <PageHeader
        title="Classes et groupes"
        description="Organisation des classes et des effectifs."
      />
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          {classes.length === 0 ? (
            <EmptyState message="Aucune classe." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Nom</Th>
                  <Th>Niveau</Th>
                  <Th>Capacité</Th>
                  <Th>Effectif</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <Td className="font-medium">{c.name}</Td>
                    <Td>{c.level || "—"}</Td>
                    <Td>{c.capacity ?? "—"}</Td>
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
          <h2 className="mb-4 text-lg font-semibold">Nouvelle classe</h2>
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
              Créer
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
