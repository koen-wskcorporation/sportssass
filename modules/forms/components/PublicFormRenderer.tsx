"use client";

import { useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { AssetTile } from "@/components/ui/asset-tile";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildNormalizedFieldAnswers, extractSubmissionInputFromFormData, getVisibleFields, type SubmissionInput } from "@/modules/forms/logic";
import type { FormFieldDefinition, PublishedFormRuntime } from "@/modules/forms/types";

type PublicFormRendererProps = {
  orgSlug: string;
  form: PublishedFormRuntime;
  titleOverride?: string | null;
  successMessageOverride?: string | null;
  hideTitle?: boolean;
};

type FileMeta = {
  size: number;
  mime: string;
};

function fieldName(field: FormFieldDefinition) {
  return field.name;
}

function renderOptions(field: FormFieldDefinition) {
  return field.options ?? [];
}

export function PublicFormRenderer({ orgSlug, form, titleOverride, successMessageOverride, hideTitle = false }: PublicFormRendererProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draftInput, setDraftInput] = useState<SubmissionInput>({});
  const [fileMetaByFieldName, setFileMetaByFieldName] = useState<Record<string, FileMeta | null>>({});

  const visibleFieldIds = useMemo(() => {
    const normalized = buildNormalizedFieldAnswers(form.snapshot.schema.fields, draftInput);
    return new Set(getVisibleFields(form.snapshot.schema.fields, normalized).map((field) => field.id));
  }, [draftInput, form.snapshot.schema.fields]);

  function refreshDraftInput() {
    const formElement = formRef.current;

    if (!formElement) {
      return;
    }

    const nextInput = extractSubmissionInputFromFormData(new FormData(formElement));
    setDraftInput(nextInput);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formRef.current || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      const body = new FormData(formRef.current);
      const response = await fetch(`/${orgSlug}/forms/${form.slug}/submit`, {
        method: "POST",
        body
      });

      const result = (await response.json().catch(() => null)) as
        | {
            ok: boolean;
            error?: string;
            errors?: Record<string, string>;
            message?: string;
          }
        | null;

      if (!response.ok || !result?.ok) {
        setSubmitError(result?.error ?? "Unable to submit right now. Please try again.");
        setFieldErrors(result?.errors ?? {});
        return;
      }

      setIsSuccess(true);
      setSubmitError(null);
      setFieldErrors({});
      setDraftInput({});
      setFileMetaByFieldName({});
      formRef.current.reset();
    } catch {
      setSubmitError("Unable to submit right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const successMessage = successMessageOverride?.trim() || form.snapshot.ui.successMessage;

  return (
    <div className="space-y-4">
      {!hideTitle ? <h2 className="text-2xl font-semibold text-text">{titleOverride?.trim() || form.name}</h2> : null}

      {isSuccess ? <Alert variant="success">{successMessage}</Alert> : null}
      {submitError ? <Alert variant="destructive">{submitError}</Alert> : null}

      <form
        className="space-y-4"
        onChange={refreshDraftInput}
        onSubmit={handleSubmit}
        ref={(element) => {
          formRef.current = element;
        }}
      >
        <input
          autoComplete="off"
          className="hidden"
          name={form.snapshot.ui.honeypotFieldName}
          tabIndex={-1}
          type="text"
          value={typeof draftInput[form.snapshot.ui.honeypotFieldName] === "string" ? String(draftInput[form.snapshot.ui.honeypotFieldName]) : ""}
          onChange={(event) => {
            setDraftInput((current) => ({
              ...current,
              [form.snapshot.ui.honeypotFieldName]: event.target.value
            }));
          }}
        />

        {form.snapshot.schema.fields.map((field) => {
          if (!visibleFieldIds.has(field.id)) {
            return null;
          }

          const inputName = fieldName(field);
          const error = fieldErrors[field.id];

          if (field.type === "heading") {
            return (
              <h3 className="text-xl font-semibold text-text" key={field.id}>
                {field.label}
              </h3>
            );
          }

          if (field.type === "paragraph") {
            return (
              <p className="text-sm text-text-muted" key={field.id}>
                {field.label}
              </p>
            );
          }

          if (field.type === "textarea") {
            return (
              <FormField error={error} hint={field.helpText} key={field.id} label={field.label}>
                <Textarea
                  defaultValue={field.defaultValue}
                  maxLength={field.validation?.maxLength}
                  name={inputName}
                  placeholder={field.placeholder}
                  required={Boolean(field.validation?.required)}
                />
              </FormField>
            );
          }

          if (field.type === "select") {
            const options = renderOptions(field);

            return (
              <FormField error={error} hint={field.helpText} key={field.id} label={field.label}>
                <select
                  className="flex h-10 w-full rounded-control border bg-surface px-3 py-2 text-sm text-text"
                  defaultValue={field.defaultValue ?? ""}
                  name={inputName}
                  required={Boolean(field.validation?.required)}
                >
                  <option value="">Select...</option>
                  {options.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
            );
          }

          if (field.type === "radio") {
            const options = renderOptions(field);

            return (
              <FormField error={error} hint={field.helpText} key={field.id} label={field.label}>
                <div className="space-y-2">
                  {options.map((option) => (
                    <label className="flex items-center gap-2 text-sm" key={option.id}>
                      <input name={inputName} type="radio" value={option.value} />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </FormField>
            );
          }

          if (field.type === "checkbox") {
            return (
              <FormField error={error} hint={field.helpText} key={field.id} label={field.label}>
                <label className="flex items-center gap-2 text-sm">
                  <input name={inputName} type="checkbox" value="1" />
                  <span>{field.placeholder || field.label}</span>
                </label>
              </FormField>
            );
          }

          if (field.type === "multiCheckbox") {
            const options = renderOptions(field);

            return (
              <FormField error={error} hint={field.helpText} key={field.id} label={field.label}>
                <div className="space-y-2">
                  {options.map((option) => (
                    <label className="flex items-center gap-2 text-sm" key={option.id}>
                      <input name={inputName} type="checkbox" value={option.value} />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </FormField>
            );
          }

          if (field.type === "fileUpload") {
            const meta = fileMetaByFieldName[inputName];

            return (
              <FormField error={error} hint={field.helpText} key={field.id} label={field.label}>
                <AssetTile
                  constraints={{
                    accept: field.validation?.allowedFileTypes?.join(",") || undefined,
                    maxSizeMB: field.validation?.maxFileSizeMB,
                    aspect: "free"
                  }}
                  kind="public-org"
                  name={inputName}
                  orgSlug={orgSlug}
                  purpose="form-file"
                  title={field.label}
                  onChange={(asset) => {
                    setFileMetaByFieldName((current) => ({
                      ...current,
                      [inputName]: {
                        size: asset.size,
                        mime: asset.mime
                      }
                    }));
                  }}
                  onRemove={() => {
                    setFileMetaByFieldName((current) => ({
                      ...current,
                      [inputName]: null
                    }));
                  }}
                />
                <input name={`${inputName}__size`} type="hidden" value={meta?.size ?? ""} />
                <input name={`${inputName}__mime`} type="hidden" value={meta?.mime ?? ""} />
              </FormField>
            );
          }

          return (
            <FormField error={error} hint={field.helpText} key={field.id} label={field.label}>
              <Input
                defaultValue={field.defaultValue}
                maxLength={field.validation?.maxLength}
                minLength={field.validation?.minLength}
                name={inputName}
                pattern={field.validation?.regex}
                placeholder={field.placeholder}
                required={Boolean(field.validation?.required)}
                type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
              />
            </FormField>
          );
        })}

        <div className="flex justify-end">
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Submitting..." : form.snapshot.ui.submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
