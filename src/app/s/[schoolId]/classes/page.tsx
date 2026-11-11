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
import { schoolTrail } from "@/components/breadcrumbs";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { GuidedEmpty } from "@/components/guided-empty";

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
        breadcrumbs={schoolTrail(schoolId, {
          label: "Classes",
          path: "/classes",
        })}
      />
      {!year ? (
        <div className="mb-6">
          <GuidedEmpty
            message="Aucune année scolaire courante. Configurez-en une pour suivre les effectifs par année."
            actionHref={`/s/${schoolId}/years`}
            actionLabel="Configurer l'année"
          />
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:gap-8">
        <div className="min-w-0">
          {classes.length === 0 ? (
            <EmptyState message="Aucune classe. Utilisez le formulaire pour en créer une." />
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
                        <ConfirmSubmit message="Confirmer cette suppression ?">Supprimer</ConfirmSubmit>
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
