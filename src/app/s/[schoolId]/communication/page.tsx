import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { broadcastMessageAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";

export default async function CommunicationPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  const [notifications, parentCount] = await Promise.all([
    prisma.notification.findMany({
      where: { schoolId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.membership.count({ where: { schoolId, role: "PARENT" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Communication"
        description={`${parentCount} compte(s) parent. Les messages apparaissent dans l'espace parent.`}
        actions={
          <Link
            href={`/s/${schoolId}/parents`}
            className="text-sm font-medium text-[#264c93] hover:underline"
          >
            Gérer les parents
          </Link>
        }
      />
      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        {notifications.length === 0 ? (
          <EmptyState message="Aucun message envoyé." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Destinataire</Th>
                <Th>Titre</Th>
                <Th>Lu</Th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id}>
                  <Td>{formatDate(n.createdAt)}</Td>
                  <Td>
                    {n.user.firstName} {n.user.lastName}
                  </Td>
                  <Td>
                    <div className="font-medium">{n.title}</div>
                    <div className="text-xs text-[#3d5278]">{n.message}</div>
                  </Td>
                  <Td>
                    <Badge tone={n.read ? "success" : "warning"}>
                      {n.read ? "Lu" : "Non lu"}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nouveau message</h2>
          <form
            action={broadcastMessageAction.bind(null, schoolId)}
            className="space-y-3"
          >
            <Field label="Destinataires">
              <Select name="audience" defaultValue="PARENT">
                <option value="PARENT">Parents</option>
                <option value="TEACHER">Enseignants</option>
                <option value="SCHOOL_ADMIN">Administrateurs</option>
                <option value="ALL">Tout le monde</option>
              </Select>
            </Field>
            <Field label="Titre">
              <Input name="title" required placeholder="Réunion parents" />
            </Field>
            <Field label="Message">
              <Input name="message" required placeholder="Vendredi 18h, salle 2" />
            </Field>
            <Button type="submit" className="w-full">
              Envoyer
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
