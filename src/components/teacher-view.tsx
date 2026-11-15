import { getTeacherData } from "@/lib/teacher";
import { TeacherPortal } from "@/components/teacher-portal";
import { EmptyState } from "@/components/ui";
import { notFound } from "next/navigation";

export async function TeacherView({ schoolId, section = "dashboard", assignmentId }: { schoolId: string; section?: string; assignmentId?: string }) {
  if (!["dashboard", "calendar", "courses", "students"].includes(section)) notFound();
  const data = await getTeacherData(schoolId);
  if (!data) return <EmptyState message="Aucun profil professeur actif n’est lié à ce compte." />;
  const { teacher, year, enrollments, lessons } = data;
  if (assignmentId && !teacher.assignments.some(a => a.id === assignmentId)) notFound();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <TeacherPortal schoolId={schoolId} section={section} assignmentId={assignmentId} today={today}
    teacherName={`${teacher.firstName} ${teacher.lastName}`} year={year ? { name: year.name, start: year.startDate.toISOString().slice(0,10), end: year.endDate.toISOString().slice(0,10) } : null}
    courses={teacher.assignments.map(a => ({ id: a.id, classId: a.classId, className: a.class.name, level: a.class.level, subjectId: a.subjectId, subject: a.subject.name, planned: a.plannedSessions, contents: a.contents.map(c => ({ id: c.id, kind: c.kind, title: c.title, body: c.body, url: c.url, date: c.createdAt.toISOString().slice(0,10) })) }))}
    students={enrollments.map(e => ({ id: e.studentId, firstName: e.student.firstName, lastName: e.student.lastName, classId: e.classId, className: e.class.name, email: e.student.email, matricule: e.student.matricule }))}
    entries={teacher.scheduleEntries.map(e => ({ id: e.id, classId: e.classId, className: e.class.name, subjectId: e.subjectId, subject: e.subject.name, day: e.dayOfWeek, start: e.timeSlot.startTime, end: e.timeSlot.endTime, room: e.room?.name || "Salle à préciser" }))}
    lessons={lessons.filter(l => l.completed).map(l => ({ entryId: l.scheduleEntryId, date: l.date }))} />;
}
