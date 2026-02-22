import { notFound, redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";
import { FormEditorPanel } from "@/modules/forms/components/FormEditorPanel";
import { getFormById, getLatestFormVersion } from "@/modules/forms/db/queries";
import { listProgramNodes, listProgramsForManage } from "@/modules/programs/db/queries";

export default async function OrgManageFormDetailPage({
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

  const canAccessPrograms = can(orgContext.membershipPermissions, "programs.read") || can(orgContext.membershipPermissions, "programs.write");

  const [latestVersion, programs, programNodes] = await Promise.all([
    getLatestFormVersion(form.id),
    canAccessPrograms ? listProgramsForManage(orgContext.orgId) : Promise.resolve([]),
    canAccessPrograms && form.programId ? listProgramNodes(form.programId) : Promise.resolve([])
  ]);

  const canWriteForms = can(orgContext.membershipPermissions, "forms.write");

  return (
    <div className="space-y-6">
      <PageHeader
        description="Configure schema rules, registration linkage, and publish immutable versions."
        showBorder={false}
        title={form.name}
      />
      {!canWriteForms ? <Alert variant="info">You have read-only access to this form.</Alert> : null}
      <FormEditorPanel form={form} latestVersion={latestVersion} orgSlug={orgContext.orgSlug} programNodes={programNodes} programs={programs} />
    </div>
  );
}
