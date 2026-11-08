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
} from "@/components/ui";
import {
  createSchoolAction,
  toggleSchoolActiveAction,
} from "@/app/actions/schools";
import Link from "next/link";

export default async function SuperAdminPage() {
  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true, teachers: true, memberships: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Écoles"
        description="Créez et gérez les établissements de la plateforme."
      />

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          {schools.length === 0 ? (
            <Card>Aucune école pour le moment.</Card>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>École</Th>
                  <Th>Élèves</Th>
                  <Th>Enseignants</Th>
                  <Th>Statut</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id}>
                    <Td>
                      <div className="font-medium">{school.name}</div>
                      <div className="text-xs text-[#3d5278]">{school.slug}</div>
                    </Td>
                    <Td>{school._count.students}</Td>
                    <Td>{school._count.teachers}</Td>
                    <Td>
                      <Badge tone={school.active ? "success" : "danger"}>
                        {school.active ? "Active" : "Inactive"}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex gap-2">
                        <Link
                          href={`/s/${school.id}`}
                          className="text-sm font-medium text-[#264c93] hover:underline"
                        >
                          Ouvrir
                        </Link>
                        <form
                          action={async () => {
                            "use server";
                            await toggleSchoolActiveAction(school.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-sm text-[#3d5278] hover:underline"
                          >
                            {school.active ? "Désactiver" : "Activer"}
                          </button>
                        </form>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nouvelle école</h2>
          <form action={createSchoolAction} className="space-y-3">
            <Field label="Nom de l'école">
              <Input name="name" required placeholder="Collège Saint-Martin" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" />
            </Field>
            <Field label="Téléphone">
              <Input name="phone" />
            </Field>
            <Field label="Adresse">
              <Input name="address" />
            </Field>
            <hr className="border-[#c9d7ee]" />
            <p className="text-sm font-medium text-[#1a3d6e]">
              Compte administrateur (optionnel)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom">
                <Input name="adminFirstName" />
              </Field>
              <Field label="Nom">
                <Input name="adminLastName" />
              </Field>
            </div>
            <Field label="Email admin">
              <Input name="adminEmail" type="email" />
            </Field>
            <Field label="Mot de passe">
              <Input name="adminPassword" type="password" />
            </Field>
            <Button type="submit" className="w-full">
              Créer l&apos;école
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
