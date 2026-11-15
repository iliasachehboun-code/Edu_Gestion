import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/ui";
import { StudentCoursesClient, CourseMaterialItem } from "@/components/student-courses-client";
import { fullName } from "@/lib/utils";

export default async function StudentCoursesPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { user } = await requireSchoolAccess(schoolId, [
    "STUDENT",
    "SCHOOL_ADMIN",
  ]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) {
    return <EmptyState message="Dossier élève introuvable." />;
  }

  const enrollment = student.enrollments[0];
  const classId = enrollment?.classId;

  if (!classId) {
    return (
      <EmptyState message="Aucune classe associée à votre dossier pour afficher vos cours." />
    );
  }

  const [courses, subjects] = await Promise.all([
    prisma.courseMaterial.findMany({
      where: {
        schoolId,
        classId,
      },
      include: {
        subject: true,
        teacher: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const formattedCourses: CourseMaterialItem[] = courses.map((c) => ({
    id: c.id,
    title: c.title,
    chapter: c.chapter,
    description: c.description,
    fileUrl: c.fileUrl,
    fileName: c.fileName,
    fileSize: c.fileSize,
    fileType: c.fileType,
    createdAt: c.createdAt.toISOString(),
    subjectId: c.subjectId,
    subjectName: c.subject.name,
    teacherName: c.teacher ? fullName(c.teacher.firstName, c.teacher.lastName) : "Professeur",
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="📚 Mes Cours & Documents Pédagogiques"
        description={`Classe de ${enrollment.class.name} · Retrouvez l'ensemble des leçons, fiches de révision et supports partagés par vos professeurs.`}
      />

      <StudentCoursesClient
        schoolId={schoolId}
        courses={formattedCourses}
        subjects={subjects}
      />
    </div>
  );
}
