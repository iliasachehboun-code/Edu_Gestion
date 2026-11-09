import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

export async function getStudentForUser(schoolId: string, user: SessionUser) {
  // 1. Cherche l'étudiant lié à cet utilisateur
  let student = await prisma.student.findFirst({
    where: { schoolId, userId: user.id },
    include: {
      enrollments: {
        where: { schoolId },
        include: { class: true, academicYear: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // 2. Si c'est un administrateur en train de tester ou prévisualiser l'espace étudiant
  if (!student) {
    student = await prisma.student.findFirst({
      where: { schoolId },
      include: {
        enrollments: {
          where: { schoolId },
          include: { class: true, academicYear: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { matricule: "asc" },
    });
  }

  return student;
}
