import { TeacherView } from "@/components/teacher-view";
export default async function Page({ params }: { params: Promise<{ schoolId: string; assignmentId: string }> }) {
  const { schoolId, assignmentId } = await params;
  return <TeacherView schoolId={schoolId} section="courses" assignmentId={assignmentId} />;
}
