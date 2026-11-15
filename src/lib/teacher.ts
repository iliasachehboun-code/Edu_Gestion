import { cache } from "react";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const getTeacherWorkspace = cache(async (schoolId: string) => {
  const { user } = await requireSchoolAccess(schoolId, ["TEACHER"]);
  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId: user.id, active: true },
    include: {
      assignments: { include: { class: true, subject: true, contents: { orderBy: { createdAt: "desc" } } }, orderBy: { class: { name: "asc" } } },
      scheduleEntries: { include: { class: true, subject: true, timeSlot: true, room: true }, orderBy: [{ dayOfWeek: "asc" }, { timeSlot: { order: "asc" } }] },
    },
  });
  return teacher;
});

export async function getTeacherData(schoolId: string) {
  const teacher = await getTeacherWorkspace(schoolId);
  if (!teacher) return null;
  const year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
  const classIds = [...new Set(teacher.assignments.map(a => a.classId))];
  const [enrollments, lessons] = await Promise.all([
    year ? prisma.enrollment.findMany({ where: { schoolId, classId: { in: classIds }, academicYearId: year.id, student: { active: true } }, include: { student: true, class: true }, orderBy: { student: { lastName: "asc" } } }) : [],
    prisma.teacherLesson.findMany({ where: { teacherId: teacher.id, ...(year ? { date: { gte: year.startDate.toISOString().slice(0, 10), lte: year.endDate.toISOString().slice(0, 10) } } : { id: { in: [] } }) } }),
  ]);
  return { teacher, year, enrollments, lessons };
}
