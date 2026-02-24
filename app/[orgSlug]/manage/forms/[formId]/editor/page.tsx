import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { can } from "@/lib/permissions/can";
import { FormEditorPanel } from "@/modules/forms/components/FormEditorPanel";
import { FormPageTabs } from "@/modules/forms/components/FormPageTabs";
import { FormPublishToggleButton } from "@/modules/forms/components/FormPublishToggleButton";
import { getFormById } from "@/modules/forms/db/queries";

export const metadata: Metadata = {
  title: "Form Builder"
};

export default async function OrgManageFormEditorPage({
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

  const canWriteForms = can(orgContext.membershipPermissions, "forms.write");
  const statusLabel = form.status === "published" ? "Published" : "Not published";
  const statusVariant = form.status === "published" ? "success" : "warning";
  const statusClassName =
    form.status === "published"
      ? "border border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
      : "border border-amber-700/40 bg-amber-300 text-amber-950";

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgContext.orgSlug}/tools/forms`}>
              Back to forms
            </Link>
            <FormPublishToggleButton canWrite={canWriteForms} form={form} orgSlug={orgContext.orgSlug} />
          </>
        }
        description="Build fields visually, preview output, and publish immutable versions."
        showBorder={false}
        title={
          <span className="inline-flex items-center gap-3">
            <span>{form.name}</span>
            <Badge className={statusClassName} variant={statusVariant}>
              {statusLabel}
            </Badge>
          </span>
        }
      />
      <FormPageTabs active="builder" formId={form.id} orgSlug={orgContext.orgSlug} />
      {!canWriteForms ? <Alert variant="info">You have read-only access to this form.</Alert> : null}
      <FormEditorPanel canWrite={canWriteForms} form={form} orgSlug={orgContext.orgSlug} />
    </div>
  );
}
