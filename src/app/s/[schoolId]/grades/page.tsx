import Link from "next/link";
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
} from "@/components/ui";
import { createGradeAction, deleteGradeAction } from "@/app/actions/grades";
import { AutoFilterForm } from "@/components/auto-filter-form";
import { schoolTrail } from "@/components/breadcrumbs";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { GuidedEmpty } from "@/components/guided-empty";
import { fullName } from "@/lib/utils";

export default async function GradesPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ classId?: string; subjectId?: string; termId?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  const { user, role } = await requireSchoolAccess(schoolId, [
    "SCHOOL_ADMIN",
    "TEACHER",
  ]);

  const year = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
    include: { terms: { orderBy: { order: "asc" } } },
  });

  let teacherFilter: string | undefined;
  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findFirst({
      where: { schoolId, userId: user.id },
    });
    teacherFilter = teacher?.id;
  }

  const assignments = teacherFilter
    ? await prisma.teacherAssignment.findMany({
        where: { schoolId, teacherId: teacherFilter },
        include: { class: true, subject: true },
      })
    : [];

  const classes = teacherFilter
    ? Array.from(
        new Map(assignments.map((a) => [a.classId, a.class])).values()
      )
    : await prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } });

  const subjects = teacherFilter
    ? Array.from(
        new Map(assignments.map((a) => [a.subjectId, a.subject])).values()
      )
    : await prisma.subject.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
      });

  const classId = sp.classId || classes[0]?.id;
  const subjectId = sp.subjectId || subjects[0]?.id;
  const termId = sp.termId || year?.terms[0]?.id;

  const students = classId && year
    ? await prisma.student.findMany({
        where: {
          schoolId,
          enrollments: { some: { classId, academicYearId: year.id } },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      })
    : [];

  const grades =
    classId && subjectId && termId
      ? await prisma.grade.findMany({
          where: {
            schoolId,
            subjectId,
            termId,
            studentId: { in: students.map((s) => s.id) },
          },
          include: { student: true },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const selectedClass = classes.find((c) => c.id === classId);

  return (
    <div>
      <PageHeader
        title="Examens et notes"
        description="Contrôles et examens sur 20, par matière et trimestre."
        breadcrumbs={schoolTrail(
          schoolId,
          { label: "Notes", path: "/grades" },
          selectedClass?.name
        )}
        actions={
          <Link
            href={`/s/${schoolId}/bulletins`}
            className="text-sm font-medium text-brand hover:underline"
          >
            Bulletins
          </Link>
        }
      />

      {!year ? (
        <div className="mb-6">
          <GuidedEmpty
            message="Aucune année scolaire courante. Configurez l'année et ses trimestres pour saisir des notes."
            actionHref={`/s/${schoolId}/years`}
            actionLabel="Configurer l'année"
          />
        </div>
      ) : classes.length === 0 ? (
        <div className="mb-6">
          <GuidedEmpty
            message="Aucune classe disponible."
            actionHref={`/s/${schoolId}/classes`}
            actionLabel="Créer une classe"
          />
        </div>
      ) : (
        <Card className="mb-6">
          <AutoFilterForm className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Classe">
              <Select name="classId" defaultValue={classId}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Matière">
              <Select name="subjectId" defaultValue={subjectId}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Trimestre">
              <Select name="termId" defaultValue={termId}>
                {(year?.terms || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          </AutoFilterForm>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:gap-8">
        <div className="min-w-0">
          {grades.length === 0 ? (
            <EmptyState message="Aucune note pour ce filtre." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Élève</Th>
                  <Th>Type</Th>
                  <Th>Titre</Th>
                  <Th>Note</Th>
                  <Th>Coef</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g.id}>
                    <Td>
                      {fullName(g.student.firstName, g.student.lastName)}
                    </Td>
                    <Td>{g.type}</Td>
                    <Td>{g.title || "—"}</Td>
                    <Td className="font-medium">
                      {g.score}/{g.maxScore}
                    </Td>
                    <Td>{g.coefficient}</Td>
                    <Td>
                      <form
                        action={async () => {
                          "use server";
                          await deleteGradeAction(schoolId, g.id);
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
          <h2 className="mb-4 text-lg font-semibold">Ajouter une note</h2>
          {!classId || !subjectId || !termId ? (
            <p className="text-sm text-muted">
              Configurez classes, matières et trimestres d&apos;abord.
            </p>
          ) : students.length === 0 ? (
            <GuidedEmpty
              message="Aucun élève dans cette classe pour l'année courante."
              actionHref={`/s/${schoolId}/students`}
              actionLabel="Gérer les élèves"
            />
          ) : (
            <form
              action={createGradeAction.bind(null, schoolId)}
              className="space-y-3"
            >
              <input type="hidden" name="subjectId" value={subjectId} />
              <input type="hidden" name="termId" value={termId} />
              <Field label="Élève">
                <Select name="studentId" required>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {fullName(s.firstName, s.lastName)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Type">
                <Select name="type" defaultValue="CONTROLE">
                  <option value="CONTROLE">Contrôle</option>
                  <option value="DEVOIR">Devoir</option>
                  <option value="EXAMEN">Examen</option>
                  <option value="AUTRE">Autre</option>
                </Select>
              </Field>
              <Field label="Titre">
                <Input name="title" placeholder="Contrôle chap. 3" />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Note">
                  <Input name="score" type="number" step="0.25" required />
                </Field>
                <Field label="Sur">
                  <Input name="maxScore" type="number" defaultValue={20} />
                </Field>
                <Field label="Coef">
                  <Input name="coefficient" type="number" step="0.5" defaultValue={1} />
                </Field>
              </div>
              <Button type="submit" className="w-full">
                Enregistrer
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
