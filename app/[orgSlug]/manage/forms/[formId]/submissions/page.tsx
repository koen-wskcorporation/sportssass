import { notFound, redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";
import { FormSubmissionsPanel } from "@/modules/forms/components/FormSubmissionsPanel";
import { getFormById, listFormSubmissions } from "@/modules/forms/db/queries";

export default async function OrgManageFormSubmissionsPage({
  params
}: {
  params: Promise<{ orgSlug: string; formId: string }>;
}) {
  const { orgSlug, formId } = await params;
  const orgContext = await getOrgAuthContext(orgSlug);
  const canReadForms = can(orgContext.membershipPermissions, "forms.read") || can(orgContext.membershipPermissions, "forms.write");

  if (!canReadForms) {
    redirect("/forbidden");
  }

  const form = await getFormById(orgContext.orgId, formId);

  if (!form) {
    notFound();
  }

  const submissions = await listFormSubmissions(orgContext.orgId, form.id);
  const canWriteForms = can(orgContext.membershipPermissions, "forms.write");

  return (
    <div className="space-y-6">
      <PageHeader
        description="Triage submissions and move registrations through review statuses."
        showBorder={false}
        title={`${form.name} Submissions`}
      />
      {!canWriteForms ? <Alert variant="info">You have read-only access to submissions.</Alert> : null}
      <FormSubmissionsPanel canWrite={canWriteForms} formId={form.id} orgSlug={orgContext.orgSlug} submissions={submissions} />
    </div>
  );
}
