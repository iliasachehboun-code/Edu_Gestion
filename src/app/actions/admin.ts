"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireSchoolAccess } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import type { SchoolRole } from "@prisma/client";

export async function enrollStudentAction(schoolId: string, formData: FormData) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const studentId = String(formData.get("studentId") || "");
  const classId = String(formData.get("classId") || "");
  const academicYearId = String(formData.get("academicYearId") || "");
  if (!studentId || !classId || !academicYearId) return;

  await prisma.enrollment.upsert({
    where: { studentId_academicYearId: { studentId, academicYearId } },
    create: { schoolId, studentId, classId, academicYearId },
    update: { classId },
  });
  revalidatePath(`/s/${schoolId}/admissions`);
  revalidatePath(`/s/${schoolId}/students`);
}

export async function createDocumentAction(schoolId: string, formData: FormData) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const title = String(formData.get("title") || "").trim();
  const category = String(formData.get("category") || "Administratif").trim();
  const note = String(formData.get("note") || "").trim();
  if (!title) return;
  await prisma.document.create({
    data: { schoolId, title, category, note: note || null },
  });
  revalidatePath(`/s/${schoolId}/documents`);
}

export async function deleteDocumentAction(schoolId: string, id: string) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  await prisma.document.delete({ where: { id } });
  revalidatePath(`/s/${schoolId}/documents`);
}

export async function createLibraryItemAction(
  schoolId: string,
  formData: FormData
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const title = String(formData.get("title") || "").trim();
  const author = String(formData.get("author") || "").trim();
  const copies = Number(formData.get("copies") || 1);
  if (!title) return;
  const n = Number.isFinite(copies) && copies > 0 ? copies : 1;
  await prisma.libraryItem.create({
    data: { schoolId, title, author: author || null, copies: n, available: n },
  });
  revalidatePath(`/s/${schoolId}/library`);
}

export async function deleteLibraryItemAction(schoolId: string, id: string) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  await prisma.libraryItem.delete({ where: { id } });
  revalidatePath(`/s/${schoolId}/library`);
}

export async function createCampusServiceAction(
  schoolId: string,
  formData: FormData
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const kind = String(formData.get("kind") || "cantine");
  const name = String(formData.get("name") || "").trim();
  const detail = String(formData.get("detail") || "").trim();
  const priceRaw = String(formData.get("price") || "").trim();
  if (!name) return;
  await prisma.campusService.create({
    data: {
      schoolId,
      kind,
      name,
      detail: detail || null,
      price: priceRaw ? Number(priceRaw) : null,
    },
  });
  revalidatePath(`/s/${schoolId}/services`);
}

export async function deleteCampusServiceAction(schoolId: string, id: string) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  await prisma.campusService.delete({ where: { id } });
  revalidatePath(`/s/${schoolId}/services`);
}

export async function broadcastMessageAction(
  schoolId: string,
  formData: FormData
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const title = String(formData.get("title") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const audience = String(formData.get("audience") || "PARENT");
  if (!title || !message) return;

  const memberships = await prisma.membership.findMany({
    where: {
      schoolId,
      ...(audience === "ALL" ? {} : { role: audience as SchoolRole }),
    },
  });

  await Promise.all(
    memberships.map((m) =>
      notifyUser({
        schoolId,
        userId: m.userId,
        type: "GENERAL",
        title,
        message,
        link: `/s/${schoolId}/parent/notifications`,
      })
    )
  );
  revalidatePath(`/s/${schoolId}/communication`);
}

export async function inviteUserAction(schoolId: string, formData: FormData) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const password = String(formData.get("password") || "demo123");
  const role = String(formData.get("role") || "TEACHER") as SchoolRole;
  if (!email || !firstName || !lastName) return;
  if (!["SCHOOL_ADMIN", "TEACHER", "PARENT"].includes(role)) return;

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

  await prisma.membership.upsert({
    where: {
      userId_schoolId_role: { userId: user.id, schoolId, role },
    },
    update: {},
    create: { userId: user.id, schoolId, role },
  });
  revalidatePath(`/s/${schoolId}/users`);
}

export async function removeMembershipAction(
  schoolId: string,
  membershipId: string
) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  await prisma.membership.delete({ where: { id: membershipId } });
  revalidatePath(`/s/${schoolId}/users`);
}
