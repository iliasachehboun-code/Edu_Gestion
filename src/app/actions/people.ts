"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireSchoolAccess } from "@/lib/auth";

export async function createStudentAction(schoolId: string, formData: FormData) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const matricule = String(formData.get("matricule") || "").trim() || null;
  const gender = String(formData.get("gender") || "").trim() || null;
  const dateOfBirth = String(formData.get("dateOfBirth") || "");
  const classId = String(formData.get("classId") || "");
  const yearId = String(formData.get("academicYearId") || "");

  if (!firstName || !lastName) return;

  try {
    const student = await prisma.student.create({
      data: {
        schoolId,
        firstName,
        lastName,
        matricule,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
    });

    if (classId && yearId) {
      await prisma.enrollment.create({
        data: {
          schoolId,
          studentId: student.id,
          classId,
          academicYearId: yearId,
        },
      });
    }
  } catch {
    return;
  }

  revalidatePath(`/s/${schoolId}/students`);
}

export async function deleteStudentAction(schoolId: string, studentId: string) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  await prisma.student.delete({ where: { id: studentId } });
  revalidatePath(`/s/${schoolId}/students`);
}

export async function createTeacherAction(schoolId: string, formData: FormData) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const specialty = String(formData.get("specialty") || "").trim();
  const password = String(formData.get("password") || "demo123");

  if (!firstName || !lastName) return;

  let userId: string | undefined;
  if (email) {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash: await hashPassword(password),
        },
      });
    }
    userId = user.id;
    await prisma.membership.upsert({
      where: {
        userId_schoolId_role: {
          userId: user.id,
          schoolId,
          role: "TEACHER",
        },
      },
      update: {},
      create: { userId: user.id, schoolId, role: "TEACHER" },
    });
  }

  await prisma.teacher.create({
    data: {
      schoolId,
      userId,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      specialty: specialty || null,
    },
  });

  revalidatePath(`/s/${schoolId}/teachers`);
}

export async function deleteTeacherAction(schoolId: string, teacherId: string) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  await prisma.teacher.delete({ where: { id: teacherId } });
  revalidatePath(`/s/${schoolId}/teachers`);
}

export async function assignTeacherAction(schoolId: string, formData: FormData) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const teacherId = String(formData.get("teacherId") || "");
  const classId = String(formData.get("classId") || "");
  const subjectId = String(formData.get("subjectId") || "");
  if (!teacherId || !classId || !subjectId) return;

  try {
    await prisma.teacherAssignment.create({
      data: { schoolId, teacherId, classId, subjectId },
    });
  } catch {
    return;
  }

  revalidatePath(`/s/${schoolId}/teachers`);
}

export async function removeAssignmentAction(
  schoolId: string,
  assignmentId: string
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  await prisma.teacherAssignment.delete({ where: { id: assignmentId } });
  revalidatePath(`/s/${schoolId}/teachers`);
}

export async function createParentAction(schoolId: string, formData: FormData) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const studentId = String(formData.get("studentId") || "");
  const relation = String(formData.get("relation") || "parent").trim();
  const password = String(formData.get("password") || "demo123");

  if (!firstName || !lastName) return;

  let userId: string | undefined;
  if (email) {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash: await hashPassword(password),
        },
      });
    }
    userId = user.id;
    await prisma.membership.upsert({
      where: {
        userId_schoolId_role: {
          userId: user.id,
          schoolId,
          role: "PARENT",
        },
      },
      update: {},
      create: { userId: user.id, schoolId, role: "PARENT" },
    });
  }

  const parent = await prisma.parent.create({
    data: {
      schoolId,
      userId,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
    },
  });

  if (studentId) {
    await prisma.parentStudent.create({
      data: { parentId: parent.id, studentId, relation },
    });
  }

  revalidatePath(`/s/${schoolId}/parents`);
}

export async function linkParentStudentAction(
  schoolId: string,
  formData: FormData
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const parentId = String(formData.get("parentId") || "");
  const studentId = String(formData.get("studentId") || "");
  const relation = String(formData.get("relation") || "parent");
  if (!parentId || !studentId) return;

  try {
    await prisma.parentStudent.create({
      data: { parentId, studentId, relation },
    });
  } catch {
    return;
  }
  revalidatePath(`/s/${schoolId}/parents`);
}
