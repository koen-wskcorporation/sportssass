import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import type { ResolvedOrgContext } from "@/lib/tenancy/types";
import { getSignedSponsorLogoUrl, getSponsorSubmission } from "@/modules/sponsors/db/queries";
import { SponsorStatusBadge } from "@/modules/sponsors/components/status-badge";
import { updateSponsorNotesAction, updateSponsorStatusAction, uploadSponsorAssetAction } from "@/modules/sponsors/actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

type SponsorDetailPageProps = {
  orgContext: ResolvedOrgContext;
  submissionId: string;
  statusUpdated?: boolean;
  notesSaved?: boolean;
  assetUploaded?: boolean;
  canManage: boolean;
};

export async function SponsorDetailPage({
  orgContext,
  submissionId,
  statusUpdated = false,
  notesSaved = false,
  assetUploaded = false,
  canManage
}: SponsorDetailPageProps) {
  const submission = await getSponsorSubmission(orgContext.orgId, submissionId);
  const logoUrl = submission.logo_path ? await getSignedSponsorLogoUrl(submission.logo_path) : null;

  const updateStatus = updateSponsorStatusAction.bind(null, orgContext.orgSlug, submission.id);
  const updateNotes = updateSponsorNotesAction.bind(null, orgContext.orgSlug, submission.id);
  const uploadAsset = uploadSponsorAssetAction.bind(null, orgContext.orgSlug, submission.id);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link className={buttonVariants({ variant: "ghost" })} href={`/app/o/${orgContext.orgSlug}/sponsors`}>
            Back to list
          </Link>
        }
        description={`Submitted ${formatDate(submission.created_at)}`}
        title={submission.company_name}
      />

      {statusUpdated ? <Alert variant="success">Status updated successfully.</Alert> : null}
      {notesSaved ? <Alert variant="success">Internal notes saved.</Alert> : null}
      {assetUploaded ? <Alert variant="success">Asset uploaded successfully.</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Submission Details</CardTitle>
            <CardDescription>Contact information and sponsorship intent details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Current Status">
              <SponsorStatusBadge status={submission.status} />
            </FormField>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Contact Name">
                <Input readOnly value={submission.contact_name} />
              </FormField>
              <FormField label="Contact Email">
                <Input readOnly value={submission.contact_email} />
              </FormField>
              <FormField label="Phone">
                <Input readOnly value={submission.contact_phone ?? "Not provided"} />
              </FormField>
              <FormField label="Website">
                <Input readOnly value={submission.website ?? "Not provided"} />
              </FormField>
            </div>

            <FormField label="Message">
              <Textarea readOnly value={submission.message ?? "No message provided."} />
            </FormField>

            {logoUrl ? (
              <FormField hint="Uploaded logo asset" label="Logo">
                <a className={buttonVariants({ size: "sm", variant: "secondary" })} href={logoUrl} rel="noreferrer" target="_blank">
                  Open Logo
                </a>
              </FormField>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {canManage ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Update Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={updateStatus} className="space-y-3">
                    <FormField label="Submission Status">
                      <Select
                        defaultValue={submission.status}
                        name="status"
                        options={[
                          { label: "Submitted", value: "submitted" },
                          { label: "Approved", value: "approved" },
                          { label: "Rejected", value: "rejected" },
                          { label: "Paid", value: "paid" }
                        ]}
                      />
                    </FormField>
                    <Button type="submit">Save Status</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Internal Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={updateNotes} className="space-y-3">
                    <FormField hint="Only visible to staff users." label="Notes">
                      <Textarea defaultValue={submission.internal_notes ?? ""} name="internalNotes" />
                    </FormField>
                    <Button type="submit" variant="secondary">
                      Save Notes
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upload Asset</CardTitle>
                  <CardDescription>Attach or replace the sponsor logo/file for this submission.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={uploadAsset} className="space-y-3">
                    <FormField hint="PNG, JPG, or SVG" label="File">
                      <Input accept=".png,.jpg,.jpeg,.svg" name="logo" required type="file" />
                    </FormField>
                    <Button type="submit" variant="secondary">
                      Upload File
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Read-only Access</CardTitle>
                <CardDescription>Your role can review this submission but cannot make changes.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
