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

export default async function ParentNotificationsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { user } = await requireSchoolAccess(schoolId);

  const notifications = await prisma.notification.findMany({
    where: { schoolId, userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Alertes notes, absences et paiements."
        actions={
          <form action={markAllNotificationsReadAction.bind(null, schoolId)}>
            <Button type="submit" variant="secondary">
              Tout marquer comme lu
            </Button>
          </form>
        }
      />
      {notifications.length === 0 ? (
        <EmptyState message="Aucune notification." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Type</Th>
              <Th>Titre</Th>
              <Th>Message</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((n) => (
              <tr key={n.id}>
                <Td>{formatDate(n.createdAt)}</Td>
                <Td>{n.type}</Td>
                <Td className="font-medium">
                  {n.title}{" "}
                  {!n.read ? <Badge tone="info">Nouveau</Badge> : null}
                </Td>
                <Td>{n.message}</Td>
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
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        Marquer lu
                      </button>
                    </form>
                  ) : null}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
