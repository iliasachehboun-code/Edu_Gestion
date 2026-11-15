import { TeacherView } from "@/components/teacher-view";
export default async function Page({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  return <TeacherView schoolId={schoolId} />;
}
