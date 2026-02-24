"use client";

import Link from "next/link";
import { ExternalLink, Eye, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { saveFormDraftAction } from "@/modules/forms/actions";
import { FormFieldsVisualEditor } from "@/modules/forms/components/FormFieldsVisualEditor";
import type { FormSchema, OrgForm } from "@/modules/forms/types";
import type { ProgramNode } from "@/modules/programs/types";

type FormEditorPanelProps = {
  orgSlug: string;
  form: OrgForm;
  programNodes: ProgramNode[];
  canWrite?: boolean;
};

export function FormEditorPanel({ orgSlug, form, programNodes, canWrite = true }: FormEditorPanelProps) {
  const { toast } = useToast();
  const [isSaving, startSaving] = useTransition();
  const [builderView, setBuilderView] = useState<"editor" | "preview">("editor");
  const [formSchema, setFormSchema] = useState<FormSchema>(form.schemaJson);

  function handleSaveDraft() {
    if (!canWrite) {
      return;
    }

    startSaving(async () => {
      const schemaPayload: FormSchema = {
        ...formSchema,
        title: form.name,
        description: form.description
      };

      const result = await saveFormDraftAction({
        orgSlug,
        formId: form.id,
        slug: form.slug,
        name: form.name,
        description: form.description ?? "",
        formKind: form.formKind,
        status: form.status,
        programId: form.programId,
        targetMode: form.targetMode,
        lockedProgramNodeId: form.lockedProgramNodeId,
        allowMultiplePlayers: Boolean(form.settingsJson.allowMultiplePlayers),
        schemaJson: JSON.stringify(schemaPayload)
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Form Editor</CardTitle>
              <CardDescription>Build and preview your form pages and fields visually.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link className={buttonVariants({ variant: "secondary" })} href={`/${orgSlug}/register/${form.slug}`} rel="noopener noreferrer" target="_blank">
                <ExternalLink className="h-4 w-4" />
                Open Public Form
              </Link>
              <Button onClick={() => setBuilderView((current) => (current === "editor" ? "preview" : "editor"))} type="button" variant="secondary">
                {builderView === "editor" ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {builderView === "editor" ? "Live preview" : "Editor"}
              </Button>
              <Button disabled={isSaving || !canWrite} loading={isSaving} onClick={handleSaveDraft} type="button">
                {isSaving ? "Saving..." : "Save draft"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <FormFieldsVisualEditor
            disabled={isSaving || !canWrite}
            formDescription={form.description ?? ""}
            formKind={form.formKind}
            formName={form.name}
            onChange={setFormSchema}
            programNodes={programNodes}
            schema={formSchema}
            view={builderView}
          />
        </CardContent>
      </Card>
    </div>
  );
}
