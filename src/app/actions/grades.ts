"use server";

import { revalidatePath } from "next/cache";
import { GradeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth";
import { generateReportCard } from "@/lib/grades";
import { notifyParentsOfStudent } from "@/lib/notifications";

export async function createGradeAction(schoolId: string, formData: FormData) {
  const { user } = await requireSchoolAccess(schoolId, [
    "SCHOOL_ADMIN",
    "TEACHER",
  ]);

  const studentId = String(formData.get("studentId") || "");
  const subjectId = String(formData.get("subjectId") || "");
  const termId = String(formData.get("termId") || "");
  const type = String(formData.get("type") || "CONTROLE") as GradeType;
  const title = String(formData.get("title") || "").trim();
  const score = Number(formData.get("score"));
  const maxScore = Number(formData.get("maxScore") || 20);
  const coefficient = Number(formData.get("coefficient") || 1);

  if (!studentId || !subjectId || !termId || !Number.isFinite(score)) return;

  await prisma.grade.create({
    data: {
      schoolId,
      studentId,
      subjectId,
      termId,
      type,
      title: title || null,
      score,
      maxScore: Number.isFinite(maxScore) ? maxScore : 20,
      coefficient: Number.isFinite(coefficient) ? coefficient : 1,
      createdById: user.id,
    },
  });

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (student) {
    await notifyParentsOfStudent({
      schoolId,
      studentId,
      type: "GRADE",
      title: "Nouvelle note",
      message: `Une note a été ajoutée pour ${student.firstName} ${student.lastName}.`,
      link: `/s/${schoolId}/parent`,
    });
  }

  revalidatePath(`/s/${schoolId}/grades`);
  revalidatePath(`/s/${schoolId}/teacher`);
  revalidatePath(`/s/${schoolId}/parent`);
}

export async function deleteGradeAction(schoolId: string, gradeId: string) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN", "TEACHER"]);
  await prisma.grade.delete({ where: { id: gradeId } });
  revalidatePath(`/s/${schoolId}/grades`);
}

export async function generateBulletinAction(
  schoolId: string,
  formData: FormData
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN", "TEACHER"]);
  const studentId = String(formData.get("studentId") || "");
  const termId = String(formData.get("termId") || "");
  const academicYearId = String(formData.get("academicYearId") || "");
  const publish = formData.get("publish") === "on";

  if (!studentId || !termId || !academicYearId) return;

  const card = await generateReportCard({
    schoolId,
    studentId,
    termId,
    academicYearId,
    publish,
  });

  if (publish && card) {
    await notifyParentsOfStudent({
      schoolId,
      studentId,
      type: "GRADE",
      title: "Bulletin disponible",
      message: `Le bulletin ${card.term.name} est disponible.`,
      link: `/s/${schoolId}/parent/bulletins/${card.id}`,
    });
  }

  revalidatePath(`/s/${schoolId}/bulletins`);
  revalidatePath(`/s/${schoolId}/parent`);
}

export async function publishBulletinAction(
  schoolId: string,
  reportCardId: string
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const card = await prisma.reportCard.update({
    where: { id: reportCardId },
    data: { published: true, publishedAt: new Date() },
    include: { term: true },
  });

  await notifyParentsOfStudent({
    schoolId,
    studentId: card.studentId,
    type: "GRADE",
    title: "Bulletin publié",
    message: `Le bulletin ${card.term.name} a été publié.`,
    link: `/s/${schoolId}/parent/bulletins/${card.id}`,
  });

  revalidatePath(`/s/${schoolId}/bulletins`);
}
