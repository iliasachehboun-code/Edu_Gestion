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
import { formatDate, fullName, round1 } from "@/lib/utils";

export default async function StudentAttendancePage({
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

  const attendances = await prisma.attendance.findMany({
    where: { schoolId, studentId: student.id },
    include: {
      class: true,
      teacher: true,
    },
    orderBy: { date: "desc" },
  });

  const totalPoints = attendances.length;
  const presents = attendances.filter((a) => a.status === "PRESENT").length;
  const absences = attendances.filter((a) => a.status === "ABSENT");
  const excused = attendances.filter((a) => a.status === "EXCUSED" || a.justified);
  const unexcused = absences.filter((a) => !a.justified);
  const lates = attendances.filter((a) => a.status === "LATE");

  const attendanceRate =
    totalPoints > 0
      ? round1(((presents + excused.length) / totalPoints) * 100)
      : 100;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes présences & absences"
        description="Suivi de votre assiduité scolaire et des motifs de régularisation."
      />

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-l-4 border-l-[#8fe3cf]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Taux d&apos;assiduité
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#002b5b]">
              {attendanceRate}%
            </span>
          </div>
          <p className="mt-2 text-xs text-[#5a7199]">
            {totalPoints > 0 ? `${totalPoints} pointages au total` : "Aucun pointage"}
          </p>
        </Card>

        <Card className="border-l-4 border-l-[#be123c]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Absences totales
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0c2340]">
              {absences.length}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#9f1239]">
            dont {unexcused.length} non justifiée{unexcused.length > 1 ? "s" : ""}
          </p>
        </Card>

        <Card className="border-l-4 border-l-[#f59e0b]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Retards enregistrés
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0c2340]">
              {lates.length}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#5a7199]">Ponctualité en cours</p>
        </Card>

        <Card className="border-l-4 border-l-[#002b5b]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Absences justifiées
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#002b5b]">
              {excused.length}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#5a7199]">Validées par la vie scolaire</p>
        </Card>
      </div>

      {/* Tableau détaillé */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-[#0c2340]">
          Historique des présences et absences
        </h2>

        {attendances.length === 0 ? (
          <EmptyState message="Aucun enregistrement d'assiduité pour le moment." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Classe</Th>
                <Th>Enseignant</Th>
                <Th>Statut</Th>
                <Th>Régularisation</Th>
                <Th>Motif</Th>
              </tr>
            </thead>
            <tbody>
              {attendances.map((item) => (
                <tr key={item.id}>
                  <Td className="font-semibold text-[#0c2340]">
                    {formatDate(item.date)}
                  </Td>
                  <Td className="text-xs text-[#3d5278]">
                    {item.class?.name || "—"}
                  </Td>
                  <Td className="text-xs text-[#3d5278]">
                    {item.teacher
                      ? fullName(item.teacher.firstName, item.teacher.lastName)
                      : "—"}
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        item.status === "PRESENT"
                          ? "success"
                          : item.status === "ABSENT"
                            ? "danger"
                            : item.status === "LATE"
                              ? "warning"
                              : "neutral"
                      }
                    >
                      {item.status === "PRESENT"
                        ? "Présent"
                        : item.status === "ABSENT"
                          ? "Absent"
                          : item.status === "LATE"
                            ? "En retard"
                            : "Excusé"}
                    </Badge>
                  </Td>
                  <Td>
                    {item.status === "PRESENT" ? (
                      <span className="text-xs text-[#8a9bb5]">—</span>
                    ) : item.justified ? (
                      <Badge tone="success">Justifiée</Badge>
                    ) : (
                      <Badge tone="danger">À régulariser</Badge>
                    )}
                  </Td>
                  <Td className="text-xs italic text-[#5a7199]">
                    {item.reason || "Non renseigné"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
