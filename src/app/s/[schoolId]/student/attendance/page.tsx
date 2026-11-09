import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentForUser } from "@/lib/student";
import { EmptyState, PageHeader } from "@/components/ui";
import {
  StudentAttendanceTable,
  AttendanceRowItem,
} from "@/components/student-attendance-table";

export default async function StudentAbsencesPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { user } = await requireSchoolAccess(schoolId, ["STUDENT", "SCHOOL_ADMIN"]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) {
    return <EmptyState message="Aucun dossier étudiant associé." />;
  }

  // Ne récupérer STRICTEMENT QUE les absences (ABSENT ou EXCUSED/justifiées)
  const absences = await prisma.attendance.findMany({
    where: {
      schoolId,
      studentId: student.id,
      status: { in: ["ABSENT", "EXCUSED"] },
    },
    include: {
      subject: true,
      teacher: true,
      class: true,
    },
    orderBy: { date: "desc" },
  });

  const formattedAbsences: AttendanceRowItem[] = absences.map((a) => {
    let justificationStatus = a.justificationStatus || "NON_JUSTIFIE";
    if (justificationStatus === "NON_JUSTIFIE" && (a.justified || a.status === "EXCUSED")) {
      justificationStatus = "JUSTIFIE_VALIDE";
    }

    return {
      id: a.id,
      date: a.date.toISOString(),
      time: a.time,
      status: a.status,
      justified: a.justified || a.status === "EXCUSED" || justificationStatus === "JUSTIFIE_VALIDE",
      justificationStatus,
      justificationType: a.justificationType,
      justificationComment: a.justificationComment,
      rejectionReason: a.rejectionReason,
      hasFile: Boolean(a.justificationFile),
      reason: a.reason,
      subjectName:
        a.subject?.name || a.teacher?.specialty || "Matière générale",
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes Absences"
        description="Relevé détaillé de vos absences avec date, heure, matière et justification par certificat."
      />

      <StudentAttendanceTable
        schoolId={schoolId}
        initialAbsences={formattedAbsences}
      />
    </div>
  );
}
