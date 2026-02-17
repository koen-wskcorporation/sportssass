"use client";

import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldDefinition } from "@/modules/forms/types";

type FormFieldInspectorProps = {
  field: FormFieldDefinition | null;
  fields: FormFieldDefinition[];
  onChange: (field: FormFieldDefinition) => void;
};

function serializeOptions(field: FormFieldDefinition) {
  return (field.options ?? [])
    .map((option) => {
      if (option.label === option.value) {
        return option.label;
      }

      return `${option.label}|${option.value}`;
    })
    .join("\n");
}

function parseOptions(value: string, fieldId: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [labelRaw, valueRaw] = line.includes("|") ? line.split("|") : [line, line];
      const label = labelRaw.trim().slice(0, 120);
      const normalizedValue = valueRaw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

      return {
        id: `${fieldId}-option-${index + 1}`,
        label,
        value: normalizedValue || `option_${index + 1}`
      };
    });
}

function canShowOptionEditor(type: FormFieldDefinition["type"]) {
  return type === "select" || type === "radio" || type === "multiCheckbox";
}

function canShowPlaceholder(type: FormFieldDefinition["type"]) {
  return ["text", "textarea", "email", "phone"].includes(type);
}

function canShowLengthValidation(type: FormFieldDefinition["type"]) {
  return ["text", "textarea", "email", "phone"].includes(type);
}

function canShowFileValidation(type: FormFieldDefinition["type"]) {
  return type === "fileUpload";
}

function canShowName(type: FormFieldDefinition["type"]) {
  return type !== "heading" && type !== "paragraph";
}

