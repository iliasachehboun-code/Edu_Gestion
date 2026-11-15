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
import {
  createSubjectAction,
  deleteSubjectAction,
} from "@/app/actions/academic";
import { ConfirmSubmit } from "@/components/confirm-submit";

export default async function SubjectsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const subjects = await prisma.subject.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Matières et programmes"
        description="Matières, codes et coefficients (notes sur 20)."
      />
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          {subjects.length === 0 ? (
            <EmptyState message="Aucune matière." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Matière</Th>
                  <Th>Code</Th>
                  <Th>Coefficient</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <Td className="font-medium">{s.name}</Td>
                    <Td>{s.code || "—"}</Td>
                    <Td>{s.coefficient}</Td>
                    <Td>
                      <form
                        action={async () => {
                          "use server";
                          await deleteSubjectAction(schoolId, s.id);
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
          <h2 className="mb-4 text-lg font-semibold">Nouvelle matière</h2>
          <form
            action={createSubjectAction.bind(null, schoolId)}
            className="space-y-3"
          >
            <Field label="Nom">
              <Input name="name" required />
            </Field>
            <Field label="Code">
              <Input name="code" placeholder="MATH" />
            </Field>
            <Field label="Coefficient">
              <Input name="coefficient" type="number" step="0.5" defaultValue={1} />
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
