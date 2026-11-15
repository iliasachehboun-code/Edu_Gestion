import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, fullName } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  PAID: "Payé",
  PARTIAL: "Partiel",
  OVERDUE: "En retard",
  PENDING: "En attente",
  PRESENT: "Présent",
  ABSENT: "Absent",
  LATE: "Retard",
  EXCUSED: "Excusé",
};

export type ExportKind = "students" | "fees" | "cash-journal" | "attendance";

export function isExportKind(value: string): value is ExportKind {
  return ["students", "fees", "cash-journal", "attendance"].includes(value);
}

export async function loadStudentsExport(
  schoolId: string,
  classId?: string
) {
  const students = await prisma.student.findMany({
    where: {
      schoolId,
      ...(classId ? { enrollments: { some: { classId } } } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      enrollments: {
        include: { class: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const headers = ["Nom", "Prénom", "Matricule", "Classe", "Naissance", "Genre"];
  const rows = students.map((s) => [
    s.lastName,
    s.firstName,
    s.matricule || "",
    s.enrollments[0]?.class.name || "",
    formatDate(s.dateOfBirth),
    s.gender || "",
  ]);

  return {
    title: "Liste des élèves",
    filename: "eleves",
    headers,
    rows,
  };
}

export async function loadFeesExport(
  schoolId: string,
  filters: { classId?: string; feeTypeId?: string; status?: string; q?: string }
) {
  const year = await prisma.academicYear.findFirst({
    where: { schoolId, isCurrent: true },
  });

  const fees = await prisma.studentFee.findMany({
    where: {
      schoolId,
      ...(filters.feeTypeId ? { feeTypeId: filters.feeTypeId } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.classId || filters.q
        ? {
            student: {
              ...(filters.classId
                ? { enrollments: { some: { classId: filters.classId } } }
                : {}),
              ...(filters.q
                ? {
                    OR: [
                      { firstName: { contains: filters.q } },
                      { lastName: { contains: filters.q } },
                    ],
                  }
                : {}),
            },
          }
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
  });

  const headers = [
    "Élève",
    "Classe",
    "Frais",
    "Montant",
    "Payé",
    "Reste",
    "Échéance",
    "Statut",
  ];
  const rows = fees.map((f) => {
    const paid = f.payments.reduce((sum, p) => sum + p.amount, 0);
    return [
      fullName(f.student.firstName, f.student.lastName),
      f.student.enrollments[0]?.class.name || "",
      f.feeType.name,
      formatMoney(f.amount),
      formatMoney(paid),
      formatMoney(f.amount - paid),
      formatDate(f.dueDate),
      STATUS_LABEL[f.status] || f.status,
    ];
  });

  return {
    title: "Liste des frais",
    filename: "frais",
    headers,
    rows,
  };
}

export async function loadCashJournalExport(
  schoolId: string,
  filters: { from?: string; to?: string; method?: string }
) {
  const from = filters.from ? new Date(filters.from) : undefined;
  const to = filters.to ? new Date(filters.to) : undefined;
  if (to) to.setHours(23, 59, 59, 999);

  const payments = await prisma.payment.findMany({
    where: {
      schoolId,
      ...(filters.method ? { method: filters.method } : {}),
      ...(from || to
        ? {
            paidAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      studentFee: {
        include: {
          student: true,
          feeType: true,
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  const methodLabel: Record<string, string> = {
    cash: "Espèces",
    transfer: "Virement",
    check: "Chèque",
    card: "Carte",
  };

  const headers = [
    "Date",
    "Élève",
    "Frais",
    "Montant",
    "Mode",
    "Note",
  ];
  const rows = payments.map((p) => [
    formatDate(p.paidAt),
    fullName(p.studentFee.student.firstName, p.studentFee.student.lastName),
    p.studentFee.feeType.name,
    formatMoney(p.amount),
    methodLabel[p.method] || p.method,
    p.note || "",
  ]);

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    title: "Journal de caisse",
    filename: "journal-caisse",
    headers,
    rows,
    summary: `Total encaissé : ${formatMoney(total)} (${payments.length} règlement${payments.length > 1 ? "s" : ""})`,
  };
}

export async function loadAttendanceExport(
  schoolId: string,
  filters: { classId?: string; date?: string }
) {
  const dateStr = filters.date || new Date().toISOString().slice(0, 10);
  const date = new Date(dateStr);
  date.setHours(12, 0, 0, 0);

  const records = await prisma.attendance.findMany({
    where: {
      schoolId,
      date,
      ...(filters.classId ? { classId: filters.classId } : {}),
    },
    include: {
      student: true,
      class: true,
    },
    orderBy: [
      { class: { name: "asc" } },
      { student: { lastName: "asc" } },
      { student: { firstName: "asc" } },
    ],
  });

  const headers = ["Date", "Classe", "Élève", "Statut", "Motif"];
  const rows = records.map((a) => [
    formatDate(a.date),
    a.class.name,
    fullName(a.student.firstName, a.student.lastName),
    STATUS_LABEL[a.status] || a.status,
    a.reason || "",
  ]);

  return {
    title: `Présences du ${formatDate(date)}`,
    filename: `presences-${dateStr}`,
    headers,
    rows,
  };
}
