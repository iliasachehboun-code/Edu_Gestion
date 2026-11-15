"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { logAuditEvent } from "@/lib/audit";
import { fullName } from "@/lib/utils";

export async function createAdministrativeRequestAction(
  schoolId: string,
  formData: FormData
) {
  const { user } = await requireSchoolAccess(schoolId, [
    "STUDENT",
    "SCHOOL_ADMIN",
  ]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) {
    return { success: false, error: "Dossier élève introuvable" };
  }

  const type = String(formData.get("type") || "ATTESTATION_PRESENCE");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!title) {
    return { success: false, error: "L'objet de la demande est obligatoire" };
  }

  const request = await prisma.administrativeRequest.create({
    data: {
      schoolId,
      studentId: student.id,
      type,
      title,
      description: description || null,
      status: "EN_ATTENTE",
    },
  });

  // Journalisation Audit Log
  await logAuditEvent({
    schoolId,
    userId: user.id,
    userName: fullName(user.firstName, user.lastName),
    userRole: "STUDENT",
    action: "ADMIN_REQUEST_CREATE",
    resourceType: "ADMIN_REQUEST",
    resourceId: request.id,
    details: `Création de demande administrative : [${type}] ${title}`,
  });

  // Notification aux administrateurs de l'école
  const admins = await prisma.membership.findMany({
    where: { schoolId, role: "SCHOOL_ADMIN" },
    include: { user: true },
  });

  for (const adm of admins) {
    await prisma.notification.create({
      data: {
        schoolId,
        userId: adm.userId,
        type: "GENERAL",
        title: "Nouvelle demande administrative",
        message: `${student.firstName} ${student.lastName} a soumis une demande : ${title}.`,
        link: `/s/${schoolId}/requests`,
      },
    });
  }

  revalidatePath(`/s/${schoolId}/student/requests`);
  revalidatePath(`/s/${schoolId}/student`);

  return { success: true, requestId: request.id };
}

export async function updateAdministrativeRequestStatusAction(
  schoolId: string,
  requestId: string,
  status: "EN_COURS" | "VALIDEE" | "REJETEE",
  responseNote?: string
) {
  const { user } = await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const request = await prisma.administrativeRequest.findUnique({
    where: { id: requestId },
    include: { student: true },
  });

  if (!request) return { success: false, error: "Demande introuvable" };

  await prisma.administrativeRequest.update({
    where: { id: requestId },
    data: {
      status,
      responseNote: responseNote || null,
    },
  });

  // Audit Log
  await logAuditEvent({
    schoolId,
    userId: user.id,
    userName: fullName(user.firstName, user.lastName),
    userRole: "SCHOOL_ADMIN",
    action: "ADMIN_REQUEST_UPDATE",
    resourceType: "ADMIN_REQUEST",
    resourceId: requestId,
    details: `Mise à jour statut demande : ${status} (${responseNote || ""})`,
  });

  // Notification à l'élève
  if (request.student.userId) {
    const statusLabel =
      status === "VALIDEE"
        ? "validée"
        : status === "REJETEE"
          ? "refusée"
          : "prise en charge";

    await prisma.notification.create({
      data: {
        schoolId,
        userId: request.student.userId,
        type: "GENERAL",
        title: `Demande administrative ${statusLabel}`,
        message: `Votre demande "${request.title}" est désormais ${statusLabel}.${
          responseNote ? ` Note du secrétariat : ${responseNote}` : ""
        }`,
        link: `/s/${schoolId}/student/requests`,
      },
    });
  }

  revalidatePath(`/s/${schoolId}/student/requests`);
  return { success: true };
}
