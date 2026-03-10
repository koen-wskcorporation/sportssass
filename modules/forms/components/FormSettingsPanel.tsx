"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { saveFormDraftAction } from "@/modules/forms/actions";
import { getFormSubmissionCap } from "@/modules/forms/settings";
import type { OrgForm } from "@/modules/forms/types";
import type { Program, ProgramNode } from "@/modules/programs/types";

type FormSettingsPanelProps = {
  orgSlug: string;
  form: OrgForm;
  programs: Program[];
  programNodes: ProgramNode[];
  submissionCount: number;
  canWrite?: boolean;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function FormSettingsPanel({ orgSlug, form, programs, programNodes, submissionCount, canWrite = true }: FormSettingsPanelProps) {
  const { toast } = useToast();
  const [isSaving, startSaving] = useTransition();
  const submissionCapDefaults = useMemo(() => getFormSubmissionCap(form), [form]);

  const [name, setName] = useState(form.name);
  const [slug, setSlug] = useState(form.slug);
  const [description, setDescription] = useState(form.description ?? "");
  const [formKind, setFormKind] = useState<"generic" | "program_registration">(form.formKind);
  const [status, setStatus] = useState<"draft" | "published" | "archived">(form.status);
  const [programId, setProgramId] = useState(form.programId ?? "");
  const [targetMode, setTargetMode] = useState<"locked" | "choice">(form.targetMode);
  const [lockedProgramNodeId, setLockedProgramNodeId] = useState(form.lockedProgramNodeId ?? "");
  const [allowMultiplePlayers, setAllowMultiplePlayers] = useState(Boolean(form.settingsJson.allowMultiplePlayers));
  const [requireSignIn, setRequireSignIn] = useState(form.settingsJson.requireSignIn !== false);
  const [submissionCapEnabled, setSubmissionCapEnabled] = useState(submissionCapDefaults.enabled);
  const [submissionCap, setSubmissionCap] = useState(submissionCapDefaults.cap ? String(submissionCapDefaults.cap) : "");
  const effectiveRequireSignIn = formKind === "program_registration" ? true : requireSignIn;
  const parsedSubmissionCap = submissionCap.trim().length > 0 ? Number.parseInt(submissionCap, 10) : null;
  const hasValidSubmissionCap = typeof parsedSubmissionCap === "number" && Number.isFinite(parsedSubmissionCap) && parsedSubmissionCap > 0;
  const normalizedSubmissionCap = hasValidSubmissionCap ? parsedSubmissionCap : null;
  const submissionCapRemaining = normalizedSubmissionCap !== null ? Math.max(normalizedSubmissionCap - submissionCount, 0) : null;
  const submissionCapReached = Boolean(
    formKind === "generic" && submissionCapEnabled && normalizedSubmissionCap !== null && submissionCount >= normalizedSubmissionCap
  );
  const registrationProgramName = useMemo(() => programs.find((program) => program.id === programId)?.name ?? null, [programs, programId]);

  useEffect(() => {
    if (formKind === "program_registration" && registrationProgramName) {
      setName(`${registrationProgramName} Registration`);
    }
  }, [formKind, registrationProgramName]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleSaveDraft();
  }

  function handleSaveDraft() {
    if (!canWrite) {
      return;
    }

    if (formKind === "program_registration" && !programId) {
      toast({
        title: "Program required",
        description: "Choose a program for registration forms.",
        variant: "destructive"
      });
      return;
    }

    if (targetMode === "locked" && !lockedProgramNodeId && formKind === "program_registration") {
      toast({
        title: "Locked target required",
        description: "Select a locked program structure node.",
        variant: "destructive"
      });
      return;
    }

    if (formKind === "generic" && submissionCapEnabled && !hasValidSubmissionCap) {
      toast({
        title: "Submission cap required",
        description: "Set a cap greater than 0 when cap mode is enabled.",
        variant: "destructive"
      });
      return;
    }

    startSaving(async () => {
      const result = await saveFormDraftAction({
        orgSlug,
        formId: form.id,
        slug: slug || slugify(name),
        name,
        description,
        formKind,
        status,
        programId: formKind === "program_registration" ? programId || null : null,
        targetMode,
        lockedProgramNodeId: targetMode === "locked" ? lockedProgramNodeId || null : null,
        allowMultiplePlayers,
        requireSignIn: effectiveRequireSignIn,
        submissionCapEnabled: formKind === "generic" ? submissionCapEnabled : false,
        submissionCap: formKind === "generic" ? normalizedSubmissionCap : null,
        schemaJson: JSON.stringify(form.schemaJson)
      });

      if (!result.ok) {
        toast({
          title: "Unable to save form",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Settings saved",
        variant: "success"
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Form settings</CardTitle>
            <CardDescription>Configure metadata, registration linkage, and publishing behavior.</CardDescription>
          </div>
          <Button disabled={isSaving || !canWrite} form="form-settings-form" loading={isSaving} type="submit">
            {isSaving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" id="form-settings-form" onSubmit={handleSubmit}>
          <FormField hint={formKind === "program_registration" ? "Auto-generated from the linked program." : undefined} label="Form name">
            <Input
              disabled={!canWrite || formKind === "program_registration"}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </FormField>
          <FormField label="Slug">
            <Input
              disabled={!canWrite}
              onChange={(event) => setSlug(slugify(event.target.value))}
              slugValidation={{
                kind: "form",
                orgSlug,
                currentSlug: form.slug
              }}
              value={slug}
            />
          </FormField>
          <FormField label="Kind">
            <Select
              disabled={!canWrite}
              onChange={(event) => setFormKind(event.target.value as "generic" | "program_registration")}
              options={[
                { value: "program_registration", label: "Program registration" },
                { value: "generic", label: "Generic" }
              ]}
              value={formKind}
            />
          </FormField>
          <FormField label="Status">
            <Select
              disabled={!canWrite}
              onChange={(event) => setStatus(event.target.value as "draft" | "published" | "archived")}
              options={[
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
                { value: "archived", label: "Archived" }
              ]}
              value={status}
            />
          </FormField>

          {formKind === "program_registration" ? (
            <>
              <FormField label="Program">
                <Select
                  disabled={!canWrite}
                  onChange={(event) => setProgramId(event.target.value)}
                  options={[
                    { value: "", label: "Select a program" },
                    ...programs.map((program) => ({ value: program.id, label: program.name }))
                  ]}
                  value={programId}
                />
              </FormField>
              <FormField label="Target mode">
                <Select
                  disabled={!canWrite}
                  onChange={(event) => setTargetMode(event.target.value as "locked" | "choice")}
                  options={[
                    { value: "choice", label: "Registrant chooses" },
                    { value: "locked", label: "Admin-locked" }
                  ]}
                  value={targetMode}
                />
              </FormField>
              {targetMode === "locked" ? (
                <FormField className="md:col-span-2" label="Locked target node">
                  <Select
                    disabled={!canWrite}
                    onChange={(event) => setLockedProgramNodeId(event.target.value)}
                    options={[
                      { value: "", label: "Select a target" },
                      ...programNodes.map((node) => ({
                        value: node.id,
                        label: `${node.name} (${node.nodeKind})`
                      }))
                    ]}
                    value={lockedProgramNodeId}
                  />
                </FormField>
              ) : null}
              <label className="ui-inline-toggle md:col-span-2">
                <Checkbox
                  checked={allowMultiplePlayers}
                  disabled={!canWrite}
                  onChange={(event) => setAllowMultiplePlayers(event.target.checked)}
                />
                Allow multiple players per submission
              </label>
            </>
          ) : null}

          <label className="ui-inline-toggle md:col-span-2">
            <Checkbox
              checked={effectiveRequireSignIn}
              disabled={!canWrite || formKind === "program_registration"}
              onChange={(event) => setRequireSignIn(event.target.checked)}
            />
            Require sign-in to submit
            {formKind === "program_registration" ? " (required for registration forms)" : ""}
          </label>

          {formKind === "generic" ? (
            <div className="space-y-3 rounded-control border bg-surface-muted px-4 py-4 md:col-span-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text">Submission cap</p>
                <p className="text-xs text-text-muted">
                  Current submissions: {submissionCount}
                  {normalizedSubmissionCap !== null ? ` of ${normalizedSubmissionCap}` : ""}
                  {submissionCapEnabled && submissionCapRemaining !== null ? ` (${submissionCapRemaining} remaining)` : ""}
                </p>
              </div>

              <label className="ui-inline-toggle">
                <Checkbox checked={submissionCapEnabled} disabled={!canWrite} onChange={(event) => setSubmissionCapEnabled(event.target.checked)} />
                Stop new submissions after a specific count
              </label>

              {submissionCapEnabled ? (
                <FormField hint="Users will be blocked once this many submissions are recorded." label="Maximum submissions">
                  <Input
                    disabled={!canWrite}
                    min={1}
                    onChange={(event) => setSubmissionCap(event.target.value)}
                    step={1}
                    type="number"
                    value={submissionCap}
                  />
                </FormField>
              ) : null}

              <Alert variant="info">Edit the submissions-closed message in Builder on the locked "Submissions closed" page.</Alert>

              {submissionCapReached ? (
                <Alert variant="warning">Submission cap is currently reached. Users now see the closed page before they can start the form.</Alert>
              ) : null}
            </div>
          ) : null}

          <FormField className="md:col-span-2" label="Description">
            <Textarea className="min-h-[90px]" disabled={!canWrite} onChange={(event) => setDescription(event.target.value)} value={description} />
          </FormField>
        </form>
      </CardContent>
    </Card>
  );
}
