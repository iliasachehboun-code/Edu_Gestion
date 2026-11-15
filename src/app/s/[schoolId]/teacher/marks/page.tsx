import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTeacherWorkspace } from "@/lib/teacher";
import { TeacherExamForm } from "@/components/teacher-exam-form";
import { PageHeader, EmptyState, Select, Button } from "@/components/ui";

export default async function TeacherMarksPage({ params, searchParams }: {
  params: Promise<{ schoolId: string }>;
  searchParams: Promise<{ assignmentId?: string; termId?: string; title?: string }>;
}) {
  const { schoolId } = await params;
  const sp = await searchParams;
  const teacher = await getTeacherWorkspace(schoolId);
  if (!teacher) return <EmptyState message="Aucun profil enseignant actif." />;
  const year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, include: { terms: { orderBy: { order: "asc" } } } });
  if (!year || !year.terms.length || !teacher.assignments.length) return <EmptyState message="Les groupes et les périodes de l’année courante doivent être configurés avant la saisie des notes." />;
  const assignment = sp.assignmentId ? teacher.assignments.find(a => a.id === sp.assignmentId) : teacher.assignments[0];
  const term = sp.termId ? year.terms.find(t => t.id === sp.termId) : year.terms[0];
  if (!assignment || !term) notFound();
  const enrollments = await prisma.enrollment.findMany({ where: { schoolId, classId: assignment.classId, academicYearId: year.id, student: { active: true } }, include: { student: true }, orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }] });
  const grades = await prisma.grade.findMany({ where: { schoolId, subjectId: assignment.subjectId, termId: term.id, type: "EXAMEN", createdById: teacher.userId, studentId: { in: enrollments.map(e => e.studentId) } }, orderBy: { createdAt: "desc" } });
  const exams = [...new Map(grades.filter(g => g.title).map(g => [g.title!, g])).values()];
  const selected = grades.filter(g => g.title === sp.title);
  const scoreByStudent = new Map(selected.map(g => [g.studentId, g.score]));
  const base = `/s/${schoolId}/teacher/marks`;
  return <div className="teacher-portal mx-auto max-w-7xl space-y-6">
    <PageHeader title="Examens et notes" description="Saisissez les résultats d’un examen pour un groupe à la fois." />
    <form method="get" className="grid items-end gap-4 border-y border-[#dde3d9] py-5 md:grid-cols-[2fr_1fr_auto]">
      <label className="text-sm" htmlFor="exam-group">Groupe et matière<Select id="exam-group" name="assignmentId" defaultValue={assignment.id} className="mt-2">{teacher.assignments.map(a => <option key={a.id} value={a.id}>{a.class.name} — {a.subject.name}</option>)}</Select></label>
      <label className="text-sm" htmlFor="exam-term">Période<Select id="exam-term" name="termId" defaultValue={term.id} className="mt-2">{year.terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></label>
      <Button type="submit">Afficher le groupe</Button>
    </form>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">{assignment.class.name} · {assignment.subject.name}</h2><p className="mt-1 text-sm text-[#687a6d]">{term.name} · {enrollments.length} étudiants · {year.name}</p></div><Link className="teacher-primary" href={`${base}?assignmentId=${assignment.id}&termId=${term.id}`}>+ Nouvel examen</Link></div>
    {exams.length > 0 && <form method="get" className="flex flex-wrap items-end gap-3"><input type="hidden" name="assignmentId" value={assignment.id} /><input type="hidden" name="termId" value={term.id} /><label className="min-w-64 text-sm" htmlFor="existing-exam">Reprendre un examen<Select id="existing-exam" name="title" defaultValue={sp.title || ""} className="mt-2"><option value="">Nouvel examen</option>{exams.map(g => <option key={g.title} value={g.title!}>{g.title} — sur {g.maxScore}</option>)}</Select></label><Button type="submit" variant="secondary">Ouvrir les notes</Button></form>}
    {enrollments.length ? <TeacherExamForm key={`${assignment.id}:${term.id}:${sp.title || "new"}`} schoolId={schoolId} assignmentId={assignment.id} termId={term.id} title={sp.title || ""} maxScore={selected[0]?.maxScore || 20} coefficient={selected[0]?.coefficient || 1} students={enrollments.map(e => ({ id: e.studentId, name: `${e.student.lastName} ${e.student.firstName}`, matricule: e.student.matricule, score: scoreByStudent.get(e.studentId) ?? null }))} /> : <EmptyState message="Aucun étudiant inscrit dans ce groupe pour l’année courante." />}
  </div>;
}
