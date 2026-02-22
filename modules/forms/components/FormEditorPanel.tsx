"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { publishFormVersionAction, saveFormDraftAction } from "@/modules/forms/actions";
import type { OrgForm, OrgFormVersion } from "@/modules/forms/types";
import type { Program, ProgramNode } from "@/modules/programs/types";

type FormEditorPanelProps = {
  orgSlug: string;
  form: OrgForm;
  latestVersion: OrgFormVersion | null;
  programs: Program[];
  programNodes: ProgramNode[];
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function FormEditorPanel({ orgSlug, form, latestVersion, programs, programNodes }: FormEditorPanelProps) {
  const { toast } = useToast();
  const [isSaving, startSaving] = useTransition();
  const [isPublishing, startPublishing] = useTransition();
  const [latestPublishedVersionNumber, setLatestPublishedVersionNumber] = useState<number | null>(latestVersion?.versionNumber ?? null);

  const [name, setName] = useState(form.name);
  const [slug, setSlug] = useState(form.slug);
  const [description, setDescription] = useState(form.description ?? "");
  const [formKind, setFormKind] = useState<"generic" | "program_registration">(form.formKind);
  const [status, setStatus] = useState<"draft" | "published" | "archived">(form.status);
  const [programId, setProgramId] = useState(form.programId ?? "");
  const [targetMode, setTargetMode] = useState<"locked" | "choice">(form.targetMode);
  const [lockedProgramNodeId, setLockedProgramNodeId] = useState(form.lockedProgramNodeId ?? "");
  const [allowMultiplePlayers, setAllowMultiplePlayers] = useState(Boolean(form.settingsJson.allowMultiplePlayers));
  const [schemaJson, setSchemaJson] = useState(() => JSON.stringify(form.schemaJson, null, 2));

  function handleSaveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        description: "Select a locked division or subdivision.",
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
        schemaJson
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
        title: "Form saved",
        variant: "success"
      });
    });
  }

  function handlePublish() {
    startPublishing(async () => {
      const result = await publishFormVersionAction({
        orgSlug,
        formId: form.id
      });

      if (!result.ok) {
        toast({
          title: "Unable to publish form",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Form published",
        variant: "success"
      });
      setLatestPublishedVersionNumber((current) => (current === null ? 1 : current + 1));
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Form settings</CardTitle>
          <CardDescription>Configure registration linkage and publishing behavior.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSaveDraft}>
            <FormField label="Form name">
              <Input onChange={(event) => setName(event.target.value)} required value={name} />
            </FormField>
            <FormField label="Slug">
              <Input
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
                <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text md:col-span-2">
                  <input checked={allowMultiplePlayers} onChange={(event) => setAllowMultiplePlayers(event.target.checked)} type="checkbox" />
                  Allow multiple players per submission
                </label>
              </>
            ) : null}
            <FormField className="md:col-span-2" label="Description">
              <Textarea className="min-h-[90px]" onChange={(event) => setDescription(event.target.value)} value={description} />
            </FormField>

            <FormField className="md:col-span-2" hint="Use JSON schema with sections, fields, and rules." label="Schema JSON">
              <Textarea className="min-h-[320px] font-mono text-xs" onChange={(event) => setSchemaJson(event.target.value)} value={schemaJson} />
            </FormField>

            <div className="flex flex-wrap items-center gap-2 md:col-span-2">
              <Button disabled={isSaving} loading={isSaving} type="submit">
                {isSaving ? "Saving..." : "Save draft"}
              </Button>
              <Button disabled={isPublishing} loading={isPublishing} onClick={handlePublish} type="button" variant="secondary">
                {isPublishing ? "Publishing..." : "Publish new version"}
              </Button>
              <Link className="text-sm font-semibold text-link hover:underline" href={`/${orgSlug}/register/${slug || form.slug}`}>
                Open public registration
              </Link>
              <Link className="text-sm font-semibold text-link hover:underline" href={`/${orgSlug}/manage/forms/${form.id}/submissions`}>
                Open submissions
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version history</CardTitle>
          <CardDescription>Published snapshots are immutable for historical submissions.</CardDescription>
        </CardHeader>
        <CardContent>
          {latestPublishedVersionNumber !== null ? (
            <Alert variant="info">Latest published version: v{latestPublishedVersionNumber}</Alert>
          ) : (
            <Alert variant="warning">No published version yet.</Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
