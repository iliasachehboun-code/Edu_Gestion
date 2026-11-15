import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  SectionTitle,
  Select,
  Table,
  Td,
  Th,
  EmptyState,
} from "@/components/ui";
import { createStudentAction, deleteStudentAction } from "@/app/actions/people";
import { AutoFilterForm } from "@/components/auto-filter-form";
import { schoolTrail } from "@/components/breadcrumbs";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ExportMenu } from "@/components/export-menu";
import { GuidedEmpty } from "@/components/guided-empty";
import { PaginationBar } from "@/components/pagination-bar";
import { SortHeader } from "@/components/sort-header";
import {
  PAGE_SIZE,
  buildQuery,
  parsePage,
  parseSortDir,
} from "@/lib/list-query";
import { formatDate, fullName } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export default async function StudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{
    classId?: string;
    q?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const classId = sp.classId || "";
  const q = (sp.q || "").trim();
  const page = parsePage(sp.page);
  const sort = sp.sort || "name";
  const dir = parseSortDir(sp.dir);
  const basePath = `/s/${schoolId}/students`;
  const query = {
    classId: classId || undefined,
    q: q || undefined,
    sort,
    dir,
  };

  const where: Prisma.StudentWhereInput = {
    schoolId,
    ...(classId ? { enrollments: { some: { classId } } } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { matricule: { contains: q } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.StudentOrderByWithRelationInput[] =
    sort === "matricule"
      ? [{ matricule: dir }, { lastName: "asc" }]
      : sort === "birth"
        ? [{ dateOfBirth: dir }, { lastName: "asc" }]
        : [{ lastName: dir }, { firstName: dir }];

  const [total, students, classes, year] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        enrollments: {
          include: { class: true, academicYear: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } }),
  ]);

  const selectedClass = classId
    ? classes.find((c) => c.id === classId)
    : undefined;
  const exportQs = buildQuery({}, { classId: classId || undefined });

  return (
    <div>
      <PageHeader
        title="Étudiants"
        description="Dossiers des étudiants de l'établissement."
        breadcrumbs={schoolTrail(
          schoolId,
          { label: "Étudiants", path: "/students" },
          selectedClass?.name
        )}
        actions={
          <ExportMenu
            csvHref={`/s/${schoolId}/export/students${exportQs}`}
            pdfHref={`/s/${schoolId}/export/students/print${exportQs}`}
          />
        }
      />

      {!year ? (
        <div className="mb-6">
          <GuidedEmpty
            message="Aucune année scolaire courante. Créez-en une pour inscrire les élèves dans une classe."
            actionHref={`/s/${schoolId}/years`}
            actionLabel="Configurer l'année"
          />
        </div>
      ) : null}

      {!year && classes.length === 0 ? null : classes.length === 0 ? (
        <div className="mb-6">
          <GuidedEmpty
            message="Aucune classe n'est encore créée. Ajoutez une classe pour filtrer et inscrire les élèves."
            actionHref={`/s/${schoolId}/classes`}
            actionLabel="Créer une classe"
          />
        </div>
      ) : null}

      <Card className="mb-6">
        <AutoFilterForm className="grid gap-3 sm:grid-cols-2">
          <Field label="Recherche">
            <Input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Nom, prénom ou matricule"
            />
          </Field>
          <Field label="Classe">
            <Select name="classId" defaultValue={classId}>
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
        </AutoFilterForm>
      </Card>
      <p className="mb-3 text-sm text-muted">
        {total} étudiant{total > 1 ? "s" : ""}
        {q || classId ? " pour ce filtre" : ""}
      </p>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr] xl:gap-8">
        <div className="min-w-0">
          {students.length === 0 ? (
            <EmptyState message="Aucun élève pour ce filtre." />
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <SortHeader
                      label="Élève"
                      column="name"
                      sort={sort}
                      dir={dir}
                      basePath={basePath}
                      query={query}
                    />
                    <SortHeader
                      label="Matricule"
                      column="matricule"
                      sort={sort}
                      dir={dir}
                      basePath={basePath}
                      query={query}
                    />
                    <Th>Classe</Th>
                    <SortHeader
                      label="Naissance"
                      column="birth"
                      sort={sort}
                      dir={dir}
                      basePath={basePath}
                      query={query}
                    />
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-brand-soft/40">
                      <Td className="font-medium">
                        {fullName(s.firstName, s.lastName)}
                      </Td>
                      <Td>{s.matricule || "—"}</Td>
                      <Td>{s.enrollments[0]?.class.name || "—"}</Td>
                      <Td>{formatDate(s.dateOfBirth)}</Td>
                      <Td>
                        <form
                          action={async () => {
                            "use server";
                            await deleteStudentAction(schoolId, s.id);
                          }}
                        >
                          <ConfirmSubmit message={`Supprimer ${fullName(s.firstName, s.lastName)} ?`}>
                            Supprimer
                          </ConfirmSubmit>
                        </form>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <PaginationBar
                total={total}
                page={page}
                basePath={basePath}
                query={query}
              />
            </>
          )}
        </div>
        <Card>
          <SectionTitle>Nouvel élève</SectionTitle>
          <form
            action={createStudentAction.bind(null, schoolId)}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Prénom">
                <Input name="firstName" required />
              </Field>
              <Field label="Nom">
                <Input name="lastName" required />
              </Field>
            </div>
            <Field label="Matricule">
              <Input name="matricule" />
            </Field>
            <Field label="Date de naissance">
              <Input name="dateOfBirth" type="date" />
            </Field>
            <Field label="Genre">
              <Select name="gender" defaultValue="">
                <option value="">—</option>
                <option value="M">Garçon</option>
                <option value="F">Fille</option>
              </Select>
            </Field>
            {year ? (
              <>
                <input type="hidden" name="academicYearId" value={year.id} />
                <Field label="Classe">
                  <Select name="classId" defaultValue="">
                    <option value="">Non inscrit</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}
            <Button type="submit" className="w-full">
              Ajouter
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
