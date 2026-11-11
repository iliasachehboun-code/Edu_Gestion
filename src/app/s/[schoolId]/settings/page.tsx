import Link from "next/link";
import { requireSchoolAccess } from "@/lib/auth";
import { updateSchoolAction } from "@/app/actions/schools";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { school } = await requireSchoolAccess(schoolId, ["SCHOOL_ADMIN"]);

  return (
    <div>
      <PageHeader
        title="Paramètres de l'établissement"
        description="Identité de l'école, années scolaires et accès liés."
        actions={
          <Link
            href={`/s/${schoolId}/years`}
            className="text-sm font-medium text-brand hover:underline"
          >
            Années scolaires
          </Link>
        }
      />
      <Card className="max-w-xl">
        <form
          action={updateSchoolAction.bind(null, schoolId)}
          className="space-y-3"
        >
          <Field label="Nom">
            <Input name="name" defaultValue={school.name} required />
          </Field>
          <Field label="Email">
            <Input
              name="email"
              type="email"
              defaultValue={school.email || ""}
            />
          </Field>
          <Field label="Téléphone">
            <Input name="phone" defaultValue={school.phone || ""} />
          </Field>
          <Field label="Adresse">
            <Input name="address" defaultValue={school.address || ""} />
          </Field>
          <Button type="submit">Enregistrer</Button>
        </form>
      </Card>
    </div>
  );
}
