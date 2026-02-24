"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { saveFormDraftAction } from "@/modules/forms/actions";
import type { OrgForm } from "@/modules/forms/types";
import type { Program, ProgramNode } from "@/modules/programs/types";

type FormSettingsPanelProps = {
  orgSlug: string;
  form: OrgForm;
  programs: Program[];
  programNodes: ProgramNode[];
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

export function FormSettingsPanel({ orgSlug, form, programs, programNodes, canWrite = true }: FormSettingsPanelProps) {
  const { toast } = useToast();
  const [isSaving, startSaving] = useTransition();

  const [name, setName] = useState(form.name);
  const [slug, setSlug] = useState(form.slug);
  const [description, setDescription] = useState(form.description ?? "");
  const [formKind, setFormKind] = useState<"generic" | "program_registration">(form.formKind);
  const [status, setStatus] = useState<"draft" | "published" | "archived">(form.status);
  const [programId, setProgramId] = useState(form.programId ?? "");
  const [targetMode, setTargetMode] = useState<"locked" | "choice">(form.targetMode);
  const [lockedProgramNodeId, setLockedProgramNodeId] = useState(form.lockedProgramNodeId ?? "");
  const [allowMultiplePlayers, setAllowMultiplePlayers] = useState(Boolean(form.settingsJson.allowMultiplePlayers));

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Form settings</CardTitle>
          <CardDescription>Configure metadata, registration linkage, and publishing behavior.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label="Form name">
            <Input disabled={!canWrite} onChange={(event) => setName(event.target.value)} required value={name} />
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
              <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text md:col-span-2">
                <input
                  checked={allowMultiplePlayers}
                  disabled={!canWrite}
                  onChange={(event) => setAllowMultiplePlayers(event.target.checked)}
                  type="checkbox"
                />
                Allow multiple players per submission
              </label>
            </>
          ) : null}

          <FormField className="md:col-span-2" label="Description">
            <Textarea className="min-h-[90px]" disabled={!canWrite} onChange={(event) => setDescription(event.target.value)} value={description} />
          </FormField>

          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <Button disabled={isSaving || !canWrite} loading={isSaving} onClick={handleSaveDraft} type="button">
              {isSaving ? "Saving..." : "Save settings"}
            </Button>
            <Link className="text-sm font-semibold text-link hover:underline" href={`/${orgSlug}/register/${slug || form.slug}`}>
              Open public registration
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
