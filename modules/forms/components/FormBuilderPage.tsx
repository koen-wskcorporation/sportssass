"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Eye, GripVertical, Redo2, Settings2, Trash2, Undo2 } from "lucide-react";
import { SortableCanvas, type SortableHandleProps } from "@/components/editor/SortableCanvas";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { publishFormAction, saveFormDraftAction } from "@/modules/forms/actions";
import { createDefaultField, listFormFieldPalette } from "@/modules/forms/fieldRegistry";
import { FormFieldInspector } from "@/modules/forms/components/FormFieldInspector";
import { useHistoryState } from "@/modules/forms/hooks/useHistoryState";
import type {
  FormBehaviorJson,
  FormDefinition,
  FormFieldDefinition,
  FormSchemaJson,
  FormThemeJson,
  FormUiJson,
  FormVersion,
  SponsorshipBehaviorMapping
} from "@/modules/forms/types";

type FormBuilderPageProps = {
  orgSlug: string;
  form: FormDefinition;
  latestPublishedVersion: FormVersion | null;
  canWrite: boolean;
};

type FormBuilderDraft = {
  slug: string;
  name: string;
  schemaJson: FormSchemaJson;
  uiJson: FormUiJson;
  themeJson: FormThemeJson;
  behaviorJson: FormBehaviorJson;
};

function createInitialDraft(form: FormDefinition): FormBuilderDraft {
  return {
    slug: form.slug,
    name: form.name,
    schemaJson: form.schemaJson,
    uiJson: form.uiJson,
    themeJson: form.themeJson,
    behaviorJson: form.behaviorJson
  };
}

