import { notFound, redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { RegistrationFormClient } from "@/modules/forms/components/RegistrationFormClient";
import { getFormBySlug } from "@/modules/forms/db/queries";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { listPlayersForPicker } from "@/modules/players/db/queries";
import { listProgramNodes } from "@/modules/programs/db/queries";

export default async function OrgFormRegistrationPage({
  params
}: {
  params: Promise<{ orgSlug: string; formSlug: string }>;
}) {
  const { orgSlug, formSlug } = await params;
  const org = await getOrgPublicContext(orgSlug);
  const form = await getFormBySlug(org.orgId, formSlug, {
    includeDraft: false
  });

  if (!form) {
    notFound();
  }

  const user = await getSessionUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/${org.orgSlug}/register/${form.slug}`)}`);
  }

  const [players, programNodes] = await Promise.all([
    listPlayersForPicker(user.id),
    form.formKind === "program_registration" && form.programId ? listProgramNodes(form.programId) : Promise.resolve([])
  ]);

  return (
    <main className="app-container py-8 md:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader description={form.description ?? "Complete the form and submit registration."} title={form.name} />

        {form.formKind === "program_registration" && players.length === 0 ? (
          <Alert variant="info">No players found yet. Add one in the form below before submitting.</Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Registration form</CardTitle>
            <CardDescription>Signed in as {user.email ?? "your account"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <RegistrationFormClient form={form} formSlug={form.slug} orgSlug={org.orgSlug} players={players} programNodes={programNodes} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
