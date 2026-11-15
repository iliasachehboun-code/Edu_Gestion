import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
  EmptyState,
  Badge,
} from "@/components/ui";
import {
  createParentAction,
  linkParentStudentAction,
} from "@/app/actions/people";
import { fullName } from "@/lib/utils";

export default async function ParentsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const [parents, students] = await Promise.all([
    prisma.parent.findMany({
      where: { schoolId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        children: { include: { student: true } },
      },
    }),
    prisma.student.findMany({
      where: { schoolId, active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Parents"
        description="Comptes parents et liaison avec les élèves."
      />
      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          {parents.length === 0 ? (
            <EmptyState message="Aucun parent." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Parent</Th>
                  <Th>Contact</Th>
                  <Th>Enfants</Th>
                  <Th>Compte</Th>
                </tr>
              </thead>
              <tbody>
                {parents.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-medium">
                      {fullName(p.firstName, p.lastName)}
                    </Td>
                    <Td>
                      <div>{p.email || "—"}</div>
                      <div className="text-xs text-muted">
                        {p.phone || ""}
                      </div>
                    </Td>
                    <Td>
                      {p.children
                        .map((c) =>
                          fullName(c.student.firstName, c.student.lastName)
                        )
                        .join(", ") || "—"}
                    </Td>
                    <Td>
                      {p.userId ? (
                        <Badge tone="success">Actif</Badge>
                      ) : (
                        <Badge>Sans compte</Badge>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          <Card>
            <h2 className="mb-4 font-semibold">Lier parent ↔ élève</h2>
            <form
              action={linkParentStudentAction.bind(null, schoolId)}
              className="space-y-3"
            >
              <Field label="Parent">
                <Select name="parentId" required>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {fullName(p.firstName, p.lastName)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Élève">
                <Select name="studentId" required>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {fullName(s.firstName, s.lastName)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Relation">
                <Input name="relation" defaultValue="parent" />
              </Field>
              <Button type="submit">Lier</Button>
            </form>
          </Card>
        </div>

        <Card>
          <h2 className="mb-4 font-semibold">Nouveau parent</h2>
          <form
            action={createParentAction.bind(null, schoolId)}
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
            <Field label="Email (crée un compte)">
              <Input name="email" type="email" />
            </Field>
            <Field label="Mot de passe">
              <Input name="password" type="password" defaultValue="demo123" />
            </Field>
            <Field label="Téléphone">
              <Input name="phone" />
            </Field>
            <Field label="Enfant">
              <Select name="studentId" defaultValue="">
                <option value="">—</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {fullName(s.firstName, s.lastName)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Relation">
              <Input name="relation" defaultValue="parent" />
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
