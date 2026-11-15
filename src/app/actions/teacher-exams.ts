"use server";

import { prisma } from "@/lib/prisma";
import { getTeacherWorkspace } from "@/lib/teacher";
import { revalidatePath } from "next/cache";

export async function saveTeacherExam(schoolId: string, assignmentId: string, form: FormData) {
  try {
    const teacher = await getTeacherWorkspace(schoolId);
    const assignment = teacher?.assignments.find(a => a.id === assignmentId);
    if (!teacher || !assignment) throw new Error("Ce groupe ne vous est pas affecté.");
    const termId = String(form.get("termId") || "");
    const term = await prisma.term.findFirst({ where: { id: termId, academicYear: { schoolId, isCurrent: true } } });
    if (!term) throw new Error("Sélectionnez une période de l’année courante.");
    const title = String(form.get("title") || "").trim();
    const maxScore = Number(form.get("maxScore"));
    const coefficient = Number(form.get("coefficient"));
    if (!title || title.length > 180) throw new Error("Le titre de l’examen est obligatoire (180 caractères maximum).");
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000 || !Number.isFinite(coefficient) || coefficient <= 0 || coefficient > 100) throw new Error("Barème ou coefficient invalide.");
    const enrolled = await prisma.enrollment.findMany({ where: { schoolId, classId: assignment.classId, academicYearId: term.academicYearId, student: { active: true } }, select: { studentId: true } });
    const allowed = new Set(enrolled.map(e => e.studentId));
    const ids = form.getAll("studentId").map(String);
    if (new Set(ids).size !== ids.length || ids.some(id => !allowed.has(id))) throw new Error("La liste contient un étudiant hors de ce groupe.");
    const rows = ids.flatMap(studentId => {
      const raw = String(form.get(`score_${studentId}`) || "").trim();
      if (!raw) return [];
      const score = Number(raw.replace(",", "."));
      if (!Number.isFinite(score) || score < 0 || score > maxScore) throw new Error(`Les notes doivent être comprises entre 0 et ${maxScore}.`);
      return [{ studentId, score }];
    });
    if (!rows.length) throw new Error("Saisissez au moins une note. Les cases vides ne sont pas enregistrées.");
    await prisma.$transaction(async tx => {
      const matching = await tx.grade.findMany({ where: { schoolId, subjectId: assignment.subjectId, termId, type: "EXAMEN", title, createdById: teacher.userId, studentId: { in: [...allowed] } }, orderBy: { createdAt: "asc" } });
      if (matching.some(g => g.maxScore !== maxScore || g.coefficient !== coefficient)) throw new Error("Cet examen existe déjà avec un autre barème ou coefficient. Conservez ses paramètres ou choisissez un nouveau titre.");
      for (const row of rows) {
        const existing = matching.find(g => g.studentId === row.studentId);
        if (existing) await tx.grade.update({ where: { id: existing.id }, data: { score: row.score } });
        else await tx.grade.create({ data: { schoolId, subjectId: assignment.subjectId, termId, type: "EXAMEN", title, maxScore, coefficient, score: row.score, studentId: row.studentId, createdById: teacher.userId } });
      }
    });
    revalidatePath(`/s/${schoolId}`, "layout");
    return { success: `${rows.length} note(s) enregistrée(s) pour ${assignment.class.name}.`, title };
  } catch (e) { return { error: e instanceof Error ? e.message : "Enregistrement impossible." }; }
}
