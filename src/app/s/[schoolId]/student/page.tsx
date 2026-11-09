import Link from "next/link";
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
  Button,
} from "@/components/ui";
import { formatDate, fullName, round1, DAYS } from "@/lib/utils";

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { user } = await requireSchoolAccess(schoolId, ["STUDENT", "SCHOOL_ADMIN"]);

  const student = await getStudentForUser(schoolId, user);
  if (!student) {
    return <EmptyState message="Aucun dossier étudiant trouvé pour cet utilisateur." />;
  }

  const enrollment = student.enrollments[0];
  const classId = enrollment?.classId;

  // Récupération des données en parallèle
  const [grades, attendances, terms, unreadNotifications, scheduleEntries, timeSlots] =
    await Promise.all([
      prisma.grade.findMany({
        where: { schoolId, studentId: student.id },
        include: { subject: true, term: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.attendance.findMany({
        where: { schoolId, studentId: student.id },
        include: { class: true },
        orderBy: { date: "desc" },
      }),
      enrollment
        ? prisma.term.findMany({
            where: { academicYearId: enrollment.academicYearId },
            orderBy: { order: "asc" },
          })
        : [],
      prisma.notification.count({
        where: { schoolId, userId: user.id, read: false },
      }),
      classId
        ? prisma.scheduleEntry.findMany({
            where: { schoolId, classId },
            include: {
              subject: true,
              teacher: true,
              timeSlot: true,
              room: true,
            },
            orderBy: [{ dayOfWeek: "asc" }, { timeSlot: { order: "asc" } }],
          })
        : [],
      prisma.timeSlot.findMany({
        where: { schoolId },
        orderBy: { order: "asc" },
      }),
    ]);

  // Calcul de la moyenne générale de l'élève
  const validGrades = grades.filter((g) => g.maxScore > 0);
  const totalWeightedScores = validGrades.reduce(
    (sum, g) => sum + (g.score / g.maxScore) * 20 * g.coefficient,
    0
  );
  const totalCoefficients = validGrades.reduce(
    (sum, g) => sum + g.coefficient,
    0
  );
  const overallAverage =
    totalCoefficients > 0
      ? round1(totalWeightedScores / totalCoefficients)
      : null;

  // Statistiques absences & retards
  const absences = attendances.filter((a) => a.status === "ABSENT");
  const unexcusedAbsences = absences.filter((a) => !a.justified);
  const lates = attendances.filter((a) => a.status === "LATE");

  // Cours d'aujourd'hui (1=Lundi ... 6=Samedi, 0=Dimanche)
  const currentDayOfWeek = new Date().getDay();
  const dayKey = currentDayOfWeek === 0 || currentDayOfWeek === 7 ? 1 : currentDayOfWeek;
  const todayLabel = DAYS.find((d) => d.value === dayKey)?.label ?? "Lundi";
  const todayClasses = scheduleEntries.filter((e) => e.dayOfWeek === dayKey);

  // Devoirs et évaluations récents
  const homeworkItems = grades
    .filter((g) => g.type === "DEVOIR" || g.type === "AUTRE")
    .slice(0, 5);

  const recentGrades = grades.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* En-tête avec profil élève */}
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[#002b5b] to-[#1a4a82] p-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8fe3cf] font-[family-name:var(--font-fraunces)] text-2xl font-bold text-[#002b5b]">
              {student.firstName[0]}
            </span>
            <div>
              <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold sm:text-3xl">
                Bonjour, {student.firstName} 👋
              </h1>
              <p className="text-sm text-[#8fe3cf]">
                {enrollment
                  ? `Classe de ${enrollment.class.name} · Année ${enrollment.academicYear.name}`
                  : "Non inscrit à une classe"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/s/${schoolId}/student/schedule`}>
            <Button variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              📅 Mon planning
            </Button>
          </Link>
          <Link href={`/s/${schoolId}/student/grades`}>
            <Button variant="secondary" className="bg-[#8fe3cf] text-[#002b5b] border-transparent hover:bg-[#7ed1be]">
              📊 Mes notes
            </Button>
          </Link>
        </div>
      </div>

      {/* Cartes d'indicateurs clés (KPIs) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="flex flex-col justify-between border-l-4 border-l-[#264c93]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Moyenne générale
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0c2340]">
              {overallAverage !== null ? `${overallAverage}` : "—"}
            </span>
            <span className="text-sm font-medium text-[#3d5278]">/ 20</span>
          </div>
          <span className="mt-2 text-xs text-[#5a7199]">
            Basée sur {validGrades.length} note{validGrades.length > 1 ? "s" : ""}
          </span>
        </Card>

        <Card className="flex flex-col justify-between border-l-4 border-l-[#8fe3cf]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Cours aujourd'hui
          </span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-[#0c2340]">
              {todayClasses.length}
            </span>
          </div>
          <span className="mt-2 text-xs text-[#5a7199]">
            {todayLabel} ({todayClasses.length > 0 ? "En session" : "Aucun cours"})
          </span>
        </Card>

        <Card className="flex flex-col justify-between border-l-4 border-l-[#f59e0b]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Absences & Retards
          </span>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-[#0c2340]">
              {absences.length}
            </span>
            <span className="text-xs text-[#3d5278]">
              abs. ({unexcusedAbsences.length} non justif.)
            </span>
          </div>
          <span className="mt-2 text-xs text-[#5a7199]">
            {lates.length} retard{lates.length > 1 ? "s" : ""} enregistré{lates.length > 1 ? "s" : ""}
          </span>
        </Card>

        <Card className="flex flex-col justify-between border-l-4 border-l-[#be123c]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Notifications
          </span>
          <div className="mt-2">
            <span className="text-3xl font-bold text-[#0c2340]">
              {unreadNotifications}
            </span>
          </div>
          <Link
            href={`/s/${schoolId}/student/notifications`}
            className="mt-2 text-xs font-semibold text-[#264c93] hover:underline"
          >
            Voir les alertes non lues &rarr;
          </Link>
        </Card>
      </div>

      {/* Grille principale : Planning du jour + Dernières notes */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Planning du jour */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0c2340]">
                Cours de la journée ({todayLabel})
              </h2>
              <p className="text-xs text-[#3d5278]">
                Votre planning pour aujourd'hui
              </p>
            </div>
            <Link
              href={`/s/${schoolId}/student/schedule`}
              className="text-xs font-semibold text-[#264c93] hover:underline"
            >
              Semaine complète &rarr;
            </Link>
          </div>

          {todayClasses.length === 0 ? (
            <EmptyState message="Aucun cours programmé pour cette journée." />
          ) : (
            <div className="space-y-3">
              {todayClasses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-[#e6eef8] bg-[#fbfdff] p-3 transition hover:border-[#8fe3cf]"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-[#e5f8f3] px-2.5 py-1 text-xs font-bold text-[#002b5b]">
                      {item.timeSlot.startTime} - {item.timeSlot.endTime}
                    </span>
                    <div>
                      <h3 className="font-semibold text-[#0c2340]">
                        {item.subject.name}
                      </h3>
                      <p className="text-xs text-[#3d5278]">
                        {fullName(item.teacher.firstName, item.teacher.lastName)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-md bg-[#eef2f7] px-2 py-0.5 text-xs font-medium text-[#0c2340]">
                      {item.room?.name || "Salle non définie"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Dernières notes */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0c2340]">
                Dernières notes obtenues
              </h2>
              <p className="text-xs text-[#3d5278]">
                Vos évaluations les plus récentes
              </p>
            </div>
            <Link
              href={`/s/${schoolId}/student/grades`}
              className="text-xs font-semibold text-[#264c93] hover:underline"
            >
              Toutes les notes &rarr;
            </Link>
          </div>

          {recentGrades.length === 0 ? (
            <EmptyState message="Aucune note enregistrée pour le moment." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Matière</Th>
                  <Th>Évaluation</Th>
                  <Th>Note</Th>
                  <Th>Coeff.</Th>
                </tr>
              </thead>
              <tbody>
                {recentGrades.map((g) => {
                  const scoreOver20 = (g.score / g.maxScore) * 20;
                  const isGood = scoreOver20 >= 12;
                  const isAverage = scoreOver20 >= 10 && scoreOver20 < 12;
                  return (
                    <tr key={g.id}>
                      <Td className="font-medium text-[#0c2340]">
                        {g.subject.name}
                      </Td>
                      <Td className="text-xs text-[#3d5278]">
                        <div>{g.title || g.type}</div>
                        <div className="text-[10px] text-[#8a9bb5]">
                          {formatDate(g.createdAt)}
                        </div>
                      </Td>
                      <Td>
                        <Badge
                          tone={
                            isGood
                              ? "success"
                              : isAverage
                                ? "warning"
                                : "danger"
                          }
                        >
                          {g.score} / {g.maxScore}
                        </Badge>
                      </Td>
                      <Td className="text-xs text-[#3d5278]">{g.coefficient}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      {/* Deuxième section : Devoirs récents et Assiduité */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Devoirs & Travaux */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0c2340]">
                Devoirs & Travaux notés
              </h2>
              <p className="text-xs text-[#3d5278]">
                Vos derniers devoirs rendus ou évalués
              </p>
            </div>
            <Link
              href={`/s/${schoolId}/student/homework`}
              className="text-xs font-semibold text-[#264c93] hover:underline"
            >
              Tous les devoirs &rarr;
            </Link>
          </div>

          {homeworkItems.length === 0 ? (
            <EmptyState message="Aucun devoir noté pour le moment." />
          ) : (
            <div className="space-y-3">
              {homeworkItems.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-xl border border-[#e6eef8] p-3"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-[#0c2340]">
                      {h.title || "Devoir sur table"}
                    </h3>
                    <p className="text-xs text-[#3d5278]">
                      {h.subject.name} · {formatDate(h.createdAt)}
                    </p>
                    {h.comment ? (
                      <p className="mt-1 text-xs italic text-[#5a7199]">
                        « {h.comment} »
                      </p>
                    ) : null}
                  </div>
                  <Badge tone="info">
                    {h.score} / {h.maxScore}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Historique Assiduité */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0c2340]">
                Dernières absences & retards
              </h2>
              <p className="text-xs text-[#3d5278]">
                Bilan de votre ponctualité et présences
              </p>
            </div>
            <Link
              href={`/s/${schoolId}/student/attendance`}
              className="text-xs font-semibold text-[#264c93] hover:underline"
            >
              Détails complets &rarr;
            </Link>
          </div>

          {attendances.length === 0 ? (
            <div className="rounded-xl bg-[#d7f6ee]/40 p-6 text-center text-sm font-medium text-[#002b5b]">
              ✨ Parfait ! Aucune absence ni retard enregistré.
            </div>
          ) : (
            <div className="space-y-2">
              {attendances.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-[#e6eef8] p-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-[#0c2340]">
                      {formatDate(a.date)}
                    </span>
                    {a.reason ? (
                      <p className="text-xs text-[#3d5278]">Motif : {a.reason}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={a.status === "ABSENT" ? "danger" : "warning"}>
                      {a.status === "ABSENT" ? "Absence" : "Retard"}
                    </Badge>
                    {a.justified ? (
                      <Badge tone="success">Justifiée</Badge>
                    ) : (
                      <Badge tone="danger">Non justifiée</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
