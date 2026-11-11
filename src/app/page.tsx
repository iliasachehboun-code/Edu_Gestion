import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LandingPage } from "@/components/landing-page";

export default async function HomePage() {
  const user = await getSessionUser();

  if (!user) {
    return <LandingPage />;
  }

  if (user.globalRole === "SUPER_ADMIN") redirect("/superadmin");

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) redirect("/login");

  if (membership.role === "PARENT") redirect(`/s/${membership.schoolId}/parent`);
  if (membership.role === "TEACHER") redirect(`/s/${membership.schoolId}/teacher`);
  redirect(`/s/${membership.schoolId}`);
}
