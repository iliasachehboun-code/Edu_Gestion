"use server";

import { revalidatePath } from "next/cache";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth";
import { notifyParentsOfStudent, notifyUser } from "@/lib/notifications";
import { saveSecureJustificatif } from "@/lib/storage";
import { logAuditEvent } from "@/lib/audit";
import { fullName } from "@/lib/utils";

export async function saveAttendanceAction(
  schoolId: string,
  formData: FormData
) {
  const { user } = await requireSchoolAccess(schoolId, [
    "SCHOOL_ADMIN",
    "TEACHER",
  ]);

  const classId = String(formData.get("classId") || "");
  const dateStr = String(formData.get("date") || "");
  if (!classId || !dateStr) return;

  const date = new Date(dateStr);
  date.setHours(12, 0, 0, 0);

  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId: user.id },
  });

  const studentIds = formData.getAll("studentId").map(String);

  for (const studentId of studentIds) {
    const status = String(
      formData.get(`status_${studentId}`) || "PRESENT"
    ) as AttendanceStatus;
    const reason = String(formData.get(`reason_${studentId}`) || "").trim();

    await prisma.attendance.upsert({
      where: {
        studentId_date_classId: { studentId, date, classId },
      },
      create: {
        schoolId,
        studentId,
        classId,
        teacherId: teacher?.id,
        date,
        status,
        reason: reason || null,
        justified: status === "EXCUSED",
      },
      update: {
        status,
        reason: reason || null,
        justified: status === "EXCUSED",
        teacherId: teacher?.id ?? undefined,
      },
    });

    if (status === "ABSENT" || status === "LATE") {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });
      if (student) {
        if (student.userId) {
          await notifyUser({
            schoolId,
            userId: student.userId,
            type: "ATTENDANCE",
            title: status === "ABSENT" ? "Absence enregistrée" : "Retard enregistré",
            message: `Une absence a été signalée le ${date.toLocaleDateString("fr-FR")}. Veuillez inviter vos parents à la justifier depuis leur espace.`,
            link: `/s/${schoolId}/student/attendance`,
          });
        }

        await notifyParentsOfStudent({
          schoolId,
          studentId,
          type: "ATTENDANCE",
          title: status === "ABSENT" ? "Absence signalée" : "Retard signalé",
          message: `${student.firstName} ${student.lastName} : ${
            status === "ABSENT" ? "absent(e)" : "en retard"
          } le ${date.toLocaleDateString("fr-FR")}.`,
          link: `/s/${schoolId}/parent`,
        });
      }
    }
  }

  revalidatePath(`/s/${schoolId}/attendance`);
  revalidatePath(`/s/${schoolId}/student`);
  revalidatePath(`/s/${schoolId}/student/attendance`);
  revalidatePath(`/s/${schoolId}/student/notifications`);
  revalidatePath(`/s/${schoolId}/parent`);
}

