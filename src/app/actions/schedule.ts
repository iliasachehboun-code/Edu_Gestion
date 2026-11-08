"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth";

export async function createTimeSlotAction(
  schoolId: string,
  formData: FormData
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const label = String(formData.get("label") || "").trim();
  const startTime = String(formData.get("startTime") || "").trim();
  const endTime = String(formData.get("endTime") || "").trim();
  const order = Number(formData.get("order") || 0);
  if (!label || !startTime || !endTime || !order) return;

  try {
    await prisma.timeSlot.create({
      data: { schoolId, label, startTime, endTime, order },
    });
  } catch {
    return;
  }
  revalidatePath(`/s/${schoolId}/schedule`);
}

export async function createScheduleEntryAction(
  schoolId: string,
  formData: FormData
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const classId = String(formData.get("classId") || "");
  const subjectId = String(formData.get("subjectId") || "");
  const teacherId = String(formData.get("teacherId") || "");
  const timeSlotId = String(formData.get("timeSlotId") || "");
  const dayOfWeek = Number(formData.get("dayOfWeek") || 0);
  const roomId = String(formData.get("roomId") || "") || null;

  if (!classId || !subjectId || !teacherId || !timeSlotId || !dayOfWeek) return;

  const classConflict = await prisma.scheduleEntry.findFirst({
    where: { classId, dayOfWeek, timeSlotId },
  });
  if (classConflict) return;

  const teacherConflict = await prisma.scheduleEntry.findFirst({
    where: { teacherId, dayOfWeek, timeSlotId },
  });
  if (teacherConflict) return;

  await prisma.scheduleEntry.create({
    data: {
      schoolId,
      classId,
      subjectId,
      teacherId,
      timeSlotId,
      dayOfWeek,
      roomId,
    },
  });

  revalidatePath(`/s/${schoolId}/schedule`);
  revalidatePath(`/s/${schoolId}/teacher`);
}

export async function deleteScheduleEntryAction(
  schoolId: string,
  entryId: string
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  await prisma.scheduleEntry.delete({ where: { id: entryId } });
  revalidatePath(`/s/${schoolId}/schedule`);
}

export async function createRoomAction(schoolId: string, formData: FormData) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  try {
    await prisma.room.create({ data: { schoolId, name } });
  } catch {
    return;
  }
  revalidatePath(`/s/${schoolId}/schedule`);
}
