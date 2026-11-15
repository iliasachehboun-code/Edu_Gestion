"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth";
import { notifyParentsOfStudent } from "@/lib/notifications";
import { redirectWithNotice } from "@/lib/flash";
import { formatMoney, fullName } from "@/lib/utils";

async function refreshFeeStatus(studentFeeId: string) {
  const fee = await prisma.studentFee.findUnique({
    where: { id: studentFeeId },
    include: { payments: true },
  });
  if (!fee) return;

  const paid = fee.payments.reduce((sum, p) => sum + p.amount, 0);
  let status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" = "PENDING";
  if (paid <= 0) {
    status =
      fee.dueDate && fee.dueDate < new Date() ? "OVERDUE" : "PENDING";
  } else if (paid >= fee.amount) {
    status = "PAID";
  } else {
    status =
      fee.dueDate && fee.dueDate < new Date() ? "OVERDUE" : "PARTIAL";
  }

  await prisma.studentFee.update({
    where: { id: studentFeeId },
    data: { status },
  });
}

export async function createFeeTypeAction(
  schoolId: string,
  formData: FormData
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const name = String(formData.get("name") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const description = String(formData.get("description") || "").trim();
  if (!name || !amount) return;

  try {
    await prisma.feeType.create({
      data: {
        schoolId,
        name,
        amount,
        description: description || null,
      },
    });
  } catch {
    return;
  }
  revalidatePath(`/s/${schoolId}/payments`);
  redirectWithNotice(
    `/s/${schoolId}/payments?tab=types`,
    "Type de frais créé."
  );
}

export async function assignFeeAction(schoolId: string, formData: FormData) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const studentId = String(formData.get("studentId") || "");
  const feeTypeId = String(formData.get("feeTypeId") || "");
  const academicYearId = String(formData.get("academicYearId") || "");
  const dueDate = String(formData.get("dueDate") || "");
  const amountOverride = formData.get("amount");

  if (!studentId || !feeTypeId || !academicYearId) return;

  const feeType = await prisma.feeType.findUnique({ where: { id: feeTypeId } });
  if (!feeType) return;

  const amount =
    amountOverride && String(amountOverride).trim()
      ? Number(amountOverride)
      : feeType.amount;

  await prisma.studentFee.create({
    data: {
      schoolId,
      studentId,
      feeTypeId,
      academicYearId,
      amount,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  await notifyParentsOfStudent({
    schoolId,
    studentId,
    type: "PAYMENT",
    title: "Nouveau frais scolaire",
    message: `${feeType.name} : ${amount.toFixed(2)} €`,
    link: `/s/${schoolId}/parent`,
  });

  revalidatePath(`/s/${schoolId}/payments`);
  revalidatePath(`/s/${schoolId}/parent`);
  redirectWithNotice(
    `/s/${schoolId}/payments?tab=assigner`,
    "Frais assigné à l'élève."
  );
}

export async function recordPaymentAction(
  schoolId: string,
  formData: FormData
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const studentFeeId = String(formData.get("studentFeeId") || "");
  const amount = Number(formData.get("amount") || 0);
  const method = String(formData.get("method") || "cash");
  const note = String(formData.get("note") || "").trim();

  if (!studentFeeId || !amount || amount <= 0) return;

  const fee = await prisma.studentFee.findUnique({
    where: { id: studentFeeId },
  });
  if (!fee) return;

  await prisma.payment.create({
    data: {
      schoolId,
      studentFeeId,
      amount,
      method,
      note: note || null,
    },
  });

  await refreshFeeStatus(studentFeeId);

  await notifyParentsOfStudent({
    schoolId,
    studentId: fee.studentId,
    type: "PAYMENT",
    title: "Paiement enregistré",
    message: `Paiement de ${amount.toFixed(2)} € enregistré.`,
    link: `/s/${schoolId}/parent`,
  });

  revalidatePath(`/s/${schoolId}/payments`);
  revalidatePath(`/s/${schoolId}/parent`);
  redirectWithNotice(
    `/s/${schoolId}/payments?tab=payer`,
    "Paiement enregistré."
  );
}

export async function notifyFeeReminderAction(
  schoolId: string,
  studentFeeId: string
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const fee = await prisma.studentFee.findFirst({
    where: {
      id: studentFeeId,
      schoolId,
      status: { in: ["PENDING", "OVERDUE"] },
    },
    include: {
      student: true,
      feeType: true,
      payments: true,
    },
  });
  if (!fee) return;

  const paid = fee.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, fee.amount - paid);
  const statusLabel = fee.status === "OVERDUE" ? "en retard" : "en attente";

  await notifyParentsOfStudent({
    schoolId,
    studentId: fee.studentId,
    type: "PAYMENT",
    title:
      fee.status === "OVERDUE"
        ? "Rappel — paiement en retard"
        : "Rappel — paiement en attente",
    message: `Frais « ${fee.feeType.name} » pour ${fullName(
      fee.student.firstName,
      fee.student.lastName
    )} : ${statusLabel}. Reste à régler ${formatMoney(remaining)}.`,
    link: `/s/${schoolId}/parent/payments`,
  });

  revalidatePath(`/s/${schoolId}/payments`);
  revalidatePath(`/s/${schoolId}/parent`);
  redirectWithNotice(
    `/s/${schoolId}/payments?tab=alertes`,
    "Parent(s) notifié(s) pour ce frais."
  );
}

export async function notifyAllPendingOverdueAction(schoolId: string) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const fees = await prisma.studentFee.findMany({
    where: {
      schoolId,
      status: { in: ["PENDING", "OVERDUE"] },
    },
    include: {
      student: true,
      feeType: true,
      payments: true,
    },
  });

  let count = 0;
  for (const fee of fees) {
    const paid = fee.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, fee.amount - paid);
    const statusLabel = fee.status === "OVERDUE" ? "en retard" : "en attente";

    await notifyParentsOfStudent({
      schoolId,
      studentId: fee.studentId,
      type: "PAYMENT",
      title:
        fee.status === "OVERDUE"
          ? "Rappel — paiement en retard"
          : "Rappel — paiement en attente",
      message: `Frais « ${fee.feeType.name} » pour ${fullName(
        fee.student.firstName,
        fee.student.lastName
      )} : ${statusLabel}. Reste à régler ${formatMoney(remaining)}.`,
      link: `/s/${schoolId}/parent/payments`,
    });
    count += 1;
  }

  revalidatePath(`/s/${schoolId}/payments`);
  revalidatePath(`/s/${schoolId}/parent`);
  redirectWithNotice(
    `/s/${schoolId}/payments?tab=alertes`,
    count
      ? `${count} rappel(s) envoyé(s) aux parents.`
      : "Aucun frais en attente ou en retard."
  );
}
