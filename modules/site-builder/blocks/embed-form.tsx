"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listPublishedFormsForPickerAction } from "@/modules/forms/actions";
import { EmbeddedFormRuntime } from "@/modules/forms/components/EmbeddedFormRuntime";
import { asObject } from "@/modules/site-builder/blocks/helpers";
import type { BlockContext, BlockEditorProps, BlockRenderProps, EmbedFormBlockConfig } from "@/modules/site-builder/types";

function defaultEmbedFormConfig(): EmbedFormBlockConfig {
  return {
    formId: null,
    variant: "inline",
    titleOverride: null,
    successMessageOverride: null
  };
}

function asNullableText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

export function createDefaultEmbedFormConfig(_: BlockContext) {
  return defaultEmbedFormConfig();
}

export function sanitizeEmbedFormConfig(config: unknown, _: BlockContext): EmbedFormBlockConfig {
  const value = asObject(config);
  const formId = asNullableText(value.formId, 80);
  const variant = value.variant === "modal" ? "modal" : "inline";

  return {
    formId,
    variant,
    titleOverride: asNullableText(value.titleOverride, 180),
    successMessageOverride: asNullableText(value.successMessageOverride, 600)
  };
}

export function EmbedFormBlockRender({ block, context, runtimeData, isEditing }: BlockRenderProps<"embed_form">) {
  const form = block.config.formId ? runtimeData.publishedForms.find((candidate) => candidate.id === block.config.formId) ?? null : null;

  if (!form) {
    if (!isEditing) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Embedded Form</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">Choose a published form in block settings to render this section.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <EmbeddedFormRuntime
      form={form}
      orgSlug={context.orgSlug}
      successMessageOverride={block.config.successMessageOverride ?? undefined}
      titleOverride={block.config.titleOverride ?? undefined}
      variant={block.config.variant}
    />
  );
}

export function EmbedFormBlockEditor({ block, context, onChange }: BlockEditorProps<"embed_form">) {
  const [isLoading, startLoading] = useTransition();
  const [forms, setForms] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    startLoading(async () => {
      const result = await listPublishedFormsForPickerAction({
        orgSlug: context.orgSlug
      });

      if (!result.ok) {
        setLoadError(result.error);
        return;
      }

      setLoadError(null);
      setForms(result.forms);
    });
  }, [context.orgSlug, startLoading]);

  const formOptions = [{ value: "", label: forms.length === 0 ? "No published forms" : "Select a form" }, ...forms.map((form) => ({
    value: form.id,
    label: `${form.name} (${form.slug})`
  }))];

  return (
    <div className="space-y-4">
      {loadError ? <Alert variant="warning">{loadError}</Alert> : null}

      <FormField label="Published Form">
        <Select
          disabled={isLoading}
          onChange={(event) => {
            const formId = event.target.value.trim() || null;

            onChange({
              ...block,
              config: {
                ...block.config,
                formId
              }
            });
          }}
          options={formOptions}
          value={block.config.formId ?? ""}
        />
      </FormField>

      <FormField label="Render Variant">
        <Select
          onChange={(event) => {
            onChange({
              ...block,
              config: {
                ...block.config,
                variant: event.target.value === "modal" ? "modal" : "inline"
              }
            });
          }}
          options={[
            { value: "inline", label: "Inline" },
            { value: "modal", label: "Modal trigger" }
          ]}
          value={block.config.variant}
        />
      </FormField>

      <FormField hint="Optional override for title or button label." label="Title Override">
        <Input
          onChange={(event) => {
            const value = event.target.value.trim();

            onChange({
              ...block,
              config: {
                ...block.config,
                titleOverride: value || null
              }
            });
          }}
          value={block.config.titleOverride ?? ""}
        />
      </FormField>

      <FormField hint="Optional success message override for this embed instance." label="Success Message Override">
        <Textarea
          className="min-h-[88px]"
          onChange={(event) => {
            const value = event.target.value.trim();

            onChange({
              ...block,
              config: {
                ...block.config,
                successMessageOverride: value || null
              }
            });
          }}
          value={block.config.successMessageOverride ?? ""}
        />
      </FormField>
    </div>
  );
}
