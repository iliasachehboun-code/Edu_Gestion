"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireSuperAdmin, requireSchoolAccess } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function createSchoolAction(formData: FormData) {
  await requireSuperAdmin();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const adminEmail = String(formData.get("adminEmail") || "").trim().toLowerCase();
  const adminPassword = String(formData.get("adminPassword") || "");
  const adminFirstName = String(formData.get("adminFirstName") || "").trim();
  const adminLastName = String(formData.get("adminLastName") || "").trim();

  if (!name) return;

  let slug = slugify(name) || `ecole-${Date.now()}`;
  const slugExists = await prisma.school.findUnique({ where: { slug } });
  if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;

  const school = await prisma.school.create({
    data: {
      name,
      slug,
      email: email || null,
      phone: phone || null,
      address: address || null,
    },
  });

  if (adminEmail && adminPassword && adminFirstName && adminLastName) {
    let user = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: await hashPassword(adminPassword),
          firstName: adminFirstName,
          lastName: adminLastName,
        },
      });
    }
    await prisma.membership.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        role: "SCHOOL_ADMIN",
      },
    });
  }

  await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      name: "2025-2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-06-30"),
      isCurrent: true,
      terms: {
        create: [
          {
            name: "Trimestre 1",
            order: 1,
            startDate: new Date("2025-09-01"),
            endDate: new Date("2025-12-20"),
          },
          {
            name: "Trimestre 2",
            order: 2,
            startDate: new Date("2026-01-05"),
            endDate: new Date("2026-03-28"),
          },
          {
            name: "Trimestre 3",
            order: 3,
            startDate: new Date("2026-04-07"),
            endDate: new Date("2026-06-30"),
          },
        ],
      },
    },
  });

  const defaultSlots = [
    { label: "8h-9h", startTime: "08:00", endTime: "09:00", order: 1 },
    { label: "9h-10h", startTime: "09:00", endTime: "10:00", order: 2 },
    { label: "10h15-11h15", startTime: "10:15", endTime: "11:15", order: 3 },
    { label: "11h15-12h15", startTime: "11:15", endTime: "12:15", order: 4 },
    { label: "14h-15h", startTime: "14:00", endTime: "15:00", order: 5 },
    { label: "15h-16h", startTime: "15:00", endTime: "16:00", order: 6 },
  ];
  await prisma.timeSlot.createMany({
    data: defaultSlots.map((s) => ({ schoolId: school.id, ...s })),
  });

  revalidatePath("/superadmin");
}

export async function toggleSchoolActiveAction(schoolId: string) {
  await requireSuperAdmin();
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return;
  await prisma.school.update({
    where: { id: schoolId },
    data: { active: !school.active },
  });
  revalidatePath("/superadmin");
}

export async function updateSchoolAction(schoolId: string, formData: FormData) {
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);
  await prisma.school.update({
    where: { id: schoolId },
    data: {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
    },
  });
  revalidatePath(`/s/${schoolId}/settings`);
}