function serializeDraft(draft: FormBuilderDraft) {
  return JSON.stringify(draft);
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function fieldSummaryLabel(field: FormFieldDefinition) {
  if (field.type === "heading" || field.type === "paragraph") {
    return field.label;
  }

  return field.placeholder || field.helpText || field.label;
}

function findFieldName(fields: FormFieldDefinition[], preferred: string[]) {
  const normalizedFields = fields.map((field) => ({
    field,
    name: field.name.trim().toLowerCase()
  }));

  for (const candidate of preferred) {
    const normalizedCandidate = candidate.trim().toLowerCase();
    const match = normalizedFields.find((item) => item.name === normalizedCandidate);

    if (match) {
      return match.field.name;
    }
  }

  return normalizedFields[0]?.field.name ?? "";
}

function createDefaultSponsorshipBehavior(fields: FormFieldDefinition[]): FormBehaviorJson {
  const mappableFields = fields.filter((field) => field.type !== "heading" && field.type !== "paragraph");

  return {
    type: "sponsorship_intake",
    mapping: {
      sponsorName: findFieldName(mappableFields, ["sponsor_name", "sponsor", "company_name", "name"]),
      websiteUrl: findFieldName(mappableFields, ["website_url", "website"]),
      tier: findFieldName(mappableFields, ["tier", "package_tier"]),
      logoAssetId: findFieldName(mappableFields, ["logo_upload", "logo", "logo_asset"])
    }
  };
}

function FormFieldCanvasCard({
  field,
  selected,
  canWrite,
  handleProps,
  onSelect,
  onRemove
}: {
  field: FormFieldDefinition;
  selected: boolean;
  canWrite: boolean;
  handleProps: SortableHandleProps;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <Card className={selected ? "border-accent" : undefined}>
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          {...handleProps.attributes}
          {...handleProps.listeners}
          className="inline-flex h-8 w-8 items-center justify-center rounded-control border bg-surface disabled:opacity-50"
          disabled={!canWrite}
          type="button"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-text">{field.label || field.type}</p>
        <span className="rounded-control border bg-surface-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-text-muted">{field.type}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={onSelect} size="sm" variant="secondary">
            <Settings2 className="h-4 w-4" />
            Edit
          </Button>
          {canWrite ? (
            <Button onClick={onRemove} size="sm" variant="ghost">
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <CardContent className="space-y-2 p-3">
        <p className="text-xs text-text-muted">{fieldSummaryLabel(field)}</p>
        {field.type !== "heading" && field.type !== "paragraph" ? (
          <p className="text-xs text-text-muted">
            Field name: <span className="font-mono">{field.name}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function FormBuilderPage({ orgSlug, form, latestPublishedVersion, canWrite }: FormBuilderPageProps) {
  const { toast } = useToast();
  const [isSaving, startSaving] = useTransition();
  const [isPublishing, startPublishing] = useTransition();
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(form.schemaJson.fields[0]?.id ?? null);
  const [lastSavedAt, setLastSavedAt] = useState(form.updatedAt);
  const [publishedVersion, setPublishedVersion] = useState(latestPublishedVersion?.versionNumber ?? null);
  const [definitionStatus, setDefinitionStatus] = useState(form.status);

  const initialDraft = useMemo(() => createInitialDraft(form), [form]);
  const { value: draft, set: setDraft, reset: resetDraft, undo, redo, canUndo, canRedo } = useHistoryState<FormBuilderDraft>(initialDraft);
  const [savedSnapshot, setSavedSnapshot] = useState(() => serializeDraft(initialDraft));
  const fields = draft.schemaJson.fields;

  useEffect(() => {
    const next = createInitialDraft(form);
    resetDraft(next);
    setSavedSnapshot(serializeDraft(next));
    setSelectedFieldId(next.schemaJson.fields[0]?.id ?? null);
    setLastSavedAt(form.updatedAt);
    setPublishedVersion(latestPublishedVersion?.versionNumber ?? null);
    setDefinitionStatus(form.status);
  }, [form, latestPublishedVersion, resetDraft]);

  useEffect(() => {
    if (fields.length === 0) {
      if (selectedFieldId !== null) {
        setSelectedFieldId(null);
      }
      return;
    }

    if (!selectedFieldId || !fields.some((field) => field.id === selectedFieldId)) {
      setSelectedFieldId(fields[0]?.id ?? null);
    }
  }, [fields, selectedFieldId]);

  const hasUnsavedChanges = useMemo(() => serializeDraft(draft) !== savedSnapshot, [draft, savedSnapshot]);

  const selectedField = useMemo(() => {
    if (!selectedFieldId) {
      return null;
    }

    return fields.find((field) => field.id === selectedFieldId) ?? null;
  }, [fields, selectedFieldId]);

  const palette = useMemo(() => listFormFieldPalette(), []);
  const layoutPalette = palette.filter((item) => item.group === "layout");
  const fieldPalette = palette.filter((item) => item.group === "field");
  const mappableFieldOptions = fields
    .filter((field) => field.type !== "heading" && field.type !== "paragraph")
    .map((field) => ({
      value: field.name,
      label: `${field.label} (${field.name})`
    }));

  function patchDraft(patch: Partial<FormBuilderDraft>) {
    setDraft((current) => ({
      ...current,
      ...patch
    }));
  }

  function patchFields(nextFields: FormFieldDefinition[]) {
    setDraft((current) => ({
      ...current,
      schemaJson: {
        ...current.schemaJson,
        fields: nextFields
      }
    }));
  }

  function patchSponsorshipMapping(mappingPatch: Partial<SponsorshipBehaviorMapping>) {
    if (draft.behaviorJson.type !== "sponsorship_intake") {
      return;
    }

    patchDraft({
      behaviorJson: {
        type: "sponsorship_intake",
        mapping: {
          ...draft.behaviorJson.mapping,
          ...mappingPatch
        }
      }
    });
  }

  async function persistDraft(nextDraft: FormBuilderDraft) {
    const result = await saveFormDraftAction({
      orgSlug,
      formId: form.id,
      slug: nextDraft.slug,
      name: nextDraft.name,
      schemaJson: nextDraft.schemaJson,
      uiJson: nextDraft.uiJson,
      themeJson: nextDraft.themeJson,
      behaviorJson: nextDraft.behaviorJson
    });

    if (!result.ok) {
      toast({
        title: "Unable to save draft",
        description: result.error,
        variant: "destructive"
      });
      return false;
    }

    setLastSavedAt(result.updatedAt);
    setSavedSnapshot(serializeDraft(nextDraft));
    return true;
  }

  function saveDraft() {
    if (!canWrite || isSaving || isPublishing) {
      return;
    }

    startSaving(async () => {
      const ok = await persistDraft(draft);

      if (!ok) {
        return;
      }

      toast({
        title: "Draft saved",
        variant: "success"
      });
    });
  }

  function publish() {
    if (!canWrite || isSaving || isPublishing) {
      return;
    }

    startPublishing(async () => {
      const saved = await persistDraft(draft);

      if (!saved) {
        return;
      }

      const result = await publishFormAction({
        orgSlug,
        formId: form.id
      });

      if (!result.ok) {
        toast({
          title: "Unable to publish",
          description: result.error,
          variant: "destructive"
        });
        return;
      }

      setPublishedVersion(result.versionNumber);
      setDefinitionStatus("published");
      toast({
        title: "Form published",
        description: `Version ${result.versionNumber} is now live.`,
        variant: "success"
      });
    });
  }

  function addField(type: FormFieldDefinition["type"]) {
    if (!canWrite) {
      return;
    }

    const nextField = createDefaultField(type);
    patchFields([...fields, nextField]);
    setSelectedFieldId(nextField.id);
  }

  function updateSelectedField(next: FormFieldDefinition) {
    patchFields(
      fields.map((field) => {
        if (field.id !== next.id) {
          return field;
        }

        return next;
      })
    );
  }

  function removeField(fieldId: string) {
    if (!canWrite) {
      return;
    }

    patchFields(fields.filter((field) => field.id !== fieldId));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={`/${orgSlug}/tools/forms/${form.id}/submissions`}>
              Submissions
            </Link>
            <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={`/${orgSlug}/forms/${draft.slug}`} target="_blank">
              <Eye className="h-4 w-4" />
              View public form
            </Link>
          </div>
        }
        description="Design your draft, manage field rules, and publish immutable versions."
        title="Form Builder"
      />

      {!canWrite ? <Alert variant="warning">Your role can view this form but cannot edit or publish.</Alert> : null}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-text">
              Status: <span className="capitalize">{definitionStatus}</span>
            </p>
            <p className="text-xs text-text-muted">
              Last saved: {formatTimestamp(lastSavedAt)} | Published version: {publishedVersion ? `v${publishedVersion}` : "Not published"}
            </p>
            {hasUnsavedChanges ? <p className="text-xs font-semibold text-accent">Unsaved changes</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={!canWrite || !canUndo || isSaving || isPublishing} onClick={undo} size="sm" variant="ghost">
              <Undo2 className="h-4 w-4" />
              Undo
            </Button>
            <Button disabled={!canWrite || !canRedo || isSaving || isPublishing} onClick={redo} size="sm" variant="ghost">
              <Redo2 className="h-4 w-4" />
              Redo
            </Button>
            <Button disabled={!canWrite || isSaving || isPublishing} onClick={saveDraft} size="sm" variant="secondary">
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button disabled={!canWrite || isSaving || isPublishing} onClick={publish} size="sm">
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Palette</CardTitle>
            <CardDescription>Add blocks to your form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Layout</p>
              <div className="grid gap-2">
                {layoutPalette.map((item) => (
                  <Button disabled={!canWrite} key={item.type} onClick={() => addField(item.type)} size="sm" variant="secondary">
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Fields</p>
              <div className="grid gap-2">
                {fieldPalette.map((item) => (
                  <Button disabled={!canWrite} key={item.type} onClick={() => addField(item.type)} size="sm" variant="secondary">
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Canvas</CardTitle>
            <CardDescription>Drag to reorder fields and sections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 ? <Alert>No fields yet. Add one from the palette.</Alert> : null}
            {fields.length > 0 ? (
              <SortableCanvas
                getId={(field) => field.id}
                items={fields}
                onReorder={(nextFields) => {
                  if (!canWrite) {
                    return;
                  }

                  patchFields(nextFields);
                }}
                renderItem={(field, meta) => (
                  <FormFieldCanvasCard
                    canWrite={canWrite}
                    field={field}
                    handleProps={meta.handleProps}
                    onRemove={() => removeField(field.id)}
                    onSelect={() => setSelectedFieldId(field.id)}
                    selected={field.id === selectedFieldId}
                  />
                )}
                renderOverlay={(field) => (
                  <Card className="w-[min(92vw,740px)] border-accent shadow-floating">
                    <CardContent className="p-3">
                      <p className="text-sm font-semibold text-text">{field.label}</p>
                      <p className="text-xs uppercase tracking-wide text-text-muted">{field.type}</p>
                    </CardContent>
                  </Card>
                )}
              />
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Name">
                <Input
                  disabled={!canWrite}
                  onChange={(event) => {
                    patchDraft({
                      name: event.target.value
                    });
                  }}
                  value={draft.name}
                />
              </FormField>

              <FormField hint="Used in the public route /[orgSlug]/forms/[slug]." label="Slug">
                <Input
                  disabled={!canWrite}
                  onChange={(event) => {
                    patchDraft({
                      slug: event.target.value
                    });
                  }}
                  value={draft.slug}
                />
              </FormField>

              <FormField label="Submit Button">
                <Input
                  disabled={!canWrite}
                  onChange={(event) => {
                    patchDraft({
                      uiJson: {
                        ...draft.uiJson,
                        submitLabel: event.target.value
                      }
                    });
                  }}
                  value={draft.uiJson.submitLabel}
                />
              </FormField>

              <FormField label="Success Message">
                <Textarea
                  className="min-h-[84px]"
                  disabled={!canWrite}
                  onChange={(event) => {
                    patchDraft({
                      uiJson: {
                        ...draft.uiJson,
                        successMessage: event.target.value
                      }
                    });
                  }}
                  value={draft.uiJson.successMessage}
                />
              </FormField>

              <FormField label="Honeypot Field Name">
                <Input
                  disabled={!canWrite}
                  onChange={(event) => {
                    patchDraft({
                      uiJson: {
                        ...draft.uiJson,
                        honeypotFieldName: event.target.value
                      }
                    });
                  }}
                  value={draft.uiJson.honeypotFieldName}
                />
              </FormField>

              <FormField label="Variant">
                <Select
                  disabled={!canWrite}
                  onChange={(event) => {
                    patchDraft({
                      themeJson: {
                        ...draft.themeJson,
                        variant: event.target.value === "compact" ? "compact" : "default"
                      }
                    });
                  }}
                  options={[
                    { label: "Default", value: "default" },
                    { label: "Compact", value: "compact" }
                  ]}
                  value={draft.themeJson.variant}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Behavior</CardTitle>
              <CardDescription>Configure post-submit automation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Workflow">
                <Select
                  disabled={!canWrite}
                  onChange={(event) => {
                    const nextType = event.target.value === "sponsorship_intake" ? "sponsorship_intake" : "none";

                    patchDraft({
                      behaviorJson: nextType === "sponsorship_intake" ? createDefaultSponsorshipBehavior(fields) : { type: "none" }
                    });
                  }}
                  options={[
                    { label: "None", value: "none" },
                    { label: "Sponsorship Intake", value: "sponsorship_intake" }
                  ]}
                  value={draft.behaviorJson.type}
                />
              </FormField>

              {draft.behaviorJson.type === "sponsorship_intake" ? (
                <div className="space-y-3">
                  <FormField label="Sponsor Name Field">
                    <Select
                      disabled={!canWrite}
                      onChange={(event) => {
                        patchSponsorshipMapping({
                          sponsorName: event.target.value
                        });
                      }}
                      options={mappableFieldOptions.length > 0 ? mappableFieldOptions : [{ label: "No fields available", value: "" }]}
                      value={draft.behaviorJson.mapping.sponsorName}
                    />
                  </FormField>

                  <FormField label="Website Field">
                    <Select
                      disabled={!canWrite}
                      onChange={(event) => {
                        patchSponsorshipMapping({
                          websiteUrl: event.target.value
                        });
                      }}
                      options={mappableFieldOptions.length > 0 ? mappableFieldOptions : [{ label: "No fields available", value: "" }]}
                      value={draft.behaviorJson.mapping.websiteUrl}
                    />
                  </FormField>

                  <FormField label="Tier Field">
                    <Select
                      disabled={!canWrite}
                      onChange={(event) => {
                        patchSponsorshipMapping({
                          tier: event.target.value
                        });
                      }}
                      options={mappableFieldOptions.length > 0 ? mappableFieldOptions : [{ label: "No fields available", value: "" }]}
                      value={draft.behaviorJson.mapping.tier}
                    />
                  </FormField>

                  <FormField label="Logo Field">
                    <Select
                      disabled={!canWrite}
                      onChange={(event) => {
                        patchSponsorshipMapping({
                          logoAssetId: event.target.value
                        });
                      }}
                      options={mappableFieldOptions.length > 0 ? mappableFieldOptions : [{ label: "No fields available", value: "" }]}
                      value={draft.behaviorJson.mapping.logoAssetId}
                    />
                  </FormField>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Field Inspector</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedField ? (
                canWrite ? (
                  <FormFieldInspector
                    field={selectedField}
                    fields={fields}
                    onChange={(nextField) => {
                      updateSelectedField(nextField);
                    }}
                  />
                ) : (
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-text">{selectedField.label}</p>
                    <p className="text-text-muted">Type: {selectedField.type}</p>
                    <p className="text-text-muted">Name: {selectedField.name}</p>
                  </div>
                )
              ) : (
                <p className="text-sm text-text-muted">Select a field in the canvas.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
