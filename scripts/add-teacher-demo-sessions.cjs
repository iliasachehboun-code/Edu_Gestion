/* Adds demonstration lessons without replacing existing schedules or attendance. */
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const overlaps = (a, b) => minutes(a.startTime) < minutes(b.endTime) && minutes(b.startTime) < minutes(a.endTime);

(async () => {
  const teacher = await prisma.teacher.findFirst({
    where: { active: true, user: { email: 'prof@ecole-demo.fr' } },
    include: { assignments: { include: { class: true }, orderBy: { class: { name: 'asc' } } } },
  });
  if (!teacher || !teacher.assignments.length) throw new Error('Professeur de démonstration ou affectations introuvables.');
  const added = [];
  await prisma.$transaction(async tx => {
    const slots = await tx.timeSlot.findMany({ where: { schoolId: teacher.schoolId }, orderBy: { order: 'asc' } });
    const entries = await tx.scheduleEntry.findMany({ where: { schoolId: teacher.schoolId }, include: { timeSlot: true } });
    let groupIndex = 0;
    for (let day = 1; day <= 5; day++) {
      for (const slot of slots) {
        if (entries.filter(e => e.teacherId === teacher.id && e.dayOfWeek === day).length >= 4) break;
        if (entries.some(e => e.teacherId === teacher.id && e.dayOfWeek === day && overlaps(slot, e.timeSlot))) continue;
        let assignment;
        for (let offset = 0; offset < teacher.assignments.length; offset++) {
          const candidate = teacher.assignments[(groupIndex + offset) % teacher.assignments.length];
          if (!entries.some(e => e.classId === candidate.classId && e.dayOfWeek === day && overlaps(slot, e.timeSlot))) {
            assignment = candidate;
            groupIndex = (groupIndex + offset + 1) % teacher.assignments.length;
            break;
          }
        }
        if (!assignment) continue;
        const created = await tx.scheduleEntry.create({ data: {
          schoolId: teacher.schoolId, teacherId: teacher.id, classId: assignment.classId,
          subjectId: assignment.subjectId, timeSlotId: slot.id, dayOfWeek: day,
        }, include: { timeSlot: true } });
        entries.push(created);
        added.push({ day, start: slot.startTime, end: slot.endTime, class: assignment.class.name });
      }
    }
  });
  console.log(JSON.stringify({ added: added.length, sessions: added, totalWeekly: await prisma.scheduleEntry.count({ where: { teacherId: teacher.id } }) }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
