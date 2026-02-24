"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createFormAction } from "@/modules/forms/actions";
import type { OrgForm } from "@/modules/forms/types";
import type { Program } from "@/modules/programs/types";

type FormsManagePanelProps = {
  orgSlug: string;
  forms: OrgForm[];
  programs: Program[];
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

export function FormsManagePanel({ orgSlug, forms, programs, canWrite = true }: FormsManagePanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [formKind, setFormKind] = useState<"generic" | "program_registration">("program_registration");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [programId, setProgramId] = useState("");
  const [targetMode, setTargetMode] = useState<"locked" | "choice">("choice");
  const [allowMultiplePlayers, setAllowMultiplePlayers] = useState(false);

  const sortedForms = useMemo(() => [...forms].sort((a, b) => a.name.localeCompare(b.name)), [forms]);

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

    startSaving(async () => {
      const result = await createFormAction({
        orgSlug,
        slug: slug || slugify(name),
        name,
        description,
        formKind,
        status,
        programId: programId || null,
        targetMode,
        lockedProgramNodeId: null,
        allowMultiplePlayers
      });

      if (!result.ok) {
        toast({
          title: "Unable to create form",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Form created",
        variant: "success"
      });
      setIsCreateOpen(false);
      setName("");
      setSlug("");
      setDescription("");
      setProgramId("");
      setAllowMultiplePlayers(false);
      setTargetMode("choice");
      setFormKind("program_registration");
      setStatus("draft");
      router.push(`/${orgSlug}/tools/forms/${result.data.formId}/editor`);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Forms</CardTitle>
            <Button disabled={!canWrite} onClick={() => setIsCreateOpen(true)} type="button">
              <Plus className="h-4 w-4" />
              Create form
            </Button>
          </div>
          <CardDescription>Open forms to edit schema, versions, and submissions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedForms.length === 0 ? <Alert variant="info">No forms yet.</Alert> : null}
          {sortedForms.map((form) => (
            <Link className="block rounded-control border bg-surface px-3 py-3 hover:bg-surface-muted" href={`/${orgSlug}/tools/forms/${form.id}/editor`} key={form.id}>
              <p className="font-semibold text-text">{form.name}</p>
              <p className="text-xs text-text-muted">
                {form.formKind === "program_registration" ? "Program registration" : "Generic"} · {form.status}
              </p>
              <p className="mt-1 text-sm text-text-muted">/{orgSlug}/register/{form.slug}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Panel
        footer={
          <>
            <Button onClick={() => setIsCreateOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={isSaving || !canWrite} form="create-form-form" loading={isSaving} type="submit">
              {isSaving ? "Saving..." : "Create form"}
            </Button>
          </>
        }
        onClose={() => setIsCreateOpen(false)}
        open={isCreateOpen}
        subtitle="Build generic forms and program registration forms."
        title="Create form"
      >
        <form className="grid gap-4 md:grid-cols-2" id="create-form-form" onSubmit={handleCreate}>
          <FormField label="Form name">
            <Input disabled={!canWrite} onChange={(event) => setName(event.target.value)} required value={name} />
          </FormField>
          <FormField label="Slug">
            <Input
              disabled={!canWrite}
              onChange={(event) => setSlug(slugify(event.target.value))}
              slugValidation={{
                kind: "form",
                orgSlug
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
              <FormField label="Targeting mode">
                <Select
                  disabled={!canWrite}
                  onChange={(event) => setTargetMode(event.target.value as "locked" | "choice")}
                  options={[
                    { value: "choice", label: "Registrant chooses" },
                    { value: "locked", label: "Admin-locked target" }
                  ]}
                  value={targetMode}
                />
              </FormField>
              <label className="inline-flex items-center gap-2 rounded-control border bg-surface px-3 py-2 text-sm text-text md:col-span-2">
                <input checked={allowMultiplePlayers} disabled={!canWrite} onChange={(event) => setAllowMultiplePlayers(event.target.checked)} type="checkbox" />
                Allow multiple players per submission
              </label>
            </>
          ) : null}
          <FormField className="md:col-span-2" label="Description">
            <Textarea className="min-h-[90px]" disabled={!canWrite} onChange={(event) => setDescription(event.target.value)} value={description} />
          </FormField>
        </form>
      </Panel>
    </div>
  );
}
