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
  assignTeacherAction,
  createTeacherAction,
  deleteTeacherAction,
  removeAssignmentAction,
} from "@/app/actions/people";
import { schoolTrail } from "@/components/breadcrumbs";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { fullName } from "@/lib/utils";

export default async function TeachersPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const [teachers, classes, subjects, assignments] = await Promise.all([
    prisma.teacher.findMany({
      where: { schoolId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.teacherAssignment.findMany({
      where: { schoolId },
      include: { teacher: true, class: true, subject: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Enseignants et personnel"
        description="Profils, comptes et affectations classe / matière."
        breadcrumbs={schoolTrail(schoolId, {
          label: "Enseignants",
          path: "/teachers",
        })}
      />
      <div className="grid gap-8 xl:grid-cols-2">
        <div className="space-y-6">
          {teachers.length === 0 ? (
            <EmptyState message="Aucun enseignant." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Enseignant</Th>
                  <Th>Spécialité</Th>
                  <Th>Email</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id}>
                    <Td className="font-medium">
                      {fullName(t.firstName, t.lastName)}
                      {t.userId ? (
                        <Badge tone="info">Compte</Badge>
                      ) : null}
                    </Td>
                    <Td>{t.specialty || "—"}</Td>
                    <Td>{t.email || "—"}</Td>
                    <Td>
                      <form
                        action={async () => {
                          "use server";
                          await deleteTeacherAction(schoolId, t.id);
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

          <Card>
            <h2 className="mb-4 text-lg font-semibold">Affectations</h2>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted">Aucune affectation.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {assignments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-brand-soft px-3 py-2"
                  >
                    <span>
                      {fullName(a.teacher.firstName, a.teacher.lastName)} —{" "}
                      {a.subject.name} / {a.class.name}
                    </span>
                    <form
                      action={async () => {
                        "use server";
                        await removeAssignmentAction(schoolId, a.id);
                      }}
                    >
                      <ConfirmSubmit
                        message="Retirer cette affectation ?"
                        className="text-lg leading-none"
                      >
                        ×
                      </ConfirmSubmit>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form
              action={assignTeacherAction.bind(null, schoolId)}
              className="mt-4 space-y-3"
            >
              <Field label="Enseignant">
                <Select name="teacherId" required>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {fullName(t.firstName, t.lastName)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Classe">
                <Select name="classId" required>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Matière">
                <Select name="subjectId" required>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit">Affecter</Button>
            </form>
          </Card>
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nouvel enseignant</h2>
          <form
            action={createTeacherAction.bind(null, schoolId)}
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
            <Field label="Mot de passe compte">
              <Input name="password" type="password" defaultValue="demo123" />
            </Field>
            <Field label="Téléphone">
              <Input name="phone" />
            </Field>
            <Field label="Spécialité">
              <Input name="specialty" />
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
