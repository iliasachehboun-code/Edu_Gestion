import { requireSchoolAccess } from "@/lib/auth";
import { getStudentForUser } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/ui";
import {
  StudentRequestsClient,
  RequestItem,
} from "@/components/student-requests-client";

export default async function StudentRequestsPage({
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

  const requests = await prisma.administrativeRequest.findMany({
    where: {
      schoolId,
      studentId: student.id,
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedRequests: RequestItem[] = requests.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    description: r.description,
    status: r.status,
    responseNote: r.responseNote,
    documentUrl: r.documentUrl,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Demandes Administratives"
        description="Formulez vos demandes en ligne (attestation de présence, convention de stage, certificats) et suivez leur traitement en temps réel."
      />

      <StudentRequestsClient
        schoolId={schoolId}
        initialRequests={formattedRequests}
      />
    </div>
  );
}
