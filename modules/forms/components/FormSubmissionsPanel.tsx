"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { setSubmissionStatusAction } from "@/modules/forms/actions";
import type { FormKind, FormSubmissionWithEntries, SubmissionStatus } from "@/modules/forms/types";

type FormSubmissionsPanelProps = {
  orgSlug: string;
  formId: string;
  formKind: FormKind;
  submissions: FormSubmissionWithEntries[];
  canWrite?: boolean;
};

function asStatusOptions() {
  return [
    { value: "submitted", label: "Submitted" },
    { value: "in_review", label: "In review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "waitlisted", label: "Waitlisted" },
    { value: "cancelled", label: "Cancelled" }
  ];
}

export function FormSubmissionsPanel({ orgSlug, formId, formKind, submissions, canWrite = true }: FormSubmissionsPanelProps) {
  const { toast } = useToast();
  const [isSaving, startSaving] = useTransition();
  const [statusById, setStatusById] = useState<Record<string, SubmissionStatus>>(
    submissions.reduce<Record<string, SubmissionStatus>>((draft, submission) => {
      draft[submission.id] = submission.status;
      return draft;
    }, {})
  );

  function handleSave(submissionId: string) {
    const status = statusById[submissionId];

    startSaving(async () => {
      const result = await setSubmissionStatusAction({
        orgSlug,
        formId,
        submissionId,
        status
      });

      if (!result.ok) {
        toast({
          title: "Unable to update submission",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Submission updated",
        variant: "success"
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submissions</CardTitle>
        <CardDescription>Review and move registrations through your workflow.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {submissions.length === 0 ? <Alert variant="info">No submissions yet.</Alert> : null}
        {submissions.map((submission) => (
          <div className="space-y-2 rounded-control border bg-surface px-3 py-3" key={submission.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Chip className="normal-case tracking-normal" color="neutral">
                {submission.status}
              </Chip>
              <p className="text-xs text-text-muted">ID: {submission.id}</p>
              <p className="text-xs text-text-muted">Submitted: {new Date(submission.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[220px]">
                <Select
                  disabled={!canWrite}
                  onChange={(event) => setStatusById((current) => ({ ...current, [submission.id]: event.target.value as SubmissionStatus }))}
                  options={asStatusOptions()}
                  value={statusById[submission.id] ?? submission.status}
                />
              </div>
              <Button disabled={isSaving || !canWrite} onClick={() => handleSave(submission.id)} size="sm" type="button" variant="secondary">
                Save status
              </Button>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Submission answers</p>
              <pre className="overflow-x-auto rounded-control bg-surface-muted p-2 text-xs text-text-muted">{JSON.stringify(submission.answersJson, null, 2)}</pre>
            </div>

            {formKind === "program_registration" ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Per-player entries</p>
                {submission.entries.length === 0 ? <Alert variant="warning">No player entries on this registration.</Alert> : null}
                {submission.entries.map((entry) => (
                  <div className="rounded-control border bg-surface-muted p-2" key={entry.id}>
                    <p className="text-xs text-text-muted">Player ID: {entry.playerId}</p>
                    <p className="text-xs text-text-muted">Program node ID: {entry.programNodeId ?? "(none)"}</p>
                    <pre className="mt-1 overflow-x-auto rounded-control bg-surface p-2 text-xs text-text-muted">
                      {JSON.stringify(entry.answersJson, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
