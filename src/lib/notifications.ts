import { NotificationType } from "@prisma/client";
import { prisma } from "./prisma";

export async function notifyUser(params: {
  schoolId: string;
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  return prisma.notification.create({
    data: {
      schoolId: params.schoolId,
      userId: params.userId,
      type: params.type ?? "GENERAL",
      title: params.title,
      message: params.message,
      link: params.link,
    },
  });
}

export async function notifyParentsOfStudent(params: {
  schoolId: string;
  studentId: string;
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  const links = await prisma.parentStudent.findMany({
    where: { studentId: params.studentId },
    include: { parent: true },
  });

  const userIds = links
    .map((l) => l.parent.userId)
    .filter((id): id is string => !!id);

  await Promise.all(
    userIds.map((userId) =>
      notifyUser({
        schoolId: params.schoolId,
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
      })
    )
  );
}
