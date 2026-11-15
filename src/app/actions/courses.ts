"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth";
import { saveSecureCourseFile } from "@/lib/storage";
import { notifyParentsOfStudent, notifyUser } from "@/lib/notifications";

export async function createCourseMaterialAction(
  schoolId: string,
  formData: FormData
) {
  const { user } = await requireSchoolAccess(schoolId, [
    "TEACHER",
    "SCHOOL_ADMIN",
  ]);

  const classId = String(formData.get("classId") || "");
  const subjectId = String(formData.get("subjectId") || "");
  const title = String(formData.get("title") || "").trim();
  const chapter = String(formData.get("chapter") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;

  if (!classId || !subjectId || !title) {
    return { error: "Veuillez renseigner la classe, la matière et le titre du cours." };
  }

  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId: user.id },
  });

  const file = formData.get("courseFile") as File | null;
  let fileUrl: string | null = null;
  let fileName: string | null = null;
  let fileSize: string | null = null;
  let fileType: string | null = null;

  if (file && file.size > 0) {
    try {
      const saved = await saveSecureCourseFile({
        schoolId,
        subjectId,
        file,
      });
      fileUrl = saved.relativePath;
      fileName = saved.fileName;
      fileSize = `${Math.round(file.size / 1024)} Ko`;
      fileType = file.type || "Document";
    } catch (err) {
      console.error("Erreur enregistrement support cours:", err);
      return { error: "Échec du téléversement du document." };
    }
  }

  const course = await prisma.courseMaterial.create({
    data: {
      schoolId,
      classId,
      subjectId,
      teacherId: teacher?.id || null,
      title,
      chapter,
      description,
      fileUrl,
      fileName,
      fileSize,
      fileType,
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

  for (const enr of enrollments) {
    const student = enr.student;
    if (student.userId) {
      await notifyUser({
        schoolId,
        userId: student.userId,
        type: "GENERAL",
        title: `📚 Nouveau cours : ${course.subject.name}`,
        message: `Le professeur a publié le support "${title}"${chapter ? ` (${chapter})` : ""}. Consultez-le dans votre espace cours.`,
        link: `/s/${schoolId}/student/courses`,
      });
    }

    await notifyParentsOfStudent({
      schoolId,
      studentId: student.id,
      type: "GENERAL",
      title: `📚 Cours publié : ${course.subject.name}`,
      message: `Un support de cours "${title}" a été mis en ligne pour la classe ${course.class.name}.`,
      link: `/s/${schoolId}/parent`,
    });
  }

  revalidatePath(`/s/${schoolId}`);
  revalidatePath(`/s/${schoolId}/student`);
  revalidatePath(`/s/${schoolId}/student/courses`);

  return { success: true, courseId: course.id };
}
