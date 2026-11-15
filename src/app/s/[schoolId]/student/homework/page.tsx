import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/ui";
import { StudentHomeworkClient, HomeworkItem } from "@/components/student-homework-client";
import { fullName } from "@/lib/utils";

export default async function StudentHomeworkPage({
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
      <EmptyState message="Aucune classe associée à votre dossier pour afficher vos devoirs." />
    );
  }

  // Récupérer les devoirs assignés à la classe de l'élève
  const homeworks = await prisma.homework.findMany({
    where: {
      schoolId,
      classId,
    },
    include: {
      subject: true,
      teacher: true,
      submissions: {
        where: { studentId: student.id },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const formattedHomeworks: HomeworkItem[] = homeworks.map((h) => {
    const sub = h.submissions[0] || null;
    return {
      id: h.id,
      title: h.title,
      description: h.description,
      dueDate: h.dueDate.toISOString(),
      fileUrl: h.fileUrl,
      fileName: h.fileName,
      subjectName: h.subject.name,
      teacherName: h.teacher ? fullName(h.teacher.firstName, h.teacher.lastName) : "Professeur",
      submission: sub
        ? {
            id: sub.id,
            comment: sub.comment,
            fileUrl: sub.fileUrl,
            fileName: sub.fileName,
            fileSize: sub.fileSize,
            submittedAt: sub.submittedAt.toISOString(),
            status: sub.status,
          }
        : null,
    };
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="📝 Mes Devoirs & Travaux à Rendre"
        description={`Classe de ${enrollment.class.name} · Consultez les consignes de vos professeurs et déposez vos travaux en ligne.`}
      />

      <StudentHomeworkClient
        schoolId={schoolId}
        initialHomeworks={formattedHomeworks}
      />
    </div>
  );
}
