import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";
import { listFormsForManage } from "@/modules/forms/db/queries";
import { ProgramEditorPanel } from "@/modules/programs/components/ProgramEditorPanel";
import { ProgramPublishToggleButton } from "@/modules/programs/components/ProgramPublishToggleButton";
import { getProgramDetailsById } from "@/modules/programs/db/queries";

export const metadata: Metadata = {
  title: "Program Editor"
};

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
  const canReadForms = can(orgContext.membershipPermissions, "forms.read") || can(orgContext.membershipPermissions, "forms.write");
  const canWriteForms = can(orgContext.membershipPermissions, "forms.write");
  const forms = canReadForms ? await listFormsForManage(orgContext.orgId) : [];
  const statusLabel = details.program.status === "published" ? "Published" : "Not published";
  const statusVariant = details.program.status === "published" ? "success" : "warning";
  const statusClassName =
    details.program.status === "published"
      ? "border border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
      : "border border-amber-700/40 bg-amber-300 text-amber-950";

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgContext.orgSlug}/tools/programs`}>
              Back to programs
            </Link>
            <ProgramPublishToggleButton canWrite={canWritePrograms} orgSlug={orgContext.orgSlug} program={details.program} />
          </>
        }
        description="Edit hierarchy, schedule blocks, and publish state for this program."
        showBorder={false}
        title={
          <span className="inline-flex items-center gap-3">
            <span>{details.program.name}</span>
            <Badge className={statusClassName} variant={statusVariant}>
              {statusLabel}
            </Badge>
          </span>
        }
      />
      {!canWritePrograms ? <Alert variant="info">You have read-only access to this program.</Alert> : null}
      <ProgramEditorPanel canReadForms={canReadForms} canWriteForms={canWriteForms} data={details} forms={forms} orgSlug={orgContext.orgSlug} />
    </div>
  );
}