export async function justifyAttendanceAction(
  schoolId: string,
  attendanceId: string,
  formData: FormData
) {
  const { user } = await requireSchoolAccess(schoolId, [
    "SCHOOL_ADMIN",
    "PARENT",
    "STUDENT",
  ]);

  const existing = await prisma.attendance.findUnique({
    where: { id: attendanceId },
  });
  if (!existing || existing.schoolId !== schoolId) {
    return { success: false, error: "Absence introuvable." };
  }

  const reasonType = String(
    formData.get("reasonType") || formData.get("reason") || "Certificat médical"
  ).trim();
  const comment = String(formData.get("comment") || "").trim();
  const file = formData.get("certificateFile") as File | null;

  let storedFilePath: string | null = null;
  let fileDisplayName: string | null = null;

  if (file && file.size > 0) {
    try {
      const { relativePath, fileName } = await saveSecureJustificatif({
        schoolId,
        attendanceId,
        file,
      });
      storedFilePath = relativePath;
      fileDisplayName = fileName;
    } catch (err) {
      console.error("Erreur enregistrement sécurisé justificatif:", err);
      return {
        success: false,
        error: "Impossible d'enregistrer le fichier justificatif sur le serveur.",
      };
    }
  }

  let finalReason = reasonType;
  if (comment) {
    finalReason += ` (${comment})`;
  }
  if (fileDisplayName) {
    finalReason += ` [Pièce: ${fileDisplayName}]`;
  }

  // Machine à états stricte : transition vers EN_ATTENTE_VALIDATION
  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      justified: false, // Reste non justifiée tant que l'administration n'a pas validé
      justificationStatus: "EN_ATTENTE_VALIDATION",
      justificationFile: storedFilePath,
      justificationType: reasonType,
      justificationComment: comment || null,
      reason: `${finalReason} - En attente de validation`,
    },
    include: { student: true },
  });

  // Journalisation Audit Log
  await logAuditEvent({
    schoolId,
    userId: user.id,
    userName: fullName(user.firstName, user.lastName),
    userRole: user.globalRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "STUDENT",
    action: "JUSTIFICATIF_UPLOAD",
    resourceType: "ATTENDANCE",
    resourceId: attendanceId,
    details: `Dépôt justificatif: ${reasonType} ${fileDisplayName ? `(${fileDisplayName})` : ""}`,
  });

  revalidatePath(`/s/${schoolId}/attendance`);
  revalidatePath(`/s/${schoolId}/parent`);
  revalidatePath(`/s/${schoolId}/student/attendance`);
  revalidatePath(`/s/${schoolId}/student`);

  return {
    success: true,
    justificationStatus: "EN_ATTENTE_VALIDATION",
    reason: updated.reason,
    hasFile: Boolean(storedFilePath),
  };
}

export async function reviewAttendanceJustificationAction(
  schoolId: string,
  attendanceId: string,
  decision: "APPROVE" | "REJECT",
  rejectionReason?: string
) {
  const { user } = await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const isApproved = decision === "APPROVE";
  const updatedStatus = isApproved ? "JUSTIFIE_VALIDE" : "JUSTIFIE_REFUSE";

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { student: true },
  });

  if (!attendance) return { success: false, error: "Absence introuvable" };

  await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      justified: isApproved,
      status: isApproved ? "EXCUSED" : "ABSENT",
      justificationStatus: updatedStatus,
      rejectionReason: isApproved ? null : (rejectionReason || "Justificatif non recevable"),
      reviewedAt: new Date(),
      reviewedById: user.id,
      reason: isApproved
        ? `${attendance.justificationType || "Certificat"} - Validé par la scolarité`
        : `Refusé : ${rejectionReason || "Justificatif non recevable"}`,
    },
  });

  // Journalisation Audit Log
  await logAuditEvent({
    schoolId,
    userId: user.id,
    userName: fullName(user.firstName, user.lastName),
    userRole: "SCHOOL_ADMIN",
    action: "JUSTIFICATIF_REVIEW",
    resourceType: "ATTENDANCE",
    resourceId: attendanceId,
    details: `Décision: ${decision} (${isApproved ? "Validé" : rejectionReason || "Refusé"})`,
  });

  // Notification à l'élève
  if (attendance.student.userId) {
    await prisma.notification.create({
      data: {
        schoolId,
        userId: attendance.student.userId,
        type: "ATTENDANCE",
        title: isApproved ? "Justificatif d'absence validé" : "Justificatif d'absence refusé",
        message: isApproved
          ? `Votre justificatif pour l'absence du ${attendance.date.toLocaleDateString("fr-FR")} a été validé par la scolarité.`
          : `Votre justificatif a été refusé : ${rejectionReason || "Pièce non conforme"}. Merci de fournir un document valide.`,
        link: `/s/${schoolId}/student/attendance`,
      },
    });
  }

  revalidatePath(`/s/${schoolId}/attendance`);
  revalidatePath(`/s/${schoolId}/parent`);
  revalidatePath(`/s/${schoolId}/student/attendance`);
  revalidatePath(`/s/${schoolId}/student`);

  return { success: true, justificationStatus: updatedStatus };
}


