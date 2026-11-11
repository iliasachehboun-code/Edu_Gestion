import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
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
import {
  createAcademicYearAction,
  setCurrentYearAction,
} from "@/app/actions/academic";
import { formatDate } from "@/lib/utils";

export default async function YearsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const years = await prisma.academicYear.findMany({
    where: { schoolId },
    orderBy: { startDate: "desc" },
    include: { terms: { orderBy: { order: "asc" } } },
  });

  return (
    <div>
      <PageHeader
        title="Années scolaires"
        description="Années et trimestres."
      />
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          {years.length === 0 ? (
            <EmptyState message="Aucune année scolaire." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Année</Th>
                  <Th>Période</Th>
                  <Th>Trimestres</Th>
                  <Th>Statut</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {years.map((y) => (
                  <tr key={y.id}>
                    <Td className="font-medium">{y.name}</Td>
                    <Td>
                      {formatDate(y.startDate)} → {formatDate(y.endDate)}
                    </Td>
                    <Td>{y.terms.map((t) => t.name).join(", ")}</Td>
                    <Td>
                      {y.isCurrent ? (
                        <Badge tone="success">Courante</Badge>
                      ) : (
                        <Badge>Archivée</Badge>
                      )}
                    </Td>
                    <Td>
                      {!y.isCurrent ? (
                        <form
                          action={async () => {
                            "use server";
                            await setCurrentYearAction(schoolId, y.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-sm font-medium text-brand hover:underline"
                          >
                            Activer
                          </button>
                        </form>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nouvelle année</h2>
          <form
            action={createAcademicYearAction.bind(null, schoolId)}
            className="space-y-3"
          >
            <Field label="Nom">
              <Input name="name" required placeholder="2026-2027" />
            </Field>
            <Field label="Début">
              <Input name="startDate" type="date" required />
            </Field>
            <Field label="Fin">
              <Input name="endDate" type="date" required />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isCurrent" />
              Définir comme année courante
            </label>
            <Button type="submit" className="w-full">
              Créer
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
