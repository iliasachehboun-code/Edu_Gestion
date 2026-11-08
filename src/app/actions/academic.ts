"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth";

export async function createClassAction(schoolId: string, formData: FormData) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const name = String(formData.get("name") || "").trim();
  const level = String(formData.get("level") || "").trim();
  const capacity = Number(formData.get("capacity") || 0) || null;
  if (!name) return;

  try {
    await prisma.class.create({
      data: { schoolId, name, level: level || null, capacity },
    });
  } catch {
    return;
  }
  revalidatePath(`/s/${schoolId}/classes`);
}

export async function deleteClassAction(schoolId: string, classId: string) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  await prisma.class.delete({ where: { id: classId } });
  revalidatePath(`/s/${schoolId}/classes`);
}

export async function createSubjectAction(schoolId: string, formData: FormData) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim();
  const coefficient = Number(formData.get("coefficient") || 1);
  if (!name) return;

  try {
    await prisma.subject.create({
      data: {
        schoolId,
        name,
        code: code || null,
        coefficient: Number.isFinite(coefficient) ? coefficient : 1,
      },
    });
  } catch {
    return;
  }
  revalidatePath(`/s/${schoolId}/subjects`);
}

export async function deleteSubjectAction(schoolId: string, subjectId: string) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  await prisma.subject.delete({ where: { id: subjectId } });
  revalidatePath(`/s/${schoolId}/subjects`);
}

export async function createAcademicYearAction(
  schoolId: string,
  formData: FormData
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const name = String(formData.get("name") || "").trim();
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");
  const isCurrent = formData.get("isCurrent") === "on";
  if (!name || !startDate || !endDate) return;

  if (isCurrent) {
    await prisma.academicYear.updateMany({
      where: { schoolId },
      data: { isCurrent: false },
    });
  }

  await prisma.academicYear.create({
    data: {
      schoolId,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isCurrent,
      terms: {
        create: [
          {
            name: "Trimestre 1",
            order: 1,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          },
          {
            name: "Trimestre 2",
            order: 2,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          },
          {
            name: "Trimestre 3",
            order: 3,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          },
        ],
      },
    },
  });
  revalidatePath(`/s/${schoolId}/years`);
}

export async function setCurrentYearAction(schoolId: string, yearId: string) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  await prisma.academicYear.updateMany({
    where: { schoolId },
    data: { isCurrent: false },
  });
  await prisma.academicYear.update({
    where: { id: yearId },
    data: { isCurrent: true },
  });
  revalidatePath(`/s/${schoolId}/years`);
}
