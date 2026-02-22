import { notFound, redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";
import { ProgramEditorPanel } from "@/modules/programs/components/ProgramEditorPanel";
import { getProgramDetailsById } from "@/modules/programs/db/queries";

export default async function OrgManageProgramDetailPage({
  params
}: {
  params: Promise<{ orgSlug: string; programId: string }>;
}) {
  const { orgSlug, programId } = await params;
  const orgContext = await getOrgAuthContext(orgSlug);
  const canReadPrograms = can(orgContext.membershipPermissions, "programs.read") || can(orgContext.membershipPermissions, "programs.write");

  if (!canReadPrograms) {
    redirect("/forbidden");
  }

  const details = await getProgramDetailsById(orgContext.orgId, programId);

  if (!details) {
    notFound();
  }

  const canWritePrograms = can(orgContext.membershipPermissions, "programs.write");

  return (
    <div className="space-y-6">
      <PageHeader
        description="Edit hierarchy, schedule blocks, and publish state for this program."
        showBorder={false}
        title={details.program.name}
      />
      {!canWritePrograms ? <Alert variant="info">You have read-only access to this program.</Alert> : null}
      <ProgramEditorPanel data={details} orgSlug={orgContext.orgSlug} />
    </div>
  );
}
