import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentForUser } from "@/lib/student";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

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

  // Ne récupérer STRICTEMENT QUE les absences
  const absences = await prisma.attendance.findMany({
    where: {
      schoolId,
      studentId: student.id,
      status: "ABSENT",
    },
    include: {
      subject: true,
      teacher: true,
      class: true,
    },
    orderBy: { date: "desc" },
  });

  const justifiedCount = absences.filter((a) => a.justified).length;
  const unjustifiedCount = absences.length - justifiedCount;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes Absences"
        description="Relevé détaillé de vos absences avec date, heure et matière concernée."
      />

      {/* Cartes récapitulatives */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-[#be123c]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Total des absences
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#9f1239]">
              {absences.length}
            </span>
            <span className="text-sm font-medium text-[#3d5278]">
              absence{absences.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#5a7199]">Sur l'année en cours</p>
        </Card>

        <Card className="border-l-4 border-l-[#f59e0b]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Absences non justifiées
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#d97706]">
              {unjustifiedCount}
            </span>
            <span className="text-sm font-medium text-[#3d5278]">à régulariser</span>
          </div>
          <p className="mt-2 text-xs text-[#5a7199]">Contactez la vie scolaire</p>
        </Card>

        <Card className="border-l-4 border-l-[#002b5b]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Absences justifiées
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#002b5b]">
              {justifiedCount}
            </span>
            <span className="text-sm font-medium text-[#3d5278]">validées</span>
          </div>
          <p className="mt-2 text-xs text-[#5a7199]">Certificats médicaux / motifs acceptés</p>
        </Card>
      </div>

      {/* Tableau des Absences : Date, Heure, Matière, Motif / Statut */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0c2340]">
          Liste de vos absences
        </h2>

        {absences.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#8fe3cf] bg-[#f4f8fc] px-6 py-12 text-center text-sm font-medium text-[#002b5b]">
            🎉 Aucune absence enregistrée. Félicitations pour votre assiduité !
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Heure</Th>
                <Th>Matière</Th>
                <Th>Statut</Th>
                <Th>Motif</Th>
              </tr>
            </thead>
            <tbody>
              {absences.map((item) => {
                const subjectName =
                  item.subject?.name ||
                  item.teacher?.specialty ||
                  "Matière générale";
                const timeDisplay = item.time || "08h00 - 10h00";

                return (
                  <tr key={item.id}>
                    <Td className="font-semibold text-[#0c2340]">
                      {formatDate(item.date)}
                    </Td>
                    <Td className="text-sm font-medium text-[#264c93]">
                      <span className="inline-block rounded-lg bg-[#e4ecf8] px-2.5 py-1 text-xs font-bold text-[#002b5b]">
                        ⏱️ {timeDisplay}
                      </span>
                    </Td>
                    <Td className="font-bold text-[#0c2340]">
                      {subjectName}
                    </Td>
                    <Td>
                      {item.justified ? (
                        <Badge tone="success">Justifiée</Badge>
                      ) : (
                        <Badge tone="danger">Non justifiée</Badge>
                      )}
                    </Td>
                    <Td className="text-xs italic text-[#5a7199]">
                      {item.reason || "Non renseigné"}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
