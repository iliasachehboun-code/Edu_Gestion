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
import { inviteUserAction, removeMembershipAction } from "@/app/actions/admin";

const roleLabel: Record<string, string> = {
  SCHOOL_ADMIN: "Administrateur",
  TEACHER: "Enseignant",
  PARENT: "Parent",
};

export default async function UsersPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { user } = await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const memberships = await prisma.membership.findMany({
    where: { schoolId },
    include: { user: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Utilisateurs et permissions"
        description="Comptes rattachés à cet établissement et leur rôle."
      />
      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        {memberships.length === 0 ? (
          <EmptyState message="Aucun utilisateur." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nom</Th>
                <Th>Email</Th>
                <Th>Rôle</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => (
                <tr key={m.id}>
                  <Td className="font-medium">
                    {m.user.firstName} {m.user.lastName}
                  </Td>
                  <Td>{m.user.email}</Td>
                  <Td>
                    <Badge
                      tone={
                        m.role === "SCHOOL_ADMIN"
                          ? "info"
                          : m.role === "TEACHER"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {roleLabel[m.role] || m.role}
                    </Badge>
                  </Td>
                  <Td>
                    {m.userId !== user.id ? (
                      <form
                        action={async () => {
                          "use server";
                          await removeMembershipAction(schoolId, m.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-sm text-red-600 hover:underline"
                        >
                          Retirer
                        </button>
                      </form>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Ajouter un accès</h2>
          <form
            action={inviteUserAction.bind(null, schoolId)}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom">
                <Input name="firstName" required />
              </Field>
              <Field label="Nom">
                <Input name="lastName" required />
              </Field>
            </div>
            <Field label="Email">
              <Input name="email" type="email" required />
            </Field>
            <Field label="Mot de passe">
              <Input name="password" type="password" defaultValue="demo123" />
            </Field>
            <Field label="Rôle">
              <Select name="role" defaultValue="TEACHER">
                <option value="SCHOOL_ADMIN">Administrateur</option>
                <option value="TEACHER">Enseignant</option>
                <option value="PARENT">Parent</option>
              </Select>
            </Field>
            <Button type="submit" className="w-full">
              Créer l&apos;accès
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
