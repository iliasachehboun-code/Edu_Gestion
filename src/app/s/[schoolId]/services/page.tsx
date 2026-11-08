import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
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
  createCampusServiceAction,
  deleteCampusServiceAction,
} from "@/app/actions/admin";
import { formatMoney } from "@/lib/utils";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const services = await prisma.campusService.findMany({
    where: { schoolId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Transport et cantine"
        description="Services proposés aux étudiants."
      />
      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        {services.length === 0 ? (
          <EmptyState message="Aucun service configuré." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Service</Th>
                <Th>Type</Th>
                <Th>Détail</Th>
                <Th>Tarif</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <Td className="font-medium">{s.name}</Td>
                  <Td>
                    <Badge tone={s.kind === "transport" ? "info" : "success"}>
                      {s.kind === "transport" ? "Transport" : "Cantine"}
                    </Badge>
                  </Td>
                  <Td>{s.detail || "—"}</Td>
                  <Td>{s.price != null ? formatMoney(s.price) : "—"}</Td>
                  <Td>
                    <form
                      action={async () => {
                        "use server";
                        await deleteCampusServiceAction(schoolId, s.id);
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
          <h2 className="mb-4 text-lg font-semibold">Nouveau service</h2>
          <form
            action={createCampusServiceAction.bind(null, schoolId)}
            className="space-y-3"
          >
            <Field label="Type">
              <Select name="kind" defaultValue="cantine">
                <option value="cantine">Cantine</option>
                <option value="transport">Transport</option>
              </Select>
            </Field>
            <Field label="Nom">
              <Input name="name" required placeholder="Ligne A — matin" />
            </Field>
            <Field label="Détail">
              <Input name="detail" placeholder="Départ 7h15, arrêt Mairie" />
            </Field>
            <Field label="Tarif">
              <Input name="price" type="number" step="0.01" />
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
