"use server";

import { revalidatePath } from "next/cache";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth";
import { notifyParentsOfStudent } from "@/lib/notifications";

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
  revalidatePath(`/s/${schoolId}/parent`);
}

export async function justifyAttendanceAction(
  schoolId: string,
  attendanceId: string,
  formData: FormData
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN", "PARENT"]);
  const reason = String(formData.get("reason") || "").trim();
  await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      justified: true,
      status: "EXCUSED",
      reason: reason || undefined,
    },
  });
  revalidatePath(`/s/${schoolId}/attendance`);
  revalidatePath(`/s/${schoolId}/parent`);
}
