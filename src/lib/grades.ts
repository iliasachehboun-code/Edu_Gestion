import { prisma } from "./prisma";
import { round1 } from "./utils";

export async function computeSubjectAverage(
  studentId: string,
  subjectId: string,
  termId: string
) {
  const grades = await prisma.grade.findMany({
    where: { studentId, subjectId, termId },
  });
  if (!grades.length) return null;

  let weighted = 0;
  let coefSum = 0;
  for (const g of grades) {
    const normalized = (g.score / g.maxScore) * 20;
    weighted += normalized * g.coefficient;
    coefSum += g.coefficient;
  }
  if (coefSum === 0) return null;
  return round1(weighted / coefSum);
}

export async function generateReportCard(params: {
  schoolId: string;
  studentId: string;
  academicYearId: string;
  termId: string;
  publish?: boolean;
}) {
  const { schoolId, studentId, academicYearId, termId, publish } = params;

  const subjects = await prisma.subject.findMany({ where: { schoolId } });
  const lines: { subjectId: string; average: number; coefficient: number }[] =
    [];

  for (const subject of subjects) {
    const average = await computeSubjectAverage(
      studentId,
      subject.id,
      termId
    );
    if (average == null) continue;
    lines.push({
      subjectId: subject.id,
      average,
      coefficient: subject.coefficient,
    });
  }

  let generalAverage: number | null = null;
  if (lines.length) {
    let weighted = 0;
    let coefSum = 0;
    for (const line of lines) {
      weighted += line.average * line.coefficient;
      coefSum += line.coefficient;
    }
    generalAverage = coefSum ? round1(weighted / coefSum) : null;
  }

  const reportCard = await prisma.reportCard.upsert({
    where: { studentId_termId: { studentId, termId } },
    create: {
      schoolId,
      studentId,
      academicYearId,
      termId,
      average: generalAverage ?? undefined,
      published: !!publish,
      publishedAt: publish ? new Date() : null,
    },
    update: {
      average: generalAverage ?? undefined,
      published: publish ? true : undefined,
      publishedAt: publish ? new Date() : undefined,
    },
  });

  await prisma.reportCardLine.deleteMany({
    where: { reportCardId: reportCard.id },
  });

  if (lines.length) {
    await prisma.reportCardLine.createMany({
      data: lines.map((l) => ({
        reportCardId: reportCard.id,
        subjectId: l.subjectId,
        average: l.average,
        coefficient: l.coefficient,
      })),
    });
  }

  return prisma.reportCard.findUnique({
    where: { id: reportCard.id },
    include: {
      lines: { include: { subject: true } },
      student: true,
      term: true,
      academicYear: true,
    },
  });
}
