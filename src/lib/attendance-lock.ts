import { prisma } from "@/lib/prisma";

// Legacy daily attendance and justification actions must respect finalized lesson calls.
export async function assertClassAttendanceEditable(schoolId: string, classId: string, date: Date) {
  const entries = await prisma.scheduleEntry.findMany({ where: { schoolId, classId }, select: { id: true } });
  const locked = await prisma.teacherLesson.findFirst({ where: { scheduleEntryId: { in: entries.map(e => e.id) }, date: date.toISOString().slice(0, 10) } });
  if (locked) throw new Error("Un appel de cette classe est validé pour cette date. Les présences sont verrouillées.");
}
