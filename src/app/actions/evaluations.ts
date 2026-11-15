"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth";
import { notifyParentsOfStudent, notifyUser } from "@/lib/notifications";
import { formatDate } from "@/lib/utils";

export async function createEvaluationAction(
  schoolId: string,
  formData: FormData
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN", "TEACHER"]);

  const classId = String(formData.get("classId") || "");
  const subjectId = String(formData.get("subjectId") || "");
  const termId = String(formData.get("termId") || "") || null;
  const title = String(formData.get("title") || "").trim();
  const type = String(formData.get("type") || "CONTROLE");
  const dateStr = String(formData.get("date") || "");
  const startTime = String(formData.get("startTime") || "").trim() || null;
  const durationMin = Number(formData.get("durationMin") || 60);
  const coefficient = Number(formData.get("coefficient") || 1);
  const room = String(formData.get("room") || "").trim() || null;
  const instructions = String(formData.get("instructions") || "").trim() || null;
  const topics = String(formData.get("topics") || "").trim() || null;

  if (!classId || !subjectId || !title || !dateStr) {
    return { error: "Veuillez remplir tous les champs obligatoires (classe, matière, titre, date)." };
  }

  const date = new Date(dateStr);

  const evaluation = await prisma.evaluation.create({
    data: {
      schoolId,
      classId,
      subjectId,
      termId: termId || null,
      title,
      type,
      date,
      startTime,
      durationMin: Number.isFinite(durationMin) ? durationMin : 60,
      coefficient: Number.isFinite(coefficient) ? coefficient : 1,
      room,
      instructions,
      topics,
    },
    include: {
      subject: true,
      class: true,
    },
  });

  // Notifier tous les élèves inscrits dans cette classe
  const enrollments = await prisma.enrollment.findMany({
    where: { classId },
    include: {
      student: {
        include: { user: true },
      },
    },
  });

  const formattedDate = formatDate(date);

  for (const enr of enrollments) {
    const student = enr.student;
    if (student.userId) {
      await notifyUser({
        schoolId,
        userId: student.userId,
        type: "SCHEDULE",
        title: `📅 Nouveau contrôle : ${evaluation.subject.name}`,
        message: `Un contrôle "${title}" a été programmé pour le ${formattedDate}${
          startTime ? ` à ${startTime}` : ""
        }${room ? ` (Salle: ${room})` : ""}.`,
        link: `/s/${schoolId}/student/evaluations`,
      });
    }

    // Notifier également les parents de l'élève
    await notifyParentsOfStudent({
      schoolId,
      studentId: student.id,
      type: "SCHEDULE",
      title: `📅 Nouveau contrôle : ${evaluation.subject.name}`,
      message: `Un contrôle "${title}" a été planifié pour le ${formattedDate} (${evaluation.class.name}).`,
      link: `/s/${schoolId}/parent`,
    });
  }

  revalidatePath(`/s/${schoolId}`);
  revalidatePath(`/s/${schoolId}/student`);
  revalidatePath(`/s/${schoolId}/student/evaluations`);
  revalidatePath(`/s/${schoolId}/student/notifications`);
  revalidatePath(`/s/${schoolId}/grades`);
  revalidatePath(`/s/${schoolId}/teacher`);
  revalidatePath(`/s/${schoolId}/parent`);

  return { success: true };
}
