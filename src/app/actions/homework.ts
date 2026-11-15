"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { saveSecureHomeworkFile } from "@/lib/storage";
import { notifyParentsOfStudent, notifyUser } from "@/lib/notifications";
import { formatDate } from "@/lib/utils";

export async function submitHomeworkAction(
  schoolId: string,
  homeworkId: string,
  formData: FormData
) {
  const { user } = await requireSchoolAccess(schoolId, [
    "STUDENT",
    "SCHOOL_ADMIN",
  ]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) {
    return { success: false, error: "Dossier élève introuvable." };
  }

  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: { subject: true, teacher: { include: { user: true } } },
  });

  if (!homework || homework.schoolId !== schoolId) {
    return { success: false, error: "Devoir introuvable." };
  }

  const comment = String(formData.get("comment") || "").trim() || null;
  const file = formData.get("homeworkFile") as File | null;

  if (!file && !comment) {
    return {
      success: false,
      error: "Veuillez joindre votre fichier ou saisir un commentaire de réponse.",
    };
  }

  let fileUrl: string | null = null;
  let fileName: string | null = null;
  let fileSize: string | null = null;

  if (file && file.size > 0) {
    try {
      const saved = await saveSecureHomeworkFile({
        schoolId,
        homeworkId,
        studentId: student.id,
        file,
      });
      fileUrl = saved.relativePath;
      fileName = saved.fileName;
      fileSize = `${Math.round(file.size / 1024)} Ko`;
    } catch (err) {
      console.error("Erreur enregistrement copie devoir:", err);
      return { success: false, error: "Échec de l'enregistrement de votre fichier." };
    }
  }

  // Création ou mise à jour du rendu élève
  const submission = await prisma.homeworkSubmission.upsert({
    where: {
      homeworkId_studentId: {
        homeworkId,
        studentId: student.id,
      },
    },
    update: {
      comment: comment ?? undefined,
      ...(fileUrl ? { fileUrl, fileName, fileSize } : {}),
      submittedAt: new Date(),
      status: "RENDU",
    },
    create: {
      homeworkId,
      studentId: student.id,
      comment,
      fileUrl,
      fileName,
      fileSize,
      status: "RENDU",
    },
  });

  // Notifier l'enseignant si présent
  if (homework.teacher?.user?.id) {
    await notifyUser({
      schoolId,
      userId: homework.teacher.user.id,
      type: "SCHEDULE",
      title: `📝 Devoir rendu : ${student.firstName} ${student.lastName}`,
      message: `${student.firstName} ${student.lastName} a rendu son devoir pour "${homework.title}" (${homework.subject.name}).`,
      link: `/s/${schoolId}/homework`,
    });
  }

  revalidatePath(`/s/${schoolId}`);
  revalidatePath(`/s/${schoolId}/student`);
  revalidatePath(`/s/${schoolId}/student/homework`);
  revalidatePath(`/s/${schoolId}/homework`);

  return { success: true, submissionId: submission.id };
}

export async function createHomeworkAction(schoolId: string, formData: FormData) {
  const { user } = await requireSchoolAccess(schoolId, [
    "TEACHER",
    "SCHOOL_ADMIN",
  ]);

  const classId = String(formData.get("classId") || "");
  const subjectId = String(formData.get("subjectId") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const dueDateStr = String(formData.get("dueDate") || "");

  if (!classId || !subjectId || !title || !dueDateStr) {
    return { error: "Veuillez renseigner tous les champs obligatoires (classe, matière, titre, date limite)." };
  }

  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId: user.id },
  });

  const dueDate = new Date(dueDateStr);

  const file = formData.get("attachedFile") as File | null;
  let fileUrl: string | null = null;
  let fileName: string | null = null;

  if (file && file.size > 0) {
    try {
      const saved = await saveSecureHomeworkFile({
        schoolId,
        homeworkId: "subjects",
        studentId: teacher?.id || "prof",
        file,
      });
      fileUrl = saved.relativePath;
      fileName = saved.fileName;
    } catch (err) {
      console.error(err);
    }
  }

  const homework = await prisma.homework.create({
    data: {
      schoolId,
      classId,
      subjectId,
      teacherId: teacher?.id || null,
      title,
      description,
      dueDate,
      fileUrl,
      fileName,
    },
    include: {
      subject: true,
      class: true,
    },
  });

  // Notifier tous les élèves de la classe et leurs parents
  const enrollments = await prisma.enrollment.findMany({
    where: { classId },
    include: { student: { include: { user: true } } },
  });

  const formattedDueDate = formatDate(dueDate);

  for (const enr of enrollments) {
    const student = enr.student;
    if (student.userId) {
      await notifyUser({
        schoolId,
        userId: student.userId,
        type: "SCHEDULE",
        title: `📝 Nouveau devoir à rendre : ${homework.subject.name}`,
        message: `Un devoir "${title}" a été donné pour le ${formattedDueDate}. Rendez votre travail en ligne.`,
        link: `/s/${schoolId}/student/homework`,
      });
    }

    await notifyParentsOfStudent({
      schoolId,
      studentId: student.id,
      type: "SCHEDULE",
      title: `📝 Devoir donné : ${homework.subject.name}`,
      message: `Un devoir "${title}" est à rendre pour le ${formattedDueDate} (${homework.class.name}).`,
      link: `/s/${schoolId}/parent`,
    });
  }

  revalidatePath(`/s/${schoolId}`);
  revalidatePath(`/s/${schoolId}/student`);
  revalidatePath(`/s/${schoolId}/student/homework`);
  revalidatePath(`/s/${schoolId}/homework`);

  return { success: true, homeworkId: homework.id };
}
