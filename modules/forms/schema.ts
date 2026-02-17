import { z } from "zod";
import {
  conditionOperatorValues,
  DEFAULT_FORM_BEHAVIOR,
  DEFAULT_FORM_THEME,
  DEFAULT_FORM_UI,
  formDefinitionStatuses,
  formFieldTypeValues,
  formSubmissionStatuses,
  sponsorProfileStatuses,
  type FormBehaviorJson,
  type FormDefinitionStatus,
  type FormFieldDefinition,
  type FormSchemaJson,
  type FormSnapshot,
  type FormThemeJson,
  type FormUiJson,
  type FormSubmissionStatus,
  type SponsorProfileStatus
} from "@/modules/forms/types";

const safeId = z.string().trim().min(1).max(120);

const fieldOptionSchema = z.object({
  id: safeId,
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120)
});

const fieldValidationSchema = z
  .object({
    required: z.boolean().optional(),
    minLength: z.number().int().min(0).max(10000).optional(),
    maxLength: z.number().int().min(0).max(10000).optional(),
    regex: z.string().trim().min(1).max(500).optional(),
    email: z.boolean().optional(),
    maxFileSizeMB: z.number().min(1).max(100).optional(),
    allowedFileTypes: z.array(z.string().trim().min(1).max(120)).max(20).optional()
  })
  .optional();

const fieldConditionSchema = z
  .object({
    fieldId: safeId,
    operator: z.enum(conditionOperatorValues),
    value: z.string().trim().max(500)
  })
  .optional();

export const formFieldSchema = z.object({
  id: safeId,
  type: z.enum(formFieldTypeValues),
  name: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(300),
  placeholder: z.string().trim().max(300).optional(),
  helpText: z.string().trim().max(600).optional(),
  defaultValue: z.string().trim().max(5000).optional(),
  options: z.array(fieldOptionSchema).max(60).optional(),
  validation: fieldValidationSchema,
  condition: fieldConditionSchema
});

export const formSchemaJsonSchema = z.object({
  version: z.number().int().min(1).max(1000),
  fields: z.array(formFieldSchema).max(300)
});

export const formUiJsonSchema = z.object({
  submitLabel: z.string().trim().min(1).max(120),
  successMessage: z.string().trim().min(1).max(600),
  honeypotFieldName: z.string().trim().min(1).max(120)
});

export const formThemeJsonSchema = z.object({
  variant: z.enum(["default", "compact"])
});

const formBehaviorNoneSchema = z.object({
  type: z.literal("none")
});

const formBehaviorSponsorshipSchema = z.object({
  type: z.literal("sponsorship_intake"),
  mapping: z.object({
    sponsorName: z.string().trim().min(1).max(120),
    websiteUrl: z.string().trim().min(1).max(120),
    tier: z.string().trim().min(1).max(120),
    logoAssetId: z.string().trim().min(1).max(120)
  })
});

export const formBehaviorJsonSchema = z.discriminatedUnion("type", [formBehaviorNoneSchema, formBehaviorSponsorshipSchema]);

export const formSnapshotSchema = z.object({
  schema: formSchemaJsonSchema,
  ui: formUiJsonSchema,
  theme: formThemeJsonSchema,
  behavior: formBehaviorJsonSchema
});

export function sanitizeFormSchemaJson(value: unknown): FormSchemaJson {
  const parsed = formSchemaJsonSchema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  return {
    version: 1,
    fields: []
  };
}

export function sanitizeFormUiJson(value: unknown): FormUiJson {
  const parsed = formUiJsonSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_FORM_UI;
}

export function sanitizeFormThemeJson(value: unknown): FormThemeJson {
  const parsed = formThemeJsonSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_FORM_THEME;
}

export function sanitizeFormBehaviorJson(value: unknown): FormBehaviorJson {
  const parsed = formBehaviorJsonSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_FORM_BEHAVIOR;
}

export function sanitizeFormSnapshot(value: unknown): FormSnapshot {
  const parsed = formSnapshotSchema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  return {
    schema: sanitizeFormSchemaJson((value as { schema?: unknown } | null | undefined)?.schema),
    ui: sanitizeFormUiJson((value as { ui?: unknown } | null | undefined)?.ui),
    theme: sanitizeFormThemeJson((value as { theme?: unknown } | null | undefined)?.theme),
    behavior: sanitizeFormBehaviorJson((value as { behavior?: unknown } | null | undefined)?.behavior)
  };
}

export function sanitizeFormFields(value: unknown): FormFieldDefinition[] {
  return sanitizeFormSchemaJson(value).fields;
}

export function sanitizeFormDefinitionStatus(value: unknown): FormDefinitionStatus {
  return formDefinitionStatuses.includes(value as FormDefinitionStatus) ? (value as FormDefinitionStatus) : "draft";
}

export function sanitizeFormSubmissionStatus(value: unknown): FormSubmissionStatus {
  return formSubmissionStatuses.includes(value as FormSubmissionStatus) ? (value as FormSubmissionStatus) : "submitted";
}

export function sanitizeSponsorProfileStatus(value: unknown): SponsorProfileStatus {
  return sponsorProfileStatuses.includes(value as SponsorProfileStatus) ? (value as SponsorProfileStatus) : "draft";
}
