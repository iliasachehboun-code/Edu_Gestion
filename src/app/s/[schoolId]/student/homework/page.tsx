import { redirect } from "next/navigation";

export default async function StudentHomeworkRedirect({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  redirect(`/s/${schoolId}/student/grades`);
}
