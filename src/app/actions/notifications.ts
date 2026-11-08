"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function markNotificationReadAction(
  schoolId: string,
  notificationId: string
) {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { read: true },
  });
  revalidatePath(`/s/${schoolId}`);
  revalidatePath(`/s/${schoolId}/parent`);
}

export async function markAllNotificationsReadAction(schoolId: string) {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { schoolId, userId: user.id, read: false },
    data: { read: true },
  });
  revalidatePath(`/s/${schoolId}`);
  revalidatePath(`/s/${schoolId}/parent`);
}
