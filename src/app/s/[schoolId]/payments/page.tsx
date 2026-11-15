import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
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
import {
  assignFeeAction,
  createFeeTypeAction,
  recordPaymentAction,
} from "@/app/actions/payments";
import { AutoFilterForm } from "@/components/auto-filter-form";
import { schoolTrail } from "@/components/breadcrumbs";
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
import { cn, formatDate, formatMoney, fullName } from "@/lib/utils";
import type { FeeStatus, Prisma } from "@prisma/client";

const STATUS_LABEL: Record<string, string> = {
  PAID: "Payé",
  PARTIAL: "Partiel",
  OVERDUE: "En retard",
  PENDING: "En attente",
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Espèces",
  transfer: "Virement",
  check: "Chèque",
  card: "Carte",
};

function feeTone(status: string) {
  if (status === "PAID") return "success" as const;
  if (status === "OVERDUE") return "danger" as const;
  if (status === "PARTIAL") return "warning" as const;
  return "neutral" as const;
}

const TABS = [
  { id: "liste", label: "Liste des frais" },
  { id: "caisse", label: "Journal de caisse" },
  { id: "types", label: "Types de frais" },
  { id: "assigner", label: "Assigner" },
  { id: "payer", label: "Encaisser" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{
    classId?: string;
    feeTypeId?: string;
    status?: string;
    q?: string;
    page?: string;
    sort?: string;
    dir?: string;
    tab?: string;
    from?: string;
    to?: string;
    method?: string;
  }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const classId = sp.classId || "";
  const feeTypeId = sp.feeTypeId || "";
  const status = (sp.status || "") as FeeStatus | "";
  const q = (sp.q || "").trim();
  const page = parsePage(sp.page);
  const sort = sp.sort || "name";
  const dir = parseSortDir(sp.dir);
  const from = sp.from || "";
  const to = sp.to || "";
  const method = sp.method || "";
  const tab = (TABS.some((t) => t.id === sp.tab) ? sp.tab : "liste") as TabId;
  const basePath = `/s/${schoolId}/payments`;
  const query = {
    classId: classId || undefined,
    feeTypeId: feeTypeId || undefined,
    status: status || undefined,
    q: q || undefined,
    sort,
    dir,
    tab,
    from: from || undefined,
    to: to || undefined,
    method: method || undefined,
  };

  const [feeTypes, classes, year] = await Promise.all([
    prisma.feeType.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } }),
  ]);

  const feeWhere: Prisma.StudentFeeWhereInput = {
    schoolId,
    ...(feeTypeId ? { feeTypeId } : {}),
    ...(status ? { status } : {}),
    ...(classId || q
      ? {
          student: {
            ...(classId ? { enrollments: { some: { classId } } } : {}),
            ...(q
              ? {
                  OR: [
                    { firstName: { contains: q } },
                    { lastName: { contains: q } },
                  ],
                }
              : {}),
          },
        }
      : {}),
  };

  const orderBy: Prisma.StudentFeeOrderByWithRelationInput[] =
    sort === "amount"
      ? [{ amount: dir }]
      : sort === "due"
        ? [{ dueDate: dir }]
        : sort === "status"
          ? [{ status: dir }]
          : sort === "fee"
            ? [{ feeType: { name: dir } }]
            : [{ student: { lastName: dir } }, { student: { firstName: dir } }];

  const cashFrom = from ? new Date(from) : undefined;
  const cashTo = to ? new Date(to) : undefined;
  if (cashTo) cashTo.setHours(23, 59, 59, 999);

  const [students, total, fees, unpaidFees, cashPayments, selectedClass] =
    await Promise.all([
      prisma.student.findMany({
        where: {
          schoolId,
          active: true,
          ...(classId ? { enrollments: { some: { classId } } } : {}),
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.studentFee.count({ where: feeWhere }),
      prisma.studentFee.findMany({
        where: feeWhere,
        include: {
          student: {
            include: {
              enrollments: {
                where: year ? { academicYearId: year.id } : undefined,
                include: { class: true },
                take: 1,
              },
            },
          },
          feeType: true,
          payments: true,
        },
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.studentFee.findMany({
        where: {
          schoolId,
          status: { not: "PAID" },
        },
        include: {
          student: true,
          feeType: true,
          payments: true,
        },
        orderBy: [{ student: { lastName: "asc" } }, { feeType: { name: "asc" } }],
        take: 200,
      }),
      tab === "caisse"
        ? prisma.payment.findMany({
            where: {
              schoolId,
              ...(method ? { method } : {}),
              ...(cashFrom || cashTo
                ? {
                    paidAt: {
                      ...(cashFrom ? { gte: cashFrom } : {}),
                      ...(cashTo ? { lte: cashTo } : {}),
                    },
                  }
                : {}),
            },
            include: {
              studentFee: {
                include: { student: true, feeType: true },
              },
            },
            orderBy: { paidAt: "desc" },
            take: 300,
          })
        : Promise.resolve([]),
      classId
        ? prisma.class.findFirst({ where: { id: classId, schoolId } })
        : Promise.resolve(null),
    ]);

  const cashTotal = cashPayments.reduce((sum, p) => sum + p.amount, 0);
  const exportFeesQs = buildQuery(
    {},
    {
      classId: classId || undefined,
      feeTypeId: feeTypeId || undefined,
      status: status || undefined,
      q: q || undefined,
    }
  );
  const exportCashQs = buildQuery(
    {},
    {
      from: from || undefined,
      to: to || undefined,
      method: method || undefined,
    }
  );

  return (
    <div>
      <PageHeader
        title="Finances et paiements"
        description="Frais scolaires, échéances et encaissements."
        breadcrumbs={schoolTrail(
          schoolId,
          { label: "Finances", path: "/payments" },
          tab === "caisse"
            ? "Journal de caisse"
            : selectedClass?.name
        )}
        actions={
          tab === "liste" ? (
            <ExportMenu
              label="Liste"
              csvHref={`/s/${schoolId}/export/fees${exportFeesQs}`}
              pdfHref={`/s/${schoolId}/export/fees/print${exportFeesQs}`}
            />
          ) : tab === "caisse" ? (
            <ExportMenu
              label="Caisse"
              csvHref={`/s/${schoolId}/export/cash-journal${exportCashQs}`}
              pdfHref={`/s/${schoolId}/export/cash-journal/print${exportCashQs}`}
            />
          ) : undefined
        }
      />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={`${basePath}${buildQuery(query, { tab: item.id, page: 1 })}`}
            className={cn(
              "shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
              tab === item.id
                ? "bg-brand text-white"
                : "border border-line bg-surface text-brand hover:bg-brand-soft"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "liste" ? (
        <>
          <Card className="mb-6">
            <AutoFilterForm className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <input type="hidden" name="tab" value="liste" />
              <Field label="Recherche">
                <Input
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Nom de l'élève"
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
              <Field label="Catégorie">
                <Select name="feeTypeId" defaultValue={feeTypeId}>
                  <option value="">Toutes les catégories</option>
                  {feeTypes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Statut">
                <Select name="status" defaultValue={status}>
                  <option value="">Tous les statuts</option>
                  <option value="PENDING">En attente</option>
                  <option value="PARTIAL">Partiel</option>
                  <option value="PAID">Payé</option>
                  <option value="OVERDUE">En retard</option>
                </Select>
              </Field>
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="dir" value={dir} />
            </AutoFilterForm>
          </Card>

          <p className="mb-3 text-sm text-muted">
            {total} {total > 1 ? "lignes" : "ligne"}
            {classId || feeTypeId || status || q ? " pour ce filtre" : ""}
          </p>
          {fees.length === 0 ? (
            feeTypes.length === 0 ? (
              <GuidedEmpty
                message="Aucun type de frais. Créez-en un pour commencer le suivi financier."
                actionHref={`${basePath}${buildQuery(query, { tab: "types" })}`}
                actionLabel="Créer un type de frais"
              />
            ) : (
              <EmptyState message="Aucun frais pour ce filtre." />
            )
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
                    <Th>Classe</Th>
                    <SortHeader
                      label="Frais"
                      column="fee"
                      sort={sort}
                      dir={dir}
                      basePath={basePath}
                      query={query}
                    />
                    <SortHeader
                      label="Montant"
                      column="amount"
                      sort={sort}
                      dir={dir}
                      basePath={basePath}
                      query={query}
                    />
                    <Th>Payé</Th>
                    <SortHeader
                      label="Échéance"
                      column="due"
                      sort={sort}
                      dir={dir}
                      basePath={basePath}
                      query={query}
                    />
                    <SortHeader
                      label="Statut"
                      column="status"
                      sort={sort}
                      dir={dir}
                      basePath={basePath}
                      query={query}
                    />
                  </tr>
                </thead>
                <tbody>
                  {fees.map((f) => {
                    const paid = f.payments.reduce((s, p) => s + p.amount, 0);
                    return (
                      <tr key={f.id} className="hover:bg-brand-soft/40">
                        <Td>
                          {fullName(f.student.firstName, f.student.lastName)}
                        </Td>
                        <Td>{f.student.enrollments[0]?.class.name || "—"}</Td>
                        <Td>{f.feeType.name}</Td>
                        <Td>{formatMoney(f.amount)}</Td>
                        <Td>{formatMoney(paid)}</Td>
                        <Td>{formatDate(f.dueDate)}</Td>
                        <Td>
                          <Badge tone={feeTone(f.status)}>
                            {STATUS_LABEL[f.status] || f.status}
                          </Badge>
                        </Td>
                      </tr>
                    );
                  })}
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
        </>
      ) : null}

      {tab === "caisse" ? (
        <>
          <Card className="mb-6">
            <AutoFilterForm className="grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="tab" value="caisse" />
              <Field label="Du">
                <Input name="from" type="date" defaultValue={from} />
              </Field>
              <Field label="Au">
                <Input name="to" type="date" defaultValue={to} />
              </Field>
              <Field label="Mode">
                <Select name="method" defaultValue={method}>
                  <option value="">Tous les modes</option>
                  <option value="cash">Espèces</option>
                  <option value="transfer">Virement</option>
                  <option value="check">Chèque</option>
                  <option value="card">Carte</option>
                </Select>
              </Field>
            </AutoFilterForm>
          </Card>
          <p className="mb-3 text-sm text-muted">
            {cashPayments.length} règlement{cashPayments.length > 1 ? "s" : ""} ·
            total {formatMoney(cashTotal)}
          </p>
          {cashPayments.length === 0 ? (
            <EmptyState message="Aucun encaissement pour cette période." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Élève</Th>
                  <Th>Frais</Th>
                  <Th>Montant</Th>
                  <Th>Mode</Th>
                  <Th>Note</Th>
                </tr>
              </thead>
              <tbody>
                {cashPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-soft/40">
                    <Td>{formatDate(p.paidAt)}</Td>
                    <Td>
                      {fullName(
                        p.studentFee.student.firstName,
                        p.studentFee.student.lastName
                      )}
                    </Td>
                    <Td>{p.studentFee.feeType.name}</Td>
                    <Td className="font-medium">{formatMoney(p.amount)}</Td>
                    <Td>{METHOD_LABEL[p.method] || p.method}</Td>
                    <Td>{p.note || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      ) : null}

      {tab === "types" ? (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <SectionTitle>Nouveau type de frais</SectionTitle>
            <form
              action={createFeeTypeAction.bind(null, schoolId)}
              className="space-y-3"
            >
              <Field label="Nom">
                <Input name="name" required placeholder="Cantine" />
              </Field>
              <Field label="Montant">
                <Input name="amount" type="number" step="0.01" required />
              </Field>
              <Field label="Description">
                <Input name="description" />
              </Field>
              <Button type="submit" className="w-full">
                Créer
              </Button>
            </form>
          </Card>
          <Card>
            <SectionTitle>Types existants</SectionTitle>
            {feeTypes.length === 0 ? (
              <EmptyState message="Aucun type de frais." />
            ) : (
              <ul className="space-y-2 text-sm">
                {feeTypes.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-brand-soft/70 px-3 py-2"
                  >
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {f.name}
                    </span>
                    <span className="shrink-0 text-muted">
                      {formatMoney(f.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "assigner" ? (
        <Card className="max-w-xl">
          <SectionTitle>Assigner un frais</SectionTitle>
          {!year ? (
            <GuidedEmpty
              message="Aucune année scolaire courante. Configurez-en une avant d'assigner des frais."
              actionHref={`/s/${schoolId}/years`}
              actionLabel="Configurer l'année"
            />
          ) : feeTypes.length === 0 ? (
            <GuidedEmpty
              message="Créez d'abord un type de frais."
              actionHref={`${basePath}${buildQuery(query, { tab: "types" })}`}
              actionLabel="Créer un type"
            />
          ) : students.length === 0 ? (
            <GuidedEmpty
              message="Aucun élève actif. Ajoutez des élèves pour leur assigner des frais."
              actionHref={`/s/${schoolId}/students`}
              actionLabel="Voir les élèves"
            />
          ) : (
            <form
              action={assignFeeAction.bind(null, schoolId)}
              className="space-y-3"
            >
              <input type="hidden" name="academicYearId" value={year.id} />
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
                <Select name="feeTypeId" required>
                  {feeTypes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({formatMoney(f.amount)})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Montant (optionnel)">
                <Input name="amount" type="number" step="0.01" />
              </Field>
              <Field label="Échéance">
                <Input name="dueDate" type="date" />
              </Field>
              <Button type="submit" className="w-full">
                Assigner
              </Button>
            </form>
          )}
        </Card>
      ) : null}

      {tab === "payer" ? (
        <Card className="max-w-xl">
          <SectionTitle>Enregistrer un paiement</SectionTitle>
          {unpaidFees.length === 0 ? (
            <GuidedEmpty
              message="Aucun frais en attente. Assignez d'abord un frais à un élève."
              actionHref={`${basePath}${buildQuery(query, { tab: "assigner" })}`}
              actionLabel="Assigner un frais"
            />
          ) : (
            <form
              action={recordPaymentAction.bind(null, schoolId)}
              className="space-y-3"
            >
              <Field label="Frais">
                <Select name="studentFeeId" required>
                  {unpaidFees.map((f) => {
                    const paid = f.payments.reduce((s, p) => s + p.amount, 0);
                    return (
                      <option key={f.id} value={f.id}>
                        {fullName(f.student.firstName, f.student.lastName)} —{" "}
                        {f.feeType.name} (reste {formatMoney(f.amount - paid)})
                      </option>
                    );
                  })}
                </Select>
              </Field>
              <Field label="Montant">
                <Input name="amount" type="number" step="0.01" required />
              </Field>
              <Field label="Mode">
                <Select name="method" defaultValue="cash">
                  <option value="cash">Espèces</option>
                  <option value="transfer">Virement</option>
                  <option value="check">Chèque</option>
                  <option value="card">Carte</option>
                </Select>
              </Field>
              <Field label="Note">
                <Input name="note" />
              </Field>
              <Button type="submit" className="w-full">
                Enregistrer
              </Button>
            </form>
          )}
        </Card>
      ) : null}
    </div>
  );
}
