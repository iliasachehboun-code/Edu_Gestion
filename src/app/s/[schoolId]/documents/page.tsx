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
import {
  createDocumentAction,
  deleteDocumentAction,
} from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const [documents, bulletins] = await Promise.all([
    prisma.document.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.reportCard.count({ where: { schoolId } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Pièces administratives de l'établissement."
        actions={
          <Link
            href={`/s/${schoolId}/bulletins`}
            className="text-sm font-medium text-[#264c93] hover:underline"
          >
            {bulletins} bulletin(s)
          </Link>
        }
      />
      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        {documents.length === 0 ? (
          <EmptyState message="Aucun document enregistré." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Titre</Th>
                <Th>Catégorie</Th>
                <Th>Date</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <Td>
                    <div className="font-medium">{d.title}</div>
                    {d.note ? (
                      <div className="text-xs text-[#3d5278]">{d.note}</div>
                    ) : null}
                  </Td>
                  <Td>{d.category}</Td>
                  <Td>{formatDate(d.createdAt)}</Td>
                  <Td>
                    <form
                      action={async () => {
                        "use server";
                        await deleteDocumentAction(schoolId, d.id);
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
          <h2 className="mb-4 text-lg font-semibold">Ajouter un document</h2>
          <form
            action={createDocumentAction.bind(null, schoolId)}
            className="space-y-3"
          >
            <Field label="Titre">
              <Input name="title" required placeholder="Règlement intérieur" />
            </Field>
            <Field label="Catégorie">
              <Select name="category" defaultValue="Administratif">
                <option>Administratif</option>
                <option>Pédagogique</option>
                <option>Financier</option>
                <option>Légal</option>
              </Select>
            </Field>
            <Field label="Note">
              <Input name="note" />
            </Field>
            <Button type="submit" className="w-full">
              Enregistrer
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
