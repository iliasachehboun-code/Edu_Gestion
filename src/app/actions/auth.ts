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
  if (membership.role === "STUDENT") {
    redirect(`/s/${membership.schoolId}/student`);
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

export async function changePasswordAction(schoolId: string, formData: FormData) {
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: "Session expirée. Veuillez vous reconnecter." };
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Tous les champs sont obligatoires." };
  }

  if (newPassword.length < 6) {
    return { error: "Le nouveau mot de passe doit contenir au moins 6 caractères." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Le nouveau mot de passe et sa confirmation ne correspondent pas." };
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user) {
    return { error: "Utilisateur introuvable." };
  }

  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    return { error: "Le mot de passe actuel est incorrect." };
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  const { logAuditEvent } = await import("@/lib/audit");
  await logAuditEvent({
    schoolId,
    userId: user.id,
    userName: `${user.firstName} ${user.lastName}`,
    userRole: "STUDENT",
    action: "PASSWORD_CHANGE",
    resourceType: "USER",
    resourceId: user.id,
    details: "Modification sécurisée du mot de passe",
  });

  return { success: true };
}

