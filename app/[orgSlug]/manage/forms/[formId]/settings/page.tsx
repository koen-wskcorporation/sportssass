import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";
import { FormPageTabs } from "@/modules/forms/components/FormPageTabs";
import { FormSettingsPanel } from "@/modules/forms/components/FormSettingsPanel";
import { getFormById } from "@/modules/forms/db/queries";
import { listProgramNodes, listProgramsForManage } from "@/modules/programs/db/queries";

export const metadata: Metadata = {
  title: "Form Settings"
};

export default async function OrgManageFormSettingsPage({
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

  const [programs, programNodes] = await Promise.all([
    canAccessPrograms ? listProgramsForManage(orgContext.orgId) : Promise.resolve([]),
    canAccessPrograms && form.programId ? listProgramNodes(form.programId) : Promise.resolve([])
  ]);

  const canWriteForms = can(orgContext.membershipPermissions, "forms.write");

  return (
    <div className="space-y-6">
      <PageHeader description="Manage form metadata, registration linkage, and publishing behavior." showBorder={false} title={`${form.name} Settings`} />
      <FormPageTabs active="settings" formId={form.id} orgSlug={orgContext.orgSlug} />
      {!canWriteForms ? <Alert variant="info">You have read-only access to this form.</Alert> : null}
      <FormSettingsPanel
        canWrite={canWriteForms}
        form={form}
        orgSlug={orgContext.orgSlug}
        programNodes={programNodes}
        programs={programs}
      />
    </div>
  );
}
