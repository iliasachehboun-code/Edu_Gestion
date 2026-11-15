import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import {
  createLibraryItemAction,
  deleteLibraryItemAction,
} from "@/app/actions/admin";
import { ConfirmSubmit } from "@/components/confirm-submit";

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const items = await prisma.libraryItem.findMany({
    where: { schoolId },
    orderBy: { title: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Bibliothèque"
        description="Catalogue des ouvrages disponibles."
      />
      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        {items.length === 0 ? (
          <EmptyState message="Le catalogue est vide." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Titre</Th>
                <Th>Auteur</Th>
                <Th>Exemplaires</Th>
                <Th>Disponibles</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <Td className="font-medium">{item.title}</Td>
                  <Td>{item.author || "—"}</Td>
                  <Td>{item.copies}</Td>
                  <Td>{item.available}</Td>
                  <Td>
                    <form
                      action={async () => {
                        "use server";
                        await deleteLibraryItemAction(schoolId, item.id);
                      }}
                    >
                      <ConfirmSubmit message="Confirmer ce retrait ?">Retirer</ConfirmSubmit>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nouvel ouvrage</h2>
          <form
            action={createLibraryItemAction.bind(null, schoolId)}
            className="space-y-3"
          >
            <Field label="Titre">
              <Input name="title" required />
            </Field>
            <Field label="Auteur">
              <Input name="author" />
            </Field>
            <Field label="Exemplaires">
              <Input name="copies" type="number" min={1} defaultValue={1} />
            </Field>
            <Button type="submit" className="w-full">
              Ajouter
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
