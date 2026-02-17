import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { SponsorStatusBadge } from "@/modules/sponsors/components/status-badge";
import { getSponsorProfileDetail } from "@/modules/sponsors/db/queries";
import { updateSponsorProfileStatusAction } from "@/modules/sponsors/actions";
import type { OrgAuthContext } from "@/lib/org/types";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function toDisplayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === null || value === undefined) {
    return "-";
  }

  const text = String(value).trim();
  return text || "-";
}

type SponsorDetailPageProps = {
  orgContext: OrgAuthContext;
  profileId: string;
  statusUpdated?: boolean;
  errorCode?: string;
  canManage: boolean;
};

const sponsorErrorMessageByCode: Record<string, string> = {
  status_update_failed: "Unable to update sponsor status right now."
};

export async function SponsorDetailPage({ orgContext, profileId, statusUpdated = false, errorCode, canManage }: SponsorDetailPageProps) {
  const detail = await getSponsorProfileDetail(orgContext.orgId, profileId);

  if (!detail) {
    notFound();
  }

  const updateStatus = updateSponsorProfileStatusAction.bind(null, orgContext.orgSlug, detail.profile.id);
  const errorMessage = errorCode ? sponsorErrorMessageByCode[errorCode] : null;

  const answerLabelByFieldName = new Map(
    (detail.version?.snapshotJson.schema.fields ?? [])
      .filter((field) => field.type !== "heading" && field.type !== "paragraph")
      .map((field) => [field.name, field.label])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link className={buttonVariants({ variant: "ghost" })} href={`/${orgContext.orgSlug}/tools/sponsors/manage`}>
            Back to list
          </Link>
        }
        description={`Updated ${formatDate(detail.profile.updatedAt)}`}
        title={detail.profile.name}
      />

      {statusUpdated ? <Alert variant="success">Sponsor status updated.</Alert> : null}
      {errorMessage ? <Alert variant="destructive">{errorMessage}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Status and public directory metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Status">
              <SponsorStatusBadge status={detail.profile.status} />
            </FormField>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Sponsor Name">
                <Input readOnly value={detail.profile.name} />
              </FormField>
              <FormField label="Tier">
                <Input readOnly value={detail.profile.tier ?? "Not provided"} />
              </FormField>
              <FormField label="Website">
                <Input readOnly value={detail.profile.websiteUrl ?? "Not provided"} />
              </FormField>
              <FormField label="Submission ID">
                <Input readOnly value={detail.profile.submissionId ?? "No linked submission"} />
              </FormField>
            </div>

            {detail.profile.logoUrl ? (
              <FormField label="Logo">
                <a className={buttonVariants({ size: "sm", variant: "secondary" })} href={detail.profile.logoUrl} rel="noreferrer" target="_blank">
                  Open Logo
                </a>
              </FormField>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {canManage ? (
            <Card>
              <CardHeader>
                <CardTitle>Workflow Status</CardTitle>
                <CardDescription>Control approval and publish state for this sponsor profile.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={updateStatus} className="space-y-3">
                  <FormField label="Status">
                    <Select
                      defaultValue={detail.profile.status}
                      name="status"
                      options={[
                        { value: "draft", label: "Draft" },
                        { value: "pending", label: "Pending" },
                        { value: "approved", label: "Approved" },
                        { value: "published", label: "Published" }
                      ]}
                    />
                  </FormField>
                  <Button type="submit">Save Status</Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Read-only Access</CardTitle>
                <CardDescription>Your role can view sponsor profiles but cannot make changes.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Intake Submission</CardTitle>
          <CardDescription>Submission answers are rendered against the version snapshot used at submit time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!detail.submission ? <p className="text-sm text-text-muted">No submission linked to this profile.</p> : null}

          {detail.submission ? (
            <>
              <p className="text-xs text-text-muted">Submitted: {formatDate(detail.submission.createdAt)}</p>
              <p className="text-xs text-text-muted">Version: {detail.version ? `v${detail.version.versionNumber}` : "Unknown"}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(detail.submission.answersJson).map(([fieldName, value]) => (
                  <div className="space-y-1" key={fieldName}>
                    <p className="text-xs font-semibold text-text">{answerLabelByFieldName.get(fieldName) ?? fieldName}</p>
                    <p className="rounded-control border bg-surface-muted px-2 py-1 text-sm text-text">{toDisplayValue(value)}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
