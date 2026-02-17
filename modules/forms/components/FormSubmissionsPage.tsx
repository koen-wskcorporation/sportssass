import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FormDefinition, FormSubmission, FormVersion } from "@/modules/forms/types";

type FormSwitcherItem = {
  id: string;
  name: string;
};

type FormSubmissionsPageProps = {
  orgSlug: string;
  form: FormDefinition;
  forms: FormSwitcherItem[];
  submissions: FormSubmission[];
  versionsById: Record<string, FormVersion>;
  selectedStatus: "all" | "submitted" | "reviewed" | "archived";
  selectedSubmissionId: string | null;
};

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

function formFieldLabelMap(version: FormVersion | null) {
  const map = new Map<string, string>();

  if (!version) {
    return map;
  }

  for (const field of version.snapshotJson.schema.fields) {
    if (field.type === "heading" || field.type === "paragraph") {
      continue;
    }

    map.set(field.name, field.label);
  }

  return map;
}

export function FormSubmissionsPage({
  orgSlug,
  form,
  forms,
  submissions,
  versionsById,
  selectedStatus,
  selectedSubmissionId
}: FormSubmissionsPageProps) {
  const selectedSubmission = selectedSubmissionId ? submissions.find((submission) => submission.id === selectedSubmissionId) ?? null : null;
  const selectedVersion = selectedSubmission ? versionsById[selectedSubmission.versionId] ?? null : null;
  const selectedFieldLabels = formFieldLabelMap(selectedVersion);

  const statusFilters: Array<{ value: FormSubmissionsPageProps["selectedStatus"]; label: string }> = [
    { value: "all", label: "All" },
    { value: "submitted", label: "Submitted" },
    { value: "reviewed", label: "Reviewed" },
    { value: "archived", label: "Archived" }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={`/${orgSlug}/tools/forms/${form.id}/edit`}>
              Edit Form
            </Link>
            <a
              className={buttonVariants({ size: "sm", variant: "secondary" })}
              href={`/${orgSlug}/tools/forms/${form.id}/submissions/export?status=${selectedStatus}`}
            >
              Export CSV
            </a>
          </div>
        }
        description="Review submissions and inspect answers against each version snapshot."
        title={`${form.name} Submissions`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Switch forms and refine this inbox by status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {forms.map((item) => (
              <Link
                className={buttonVariants({
                  size: "sm",
                  variant: item.id === form.id ? "primary" : "ghost"
                })}
                href={`/${orgSlug}/tools/forms/${item.id}/submissions`}
                key={item.id}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <Link
                className={buttonVariants({
                  size: "sm",
                  variant: selectedStatus === filter.value ? "secondary" : "ghost"
                })}
                href={`/${orgSlug}/tools/forms/${form.id}/submissions?status=${filter.value}`}
                key={filter.value}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-8 text-center text-text-muted" colSpan={4}>
                      No submissions for this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((submission) => {
                    const version = versionsById[submission.versionId] ?? null;

                    return (
                      <TableRow key={submission.id}>
                        <TableCell>{formatDate(submission.createdAt)}</TableCell>
                        <TableCell>{submission.status}</TableCell>
                        <TableCell>{version ? `v${version.versionNumber}` : "Unknown"}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            className={buttonVariants({ size: "sm", variant: selectedSubmissionId === submission.id ? "secondary" : "ghost" })}
                            href={`/${orgSlug}/tools/forms/${form.id}/submissions?status=${selectedStatus}&submission=${submission.id}`}
                          >
                            View
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission Detail</CardTitle>
            <CardDescription>Answers are labeled from the published version that received this submission.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedSubmission ? <Alert>Select a submission to inspect answers.</Alert> : null}

            {selectedSubmission ? (
              <>
                <p className="text-xs text-text-muted">
                  ID: <span className="font-mono">{selectedSubmission.id}</span>
                </p>
                <p className="text-xs text-text-muted">Submitted: {formatDate(selectedSubmission.createdAt)}</p>
                <p className="text-xs text-text-muted">
                  Version: {selectedVersion ? `v${selectedVersion.versionNumber}` : "Unknown snapshot"}
                </p>
                <div className="space-y-2 border-t pt-3">
                  {Object.entries(selectedSubmission.answersJson).map(([key, value]) => (
                    <div className="space-y-1" key={key}>
                      <p className="text-xs font-semibold text-text">{selectedFieldLabels.get(key) ?? key}</p>
                      <p className="rounded-control border bg-surface-muted px-2 py-1 text-sm text-text">{toDisplayValue(value)}</p>
                    </div>
                  ))}
                  {Object.keys(selectedSubmission.answersJson).length === 0 ? <p className="text-sm text-text-muted">No answer payload.</p> : null}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
