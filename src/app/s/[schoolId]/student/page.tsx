import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentForUser } from "@/lib/student";
import {
  Badge,
  Card,
  EmptyState,
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
    return <EmptyState message="Aucun dossier élève trouvé pour cet utilisateur." />;
  }

  const enrollment = student.enrollments[0];
  const classId = enrollment?.classId;

  // Récupération des données en parallèle
  const [
    grades,
    attendances,
    terms,
    unreadNotifications,
    scheduleEntries,
    upcomingEvaluations,
  ] = await Promise.all([
    prisma.grade.findMany({
      where: { schoolId, studentId: student.id },
      include: { subject: true, term: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendance.findMany({
      where: {
        schoolId,
        studentId: student.id,
        status: { in: ["ABSENT", "EXCUSED"] },
      },
      include: { subject: true, teacher: true, class: true },
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
    classId
      ? prisma.evaluation.findMany({
          where: {
            schoolId,
            classId,
            date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          include: { subject: true },
          orderBy: { date: "asc" },
          take: 5,
        })
      : [],
  ]);

  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  // Filtrage automatique des évaluations terminées
  const activeEvaluations = upcomingEvaluations.filter((ev) => {
    const evDate = new Date(ev.date);
    evDate.setHours(0, 0, 0, 0);

    if (evDate < todayMidnight) return false;

    if (evDate.getTime() === todayMidnight.getTime() && ev.startTime) {
      const cleanTime = ev.startTime.replace("h", ":").trim();
      const [hours, minutes] = cleanTime.split(":").map(Number);
      if (!isNaN(hours)) {
        const endDateTime = new Date(now);
        endDateTime.setHours(hours, minutes || 0, 0, 0);
        endDateTime.setMinutes(endDateTime.getMinutes() + (ev.durationMin || 55));
        if (now > endDateTime) return false;
      }
    }
    return true;
  }).slice(0, 3);

  // Calcul de la note générale du Semestre 1
  const validGrades = grades.filter((g) => g.maxScore > 0);
  const totalWeightedScores = validGrades.reduce(
    (sum, g) => sum + (g.score / g.maxScore) * 20 * g.coefficient,
    0
  );
  const totalCoefficients = validGrades.reduce(
    (sum, g) => sum + g.coefficient,
    0
  );
  const semesterAverage =
    totalCoefficients > 0
      ? round1(totalWeightedScores / totalCoefficients)
      : null;

  // Statistiques absences uniquement
  const unjustifiedAbsences = attendances.filter(
    (a) => !a.justified && a.status !== "EXCUSED"
  );

  // Cours d'aujourd'hui (1=Lundi ... 6=Samedi, 0=Dimanche)
  const currentDayOfWeek = new Date().getDay();
  const dayKey = currentDayOfWeek === 0 || currentDayOfWeek === 7 ? 1 : currentDayOfWeek;
  const todayLabel = DAYS.find((d) => d.value === dayKey)?.label ?? "Lundi";
  const todayClasses = scheduleEntries.filter((e) => e.dayOfWeek === dayKey);

  // Détermination du cours suivant
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`;

  // 1. Chercher le cours à venir aujourd'hui (dont l'heure de fin n'est pas encore dépassée)
  let nextClass = todayClasses.find((c) => c.timeSlot.endTime >= currentTimeStr);
  let nextDayBadge = "Aujourd'hui";

  // 2. Si tous les cours du jour sont terminés ou pas de cours aujourd'hui : chercher le premier cours du prochain jour d'école
  if (!nextClass && scheduleEntries.length > 0) {
    for (let offset = 1; offset <= 7; offset++) {
      const checkDay = ((dayKey - 1 + offset) % 7) + 1;
      const candidates = scheduleEntries.filter((e) => e.dayOfWeek === checkDay);
      if (candidates.length > 0) {
        nextClass = candidates[0];
        nextDayBadge = offset === 1 ? "Demain" : DAYS.find((d) => d.value === checkDay)?.label ?? "";
        break;
      }
    }
  }

  // Fallback si nécessaire
  if (!nextClass && todayClasses.length > 0) {
    nextClass = todayClasses[0];
  }

  const recentGrades = grades.slice(0, 6);

  return (
    <div className="space-y-8">
      {/* En-tête profil élève */}
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[#002b5b] to-[#1a4a82] p-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
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

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href={`/s/${schoolId}/student/evaluations`}>
            <Button
              variant="secondary"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs font-semibold"
            >
              📝 Examens & Évaluations
            </Button>
          </Link>
          <Link href={`/s/${schoolId}/student/documents`}>
            <Button
              variant="secondary"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs font-semibold"
            >
              📜 Documents
            </Button>
          </Link>
          <Link href={`/s/${schoolId}/student/requests`}>
            <Button
              variant="secondary"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs font-semibold"
            >
              🏛️ Démarches
            </Button>
          </Link>
          <Link href={`/s/${schoolId}/student/profile`}>
            <Button
              variant="secondary"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs font-semibold"
            >
              👤 Mon Profil
            </Button>
          </Link>
          <Link href={`/s/${schoolId}/student/grades`}>
            <Button
              variant="secondary"
              className="bg-[#8fe3cf] text-[#002b5b] border-transparent hover:bg-[#7ed1be] text-xs font-bold"
            >
              📊 Mes notes
            </Button>
          </Link>
        </div>
      </div>

      {/* Cartes métriques */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="flex flex-col justify-between border-l-4 border-l-[#002b5b]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Note du Semestre
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#002b5b]">
              {semesterAverage !== null ? `${semesterAverage}` : "—"}
            </span>
            <span className="text-sm font-medium text-[#3d5278]">/ 20</span>
          </div>
          <span className="mt-2 text-xs text-[#5a7199]">
            {terms[0]?.name || "Semestre 1"}
          </span>
        </Card>

        {/* Carte Cours Suivant */}
        <Card className="flex flex-col justify-between border-l-4 border-l-[#8fe3cf]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
              Cours suivant
            </span>
            {nextClass ? (
              <span className="rounded-full bg-[#8fe3cf] px-2 py-0.5 text-[10px] font-bold text-[#002b5b]">
                {nextDayBadge}
              </span>
            ) : null}
          </div>

          {nextClass ? (
            <div className="my-1.5">
              <div className="text-xl font-extrabold text-[#002b5b] leading-tight truncate">
                {nextClass.subject.name}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#3d5278]">
                <span className="font-bold text-[#264c93]">
                  ⏱️ {nextClass.timeSlot.startTime} - {nextClass.timeSlot.endTime}
                </span>
                {nextClass.room ? (
                  <span className="rounded bg-[#f0f4fa] px-1.5 py-0.5 text-[11px] font-medium text-[#0c2340]">
                    📍 {nextClass.room.name}
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="my-1.5">
              <span className="text-lg font-bold text-[#0c2340]">Aucun cours</span>
              <p className="text-xs text-[#5a7199]">Pas de cours programmé</p>
            </div>
          )}

          <div className="text-xs text-[#5a7199] truncate">
            {nextClass ? (
              <>Prof. {fullName(nextClass.teacher.firstName, nextClass.teacher.lastName)}</>
            ) : (
              <>{todayClasses.length} cours au total</>
            )}
          </div>
        </Card>

        <Card className="flex flex-col justify-between border-l-4 border-l-[#be123c]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3d5278]">
            Mes Absences
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#9f1239]">
              {attendances.length}
            </span>
            <span className="text-xs text-[#3d5278]">
              ({unjustifiedAbsences.length} non justif.)
            </span>
          </div>
          <Link
            href={`/s/${schoolId}/student/attendance`}
            className="mt-2 text-xs font-semibold text-[#be123c] hover:underline"
          >
            Consulter le relevé &rarr;
          </Link>
        </Card>

        <Card className="flex flex-col justify-between border-l-4 border-l-[#264c93]">
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
                Votre planning pour aujourd&apos;hui
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

        {/* Dernières notes de contrôle continu */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0c2340]">
                Derniers Contrôles Continus
              </h2>
              <p className="text-xs text-[#3d5278]">
                Évaluations récentes du semestre
              </p>
            </div>
            <Link
              href={`/s/${schoolId}/student/grades`}
              className="text-xs font-semibold text-[#264c93] hover:underline"
            >
              Relevé complet CC1, CC2, CC3 &rarr;
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
                </tr>
              </thead>
              <tbody>
                {recentGrades.map((g) => {
                  const scoreOver20 = (g.score / g.maxScore) * 20;
                  return (
                    <tr key={g.id}>
                      <Td className="font-medium text-[#0c2340]">
                        {g.subject.name}
                      </Td>
                      <Td className="text-xs text-[#3d5278]">
                        <span className="rounded bg-[#f0f4fa] px-2 py-0.5 font-medium text-[#264c93]">
                          {g.title || "Contrôle"}
                        </span>
                      </Td>
                      <Td>
                        <Badge
                          tone={
                            scoreOver20 >= 12
                              ? "success"
                              : scoreOver20 >= 10
                                ? "warning"
                                : "danger"
                          }
                        >
                          {g.score} / {g.maxScore}
                        </Badge>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      {/* Section Prochains Examens & Contrôles */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0c2340]">
              Prochaines Évaluations & Contrôles programmés
            </h2>
            <p className="text-xs text-[#3d5278]">
              Épreuves à venir pour votre classe ({enrollment?.class.name || "6ème A"})
            </p>
          </div>
          <Link
            href={`/s/${schoolId}/student/evaluations`}
            className="text-xs font-semibold text-[#264c93] hover:underline"
          >
            Calendrier complet &rarr;
          </Link>
        </div>

        {activeEvaluations.length === 0 ? (
          <div className="rounded-xl bg-[#f4f8fc] p-6 text-center text-sm font-medium text-[#002b5b]">
            🎉 Aucune évaluation programmée pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeEvaluations.map((ev) => (
              <div
                key={ev.id}
                className="rounded-xl border border-[#c9d7ee] bg-[#fbfdff] p-3.5 space-y-2 hover:border-[#002b5b] transition shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-[#002b5b] px-2 py-0.5 text-[10px] font-bold text-white">
                    {ev.subject.name}
                  </span>
                  <span className="text-[11px] font-bold text-[#be123c]">
                    📅 {formatDate(ev.date)}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-[#0c2340] line-clamp-1">
                  {ev.title}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-[#5a7199] border-t border-[#f0f4f9] pt-1.5">
                  <span>⏱️ {ev.startTime || "09h00"} ({ev.durationMin}m)</span>
                  <span>Coeff. {ev.coefficient}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Section Absences : Date, Heure, Matière */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0c2340]">
              Dernières absences enregistrées
            </h2>
            <p className="text-xs text-[#3d5278]">
              Relevé avec date, heure et matière concernée
            </p>
          </div>
          <Link
            href={`/s/${schoolId}/student/attendance`}
            className="text-xs font-semibold text-[#264c93] hover:underline"
          >
            Toutes mes absences &rarr;
          </Link>
        </div>

        {attendances.length === 0 ? (
          <div className="rounded-xl bg-[#d7f6ee]/40 p-6 text-center text-sm font-medium text-[#002b5b]">
            ✨ Aucune absence enregistrée. Bravo !
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
              {attendances.slice(0, 4).map((a) => {
                const subjectName =
                  a.subject?.name ||
                  a.teacher?.specialty ||
                  "Matière générale";
                const timeDisplay = a.time || "08h00 - 10h00";

                return (
                  <tr key={a.id}>
                    <Td className="font-semibold text-[#0c2340]">
                      {formatDate(a.date)}
                    </Td>
                    <Td className="text-xs font-semibold text-[#264c93]">
                      ⏱️ {timeDisplay}
                    </Td>
                    <Td className="font-bold text-[#0c2340]">
                      {subjectName}
                    </Td>
                    <Td>
                      {a.justified || a.status === "EXCUSED" ? (
                        <Badge tone="success">Justifiée</Badge>
                      ) : (
                        <Badge tone="danger">Non justifiée</Badge>
                      )}
                    </Td>
                    <Td className="text-xs">
                      {a.justified || a.status === "EXCUSED" ? (
                        <span className="font-semibold text-[#002b5b]">
                          📋 {a.reason || "Certificat médical validé"}
                        </span>
                      ) : (
                        <Link
                          href={`/s/${schoolId}/student/attendance`}
                          className="inline-flex items-center gap-1 font-semibold text-[#be123c] hover:underline"
                        >
                          <span>Déposer certificat &rarr;</span>
                        </Link>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
