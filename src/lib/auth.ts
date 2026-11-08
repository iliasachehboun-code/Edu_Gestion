import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { GlobalRole, SchoolRole } from "@prisma/client";

const SESSION_COOKIE = "school_session";
const SESSION_DAYS = 14;

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: GlobalRole;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { tokenHash, userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          globalRole: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.globalRole !== "SUPER_ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export async function requireSchoolAccess(
  schoolId: string,
  roles?: SchoolRole[]
) {
  const user = await requireUser();
  if (user.globalRole === "SUPER_ADMIN") {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new Error("NOT_FOUND");
    return { user, school, role: "SCHOOL_ADMIN" as SchoolRole };
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      schoolId,
      ...(roles?.length ? { role: { in: roles } } : {}),
    },
    include: { school: true },
  });

  if (!membership) throw new Error("FORBIDDEN");
  return { user, school: membership.school, role: membership.role };
}
