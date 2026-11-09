import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/ui";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import { formatDate } from "@/lib/utils";

export default async function StudentNotificationsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { user } = await requireSchoolAccess(schoolId, ["STUDENT", "SCHOOL_ADMIN"]);

  const notifications = await prisma.notification.findMany({
    where: { schoolId, userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes notifications"
        description="Alertes sur vos nouvelles notes, modifications d'emploi du temps et messages de l'école."
        actions={
          notifications.length > 0 ? (
            <form action={markAllNotificationsReadAction.bind(null, schoolId)}>
              <Button type="submit" variant="secondary">
                Tout marquer comme lu
              </Button>
            </form>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <EmptyState message="Vous n'avez aucune notification pour le moment." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Catégorie</Th>
              <Th>Titre</Th>
              <Th>Message</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((n) => (
              <tr key={n.id} className={!n.read ? "bg-[#f4f8fc]/60 font-medium" : ""}>
                <Td className="text-xs text-[#3d5278]">{formatDate(n.createdAt)}</Td>
                <Td>
                  <span className="rounded-lg bg-[#e4ecf8] px-2 py-0.5 text-xs font-semibold text-[#264c93]">
                    {n.type === "GRADE"
                      ? "Note"
                      : n.type === "SCHEDULE"
                        ? "Planning"
                        : n.type === "ATTENDANCE"
                          ? "Présence"
                          : "Général"}
                  </span>
                </Td>
                <Td className="font-semibold text-[#0c2340]">
                  <div className="flex items-center gap-2">
                    {n.title}
                    {!n.read ? <Badge tone="info">Nouveau</Badge> : null}
                  </div>
                </Td>
                <Td className="text-sm text-[#3d5278]">{n.message}</Td>
                <Td>
                  {!n.read ? (
                    <form
                      action={async () => {
                        "use server";
                        await markNotificationReadAction(schoolId, n.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs font-semibold text-[#264c93] hover:underline"
                      >
                        Marquer comme lu
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-[#8a9bb5]">Lu</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
