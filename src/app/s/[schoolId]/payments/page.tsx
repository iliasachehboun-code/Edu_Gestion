import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
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
import {
  assignFeeAction,
  createFeeTypeAction,
  recordPaymentAction,
} from "@/app/actions/payments";
import { formatDate, formatMoney, fullName } from "@/lib/utils";
import type { FeeStatus } from "@prisma/client";

const STATUS_LABEL: Record<string, string> = {
  PAID: "Payé",
  PARTIAL: "Partiel",
  OVERDUE: "En retard",
  PENDING: "En attente",
};

function feeTone(status: string) {
  if (status === "PAID") return "success" as const;
  if (status === "OVERDUE") return "danger" as const;
  if (status === "PARTIAL") return "warning" as const;
  return "neutral" as const;
}

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ classId?: string; feeTypeId?: string; status?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const classId = sp.classId || "";
  const feeTypeId = sp.feeTypeId || "";
  const status = (sp.status || "") as FeeStatus | "";

  const [feeTypes, classes, year] = await Promise.all([
    prisma.feeType.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.class.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } }),
  ]);

  const [students, fees] = await Promise.all([
    prisma.student.findMany({
      where: {
        schoolId,
        active: true,
        ...(classId ? { enrollments: { some: { classId } } } : {}),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.studentFee.findMany({
      where: {
        schoolId,
        ...(feeTypeId ? { feeTypeId } : {}),
        ...(status ? { status } : {}),
        ...(classId
          ? { student: { enrollments: { some: { classId } } } }
          : {}),
      },
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
      orderBy: [{ student: { lastName: "asc" } }, { feeType: { name: "asc" } }],
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Finances et paiements"
        description="Frais scolaires, échéances et encaissements."
      />

      <Card className="mb-6">
        <form method="get" className="grid gap-3 md:grid-cols-4">
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
          <div className="flex items-end">
            <Button type="submit" variant="secondary" className="w-full">
              Filtrer
            </Button>
          </div>
        </form>
      </Card>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 font-semibold">Type de frais</h2>
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
          {feeTypes.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-[#3d5278]">
              {feeTypes.map((f) => (
                <li key={f.id}>
                  {f.name} — {formatMoney(f.amount)}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Assigner un frais</h2>
          {!year ? (
            <p className="text-sm text-[#3d5278]">Aucune année courante.</p>
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

        <Card>
          <h2 className="mb-4 font-semibold">Enregistrer un paiement</h2>
          <form
            action={recordPaymentAction.bind(null, schoolId)}
            className="space-y-3"
          >
            <Field label="Frais">
              <Select name="studentFeeId" required>
                {fees
                  .filter((f) => f.status !== "PAID")
                  .map((f) => {
                    const paid = f.payments.reduce((s, p) => s + p.amount, 0);
                    return (
                      <option key={f.id} value={f.id}>
                        {fullName(f.student.firstName, f.student.lastName)} —{" "}
                        {f.feeType.name} (reste{" "}
                        {formatMoney(f.amount - paid)})
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
        </Card>
      </div>

      <p className="mb-3 text-sm text-[#3d5278]">
        {fees.length} {fees.length > 1 ? "lignes" : "ligne"}
        {classId || feeTypeId || status ? " pour ce filtre" : ""}
      </p>
      {fees.length === 0 ? (
        <EmptyState message="Aucun frais pour ce filtre." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Élève</Th>
              <Th>Classe</Th>
              <Th>Frais</Th>
              <Th>Montant</Th>
              <Th>Payé</Th>
              <Th>Échéance</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody>
            {fees.map((f) => {
              const paid = f.payments.reduce((s, p) => s + p.amount, 0);
              return (
                <tr key={f.id}>
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
      )}
    </div>
  );
}
