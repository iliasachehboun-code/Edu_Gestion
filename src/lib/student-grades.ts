import { prisma } from "./prisma";
import { round1 } from "./utils";

export async function getClassRelevantSubjects(
  schoolId: string,
  studentId: string,
  classId?: string | null
) {
  const [allSubjects, scheduleSubjects, assignmentSubjects, evalSubjects, studentGrades] =
    await Promise.all([
      prisma.subject.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
      }),
      classId
        ? prisma.scheduleEntry.findMany({
            where: { schoolId, classId },
            select: { subjectId: true },
            distinct: ["subjectId"],
          })
        : [],
      classId
        ? prisma.teacherAssignment.findMany({
            where: { schoolId, classId },
            select: { subjectId: true },
            distinct: ["subjectId"],
          })
        : [],
      classId
        ? prisma.evaluation.findMany({
            where: { schoolId, classId },
            select: { subjectId: true },
            distinct: ["subjectId"],
          })
        : [],
      prisma.grade.findMany({
        where: { schoolId, studentId },
        select: { subjectId: true },
        distinct: ["subjectId"],
      }),
    ]);

  const relevantIds = new Set<string>([
    ...scheduleSubjects.map((s) => s.subjectId),
    ...assignmentSubjects.map((s) => s.subjectId),
    ...evalSubjects.map((s) => s.subjectId),
    ...studentGrades.map((s) => s.subjectId),
  ]);

  if (relevantIds.size === 0) {
    return allSubjects;
  }

  return allSubjects.filter((s) => relevantIds.has(s.id));
}

export type GradeInput = {
  id: string;
  subjectId: string;
  title: string | null;
  type: string;
  score: number;
  maxScore: number;
  coefficient: number;
};

export type SubjectInput = {
  id: string;
  name: string;
  coefficient: number;
};

export type SubjectGradeSlot = {
  score20: number;
  rawScore: number;
  maxScore: number;
  coefficient: number;
  title: string | null;
  type: string;
};

export type SubjectGradeRow = {
  subjectId: string;
  subjectName: string;
  coefficient: number;
  cc1: SubjectGradeSlot | null;
  cc2: SubjectGradeSlot | null;
  cc3: SubjectGradeSlot | null;
  extraGrades: SubjectGradeSlot[];
  allGrades: SubjectGradeSlot[];
  average: number | null;
};

export function findCurrentTerm<
  T extends { id: string; startDate?: Date | null; endDate?: Date | null }
>(terms: T[], now: Date = new Date()): T | undefined {
  if (!terms.length) return undefined;
  const active = terms.find(
    (t) =>
      t.startDate &&
      t.endDate &&
      new Date(t.startDate) <= now &&
      now <= new Date(t.endDate)
  );
  return active || terms[0];
}

function matchesSlotNumber(title: string | null, num: 1 | 2 | 3): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  const patterns = [
    new RegExp(`\\bcc\\s*${num}\\b`),
    new RegExp(`\\bn°\\s*${num}\\b`),
    new RegExp(`\\bcontrole\\s*(continu\\s*)?${num}\\b`),
    new RegExp(`\\bcontrôle\\s*(continu\\s*)?${num}\\b`),
    new RegExp(`(?:^|\\s)${num}$`),
  ];
  return patterns.some((p) => p.test(lower));
}

export function computeTermGradesSummary(
  subjects: SubjectInput[],
  grades: GradeInput[]
): {
  rows: SubjectGradeRow[];
  evaluatedSubjectsCount: number;
  totalCoefficient: number;
  semesterAverage: number | null;
} {
  const rows: SubjectGradeRow[] = subjects.map((sub) => {
    const validGrades = grades.filter(
      (g) =>
        g.subjectId === sub.id &&
        Number.isFinite(g.score) &&
        Number.isFinite(g.maxScore) &&
        g.maxScore > 0
    );

    const slots: SubjectGradeSlot[] = validGrades.map((g) => ({
      score20: round1((g.score / g.maxScore) * 20),
      rawScore: g.score,
      maxScore: g.maxScore,
      coefficient: Number.isFinite(g.coefficient) && g.coefficient > 0 ? g.coefficient : 1,
      title: g.title,
      type: g.type,
    }));

    // Assigner CC1, CC2, CC3 de manière déterministe sans jamais écraser une note
    let cc1: SubjectGradeSlot | null = null;
    let cc2: SubjectGradeSlot | null = null;
    let cc3: SubjectGradeSlot | null = null;
    const assigned = new Set<number>();

    slots.forEach((slot, idx) => {
      if (!cc1 && matchesSlotNumber(slot.title, 1)) {
        cc1 = slot;
        assigned.add(idx);
      } else if (!cc2 && matchesSlotNumber(slot.title, 2)) {
        cc2 = slot;
        assigned.add(idx);
      } else if (!cc3 && matchesSlotNumber(slot.title, 3)) {
        cc3 = slot;
        assigned.add(idx);
      }
    });

    const extraGrades: SubjectGradeSlot[] = [];
    slots.forEach((slot, idx) => {
      if (assigned.has(idx)) return;
      if (!cc1) cc1 = slot;
      else if (!cc2) cc2 = slot;
      else if (!cc3) cc3 = slot;
      else extraGrades.push(slot);
    });

    // Calcul canonique pondéré identique à src/lib/grades.ts
    let weighted = 0;
    let coefSum = 0;
    for (const g of validGrades) {
      const normalized = (g.score / g.maxScore) * 20;
      const gCoef = Number.isFinite(g.coefficient) && g.coefficient > 0 ? g.coefficient : 1;
      weighted += normalized * gCoef;
      coefSum += gCoef;
    }

    const average = coefSum > 0 ? round1(weighted / coefSum) : null;

    return {
      subjectId: sub.id,
      subjectName: sub.name,
      coefficient: Number.isFinite(sub.coefficient) && sub.coefficient > 0 ? sub.coefficient : 1,
      cc1,
      cc2,
      cc3,
      extraGrades,
      allGrades: slots,
      average,
    };
  });

  const evaluatedRows = rows.filter((r) => r.average !== null);
  const totalCoefficient = evaluatedRows.reduce((sum, r) => sum + r.coefficient, 0);
  const totalWeighted = evaluatedRows.reduce(
    (sum, r) => sum + (r.average ?? 0) * r.coefficient,
    0
  );

  const semesterAverage =
    totalCoefficient > 0 ? round1(totalWeighted / totalCoefficient) : null;

  return {
    rows,
    evaluatedSubjectsCount: evaluatedRows.length,
    totalCoefficient,
    semesterAverage,
  };
}
