"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getTeacherWorkspace } from "@/lib/teacher";
import { AttendanceStatus } from "@prisma/client";
import { attendanceGate } from "@/lib/attendance-policy";

export async function saveTeacherSession(schoolId: string, entryId: string, day: string, rows: { studentId: string; status: string }[]) {
  try {
    const teacher = await getTeacherWorkspace(schoolId);
    const entry = teacher?.scheduleEntries.find(e => e.id === entryId);
    if (!teacher || !entry) throw new Error("Séance inaccessible.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Date invalide.");
    const date = new Date(`${day}T${entry.timeSlot.startTime}:00.000Z`);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    if (isNaN(date.getTime()) || date.toISOString().slice(0,10) !== day || date.getUTCDay() !== entry.dayOfWeek || day > today) throw new Error("Choisissez une séance passée ou prévue aujourd’hui.");
    const year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
    if (!year || day < year.startDate.toISOString().slice(0,10) || day > year.endDate.toISOString().slice(0,10)) throw new Error("Date hors de l’année scolaire courante.");
    const gate = attendanceGate(day, entry.timeSlot.startTime);
    if (gate.remainingMs > 0) throw new Error(`L’appel est disponible à partir de ${gate.opensAt}, après 15 minutes de cours.`);
    const enrolled = await prisma.enrollment.findMany({ where: { schoolId, classId: entry.classId, academicYearId: year.id, student: { active: true } }, select: { studentId: true } });
    const allowed = new Set(enrolled.map(e => e.studentId));
    if (!rows.length || rows.length !== allowed.size || new Set(rows.map(r => r.studentId)).size !== rows.length || rows.some(r => !allowed.has(r.studentId) || !Object.values(AttendanceStatus).includes(r.status as AttendanceStatus))) throw new Error("Liste des étudiants ou statuts invalides.");
    await prisma.$transaction(async tx => {
      const locked = await tx.teacherLesson.findUnique({ where: { scheduleEntryId_date: { scheduleEntryId: entry.id, date: day } } });
      if (locked) throw new Error("Cet appel est validé et ne peut plus être modifié.");
      await tx.teacherLesson.create({ data: { scheduleEntryId: entry.id, teacherId: teacher.id, date: day } });
      for (const row of rows) await tx.attendance.upsert({
        where: { studentId_date_classId: { studentId: row.studentId, date, classId: entry.classId } },
        create: { schoolId, studentId: row.studentId, classId: entry.classId, teacherId: teacher.id, date, status: row.status as AttendanceStatus, justified: row.status === "EXCUSED" },
        update: { teacherId: teacher.id, status: row.status as AttendanceStatus, justified: row.status === "EXCUSED" },
      });
    });
    revalidatePath(`/s/${schoolId}`, "layout");
    return { success: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "Enregistrement impossible." }; }
}

export async function getTeacherSession(schoolId: string, entryId: string, day: string) {
  const teacher = await getTeacherWorkspace(schoolId);
  const entry = teacher?.scheduleEntries.find(e => e.id === entryId);
  if (!teacher || !entry || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Séance inaccessible.");
  const date = new Date(`${day}T${entry.timeSlot.startTime}:00.000Z`);
  const records = await prisma.attendance.findMany({ where: { schoolId, teacherId: teacher.id, classId: entry.classId, date }, select: { studentId: true, status: true } });
  const locked = await prisma.teacherLesson.findUnique({ where: { scheduleEntryId_date: { scheduleEntryId: entry.id, date: day } } });
  return { records, locked: !!locked, ...attendanceGate(day, entry.timeSlot.startTime) };
}

export async function saveCourseContent(schoolId: string, assignmentId: string, form: FormData) {
  const teacher = await getTeacherWorkspace(schoolId);
  if (!teacher?.assignments.some(a => a.id === assignmentId)) throw new Error("Cours inaccessible.");
  const kind = String(form.get("kind"));
  const title = String(form.get("title") || "").trim().slice(0, 180);
  const body = String(form.get("body") || "").trim().slice(0, 10000);
  const url = String(form.get("url") || "").trim();
  if (!["lecture", "exam", "announcement", "resource", "assignment"].includes(kind) || !title || !body) throw new Error("Complétez le titre et le contenu.");
  if (url && !/^https?:\/\//i.test(url)) throw new Error("Le lien doit commencer par https:// ou http://.");
  await prisma.courseContent.create({ data: { assignmentId, kind, title, body, url: url || null } });
  revalidatePath(`/s/${schoolId}/teacher`, "layout");
}

export async function setCourseTarget(schoolId: string, assignmentId: string, form: FormData) {
  const teacher = await getTeacherWorkspace(schoolId);
  if (!teacher?.assignments.some(a => a.id === assignmentId)) throw new Error("Cours inaccessible.");
  const plannedSessions = Number(form.get("plannedSessions"));
  if (!Number.isInteger(plannedSessions) || plannedSessions < 1 || plannedSessions > 1000) throw new Error("Volume invalide.");
  await prisma.teacherAssignment.update({ where: { id: assignmentId }, data: { plannedSessions } });
  revalidatePath(`/s/${schoolId}/teacher`, "layout");
}