export function FormFieldInspector({ field, fields, onChange }: FormFieldInspectorProps) {
  if (!field) {
    return <p className="text-sm text-text-muted">Select a field on the canvas to edit its settings.</p>;
  }

  const conditionOptions = fields
    .filter((candidate) => candidate.id !== field.id && candidate.type !== "heading" && candidate.type !== "paragraph")
    .map((candidate) => ({
      value: candidate.id,
      label: candidate.label
    }));

  function patchField(patch: Partial<FormFieldDefinition>) {
    if (!field) {
      return;
    }

    const nextField: FormFieldDefinition = {
      ...field,
      ...patch,
      id: patch.id ?? field.id,
      type: patch.type ?? field.type,
      name: patch.name ?? field.name,
      label: patch.label ?? field.label
    };

    onChange(nextField);
  }

  return (
    <div className="space-y-4">
      <FormField label="Label">
        <Input
          onChange={(event) => {
            patchField({
              label: event.target.value
            });
          }}
          value={field.label}
        />
      </FormField>

      {canShowName(field.type) ? (
        <FormField hint="Used as the answer key in submissions." label="Field name">
          <Input
            onChange={(event) => {
              patchField({
                name: event.target.value
              });
            }}
            value={field.name}
          />
        </FormField>
      ) : null}

      {canShowPlaceholder(field.type) ? (
        <FormField label="Placeholder">
          <Input
            onChange={(event) => {
              patchField({
                placeholder: event.target.value
              });
            }}
            value={field.placeholder ?? ""}
          />
        </FormField>
      ) : null}

      <FormField label="Help text">
        <Textarea
          className="min-h-[72px]"
          onChange={(event) => {
            patchField({
              helpText: event.target.value
            });
          }}
          value={field.helpText ?? ""}
        />
      </FormField>

      {canShowOptionEditor(field.type) ? (
        <FormField hint="Enter one option per line. Use label|value to override generated values." label="Options">
          <Textarea
            className="min-h-[120px]"
            onChange={(event) => {
              patchField({
                options: parseOptions(event.target.value, field.id)
              });
            }}
            value={serializeOptions(field)}
          />
        </FormField>
      ) : null}

      {field.type !== "heading" && field.type !== "paragraph" ? (
        <div className="space-y-3 rounded-control border bg-surface-muted p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Validation</p>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              checked={Boolean(field.validation?.required)}
              onChange={(event) => {
                patchField({
                  validation: {
                    ...field.validation,
                    required: event.target.checked
                  }
                });
              }}
              type="checkbox"
            />
            Required
          </label>

          {canShowLengthValidation(field.type) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Min length">
                <Input
                  min={0}
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

                    patchField({
                      validation: {
                        ...field.validation,
                        minLength: Number.isFinite(parsed) ? Math.max(0, parsed) : undefined
                      }
                    });
                  }}
                  type="number"
                  value={field.validation?.minLength ?? ""}
                />
              </FormField>

              <FormField label="Max length">
                <Input
                  min={0}
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

                    patchField({
                      validation: {
                        ...field.validation,
                        maxLength: Number.isFinite(parsed) ? Math.max(0, parsed) : undefined
                      }
                    });
                  }}
                  type="number"
                  value={field.validation?.maxLength ?? ""}
                />
              </FormField>
            </div>
          ) : null}

          {field.type === "text" || field.type === "textarea" || field.type === "phone" ? (
            <FormField hint="Optional regular expression pattern." label="Regex">
              <Input
                onChange={(event) => {
                  patchField({
                    validation: {
                      ...field.validation,
                      regex: event.target.value || undefined
                    }
                  });
                }}
                value={field.validation?.regex ?? ""}
              />
            </FormField>
          ) : null}

          {field.type === "email" ? (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                checked={field.validation?.email ?? true}
                onChange={(event) => {
                  patchField({
                    validation: {
                      ...field.validation,
                      email: event.target.checked
                    }
                  });
                }}
                type="checkbox"
              />
              Enforce email format
            </label>
          ) : null}

          {canShowFileValidation(field.type) ? (
            <>
              <FormField hint="Comma-separated list of MIME types." label="Allowed file types">
                <Input
                  onChange={(event) => {
                    patchField({
                      validation: {
                        ...field.validation,
                        allowedFileTypes: event.target.value
                          .split(",")
                          .map((entry) => entry.trim())
                          .filter(Boolean)
                      }
                    });
                  }}
                  value={(field.validation?.allowedFileTypes ?? []).join(",")}
                />
              </FormField>

              <FormField label="Max file size (MB)">
                <Input
                  min={1}
                  onChange={(event) => {
                    const parsed = Number.parseFloat(event.target.value);

                    patchField({
                      validation: {
                        ...field.validation,
                        maxFileSizeMB: Number.isFinite(parsed) ? Math.max(1, parsed) : undefined
                      }
                    });
                  }}
                  type="number"
                  value={field.validation?.maxFileSizeMB ?? ""}
                />
              </FormField>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3 rounded-control border bg-surface-muted p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Conditional visibility</p>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            checked={Boolean(field.condition)}
            onChange={(event) => {
              patchField({
                condition: event.target.checked
                  ? {
                      fieldId: conditionOptions[0]?.value ?? "",
                      operator: "equals",
                      value: ""
                    }
                  : undefined
              });
            }}
            type="checkbox"
          />
          Enable show/hide rule
        </label>

        {field.condition ? (
          <>
            <FormField label="Depends on field">
              <Select
                name="condition-field"
                onChange={(event) => {
                  if (!field.condition) {
                    return;
                  }

                  patchField({
                    condition: {
                      ...field.condition,
                      fieldId: event.target.value
                    }
                  });
                }}
                options={conditionOptions.length > 0 ? conditionOptions : [{ value: "", label: "No eligible fields" }]}
                value={field.condition.fieldId}
              />
            </FormField>

            <FormField label="Operator">
              <Select
                name="condition-operator"
                onChange={(event) => {
                  if (!field.condition) {
                    return;
                  }

                  patchField({
                    condition: {
                      ...field.condition,
                      operator: event.target.value === "contains" ? "contains" : "equals"
                    }
                  });
                }}
                options={[
                  { label: "Equals", value: "equals" },
                  { label: "Contains", value: "contains" }
                ]}
                value={field.condition.operator}
              />
            </FormField>

            <FormField label="Expected value">
              <Input
                onChange={(event) => {
                  if (!field.condition) {
                    return;
                  }

                  patchField({
                    condition: {
                      ...field.condition,
                      value: event.target.value
                    }
                  });
                }}
                value={field.condition.value}
              />
            </FormField>
          </>
        ) : null}
      </div>
    </div>
  );
}
