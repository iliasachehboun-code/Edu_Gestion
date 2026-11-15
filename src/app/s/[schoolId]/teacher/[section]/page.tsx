import { TeacherView } from "@/components/teacher-view";
export default async function Page({ params }: { params: Promise<{ schoolId: string; section: string }> }) {
  const { schoolId, section } = await params;
  return <TeacherView schoolId={schoolId} section={section} />;
}
