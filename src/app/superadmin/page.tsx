import { prisma } from "@/lib/prisma";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  SectionTitle,
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
        <div className="min-w-0">
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
                  <tr key={school.id} className="hover:bg-brand-soft/40">
                    <Td>
                      <div className="font-medium">{school.name}</div>
                      <div className="text-xs text-muted">{school.slug}</div>
                    </Td>
                    <Td>{school._count.students}</Td>
                    <Td>{school._count.teachers}</Td>
                    <Td>
                      <Badge tone={school.active ? "success" : "danger"}>
                        {school.active ? "Active" : "Inactive"}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/s/${school.id}`}
                          className="text-sm font-semibold text-brand hover:underline"
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
                            className="text-sm text-muted hover:text-brand hover:underline"
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
          <SectionTitle>Nouvelle école</SectionTitle>
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
            <hr className="border-line" />
            <p className="text-sm font-semibold text-brand">
              Compte administrateur (optionnel)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
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
