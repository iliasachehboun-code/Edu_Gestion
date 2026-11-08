"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Email ou mot de passe incorrect." };
  }

  await createSession(user.id);

  if (user.globalRole === "SUPER_ADMIN") {
    redirect("/superadmin");
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    return { error: "Aucun établissement associé à ce compte." };
  }

  if (membership.role === "PARENT") {
    redirect(`/s/${membership.schoolId}/parent`);
  }
  if (membership.role === "TEACHER") {
    redirect(`/s/${membership.schoolId}/teacher`);
  }
  redirect(`/s/${membership.schoolId}`);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function registerSchoolAdminAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();

  if (!email || !password || !firstName || !lastName) {
    return { error: "Tous les champs sont requis." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Cet email est déjà utilisé." };

  await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      firstName,
      lastName,
      globalRole: "USER",
    },
  });

  return { ok: true };
}

export async function getCurrentUserAction() {
  return getSessionUser();
}
