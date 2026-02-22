import { z } from "zod";
import type { FormSchema } from "@/modules/forms/types";

const fieldTypeValues = ["text", "textarea", "email", "number", "date", "select", "checkbox"] as const;
const ruleOperatorValues = ["equals", "not_equals", "is_true", "is_false"] as const;
const ruleEffectValues = ["show", "require"] as const;

const optionSchema = z.object({
  value: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120)
});

const fieldSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120),
  type: z.enum(fieldTypeValues),
  required: z.boolean().default(false),
  placeholder: z.string().trim().max(200).nullable().optional(),
  helpText: z.string().trim().max(300).nullable().optional(),
  options: z.array(optionSchema).optional().default([])
});

const sectionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).nullable().optional(),
  fields: z.array(fieldSchema).default([])
});

const ruleSchema = z.object({
  id: z.string().trim().min(1).max(64),
  sourceFieldName: z.string().trim().min(1).max(64),
  operator: z.enum(ruleOperatorValues),
  value: z.union([z.string(), z.boolean(), z.null()]).optional().nullable(),
  targetFieldName: z.string().trim().min(1).max(64),
  effect: z.enum(ruleEffectValues)
});

export const formSchemaValidator = z.object({
  version: z.number().int().positive().default(1),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  sections: z.array(sectionSchema).default([]),
  rules: z.array(ruleSchema).default([])
});

function createDefaultSection() {
  return {
    id: "section-general",
    title: "General",
    description: null,
    fields: []
  };
}

export function createDefaultFormSchema(name = "Form"): FormSchema {
  return {
    version: 1,
    title: name,
    description: null,
    sections: [createDefaultSection()],
    rules: []
  };
}

export function parseFormSchema(value: unknown, fallbackName = "Form"): FormSchema {
  const parsed = formSchemaValidator.safeParse(value);

  if (!parsed.success) {
    return createDefaultFormSchema(fallbackName);
  }

  const schema = parsed.data;
  const sectionFields = schema.sections.flatMap((section) => section.fields.map((field) => field.name));
  const fieldNameSet = new Set(sectionFields);

  return {
    version: schema.version,
    title: schema.title,
    description: schema.description ?? null,
    sections:
      schema.sections.length > 0
        ? schema.sections.map((section) => ({
            id: section.id,
            title: section.title,
            description: section.description ?? null,
            fields: section.fields.map((field) => ({
              id: field.id,
              name: field.name,
              label: field.label,
              type: field.type,
              required: field.required,
              placeholder: field.placeholder ?? null,
              helpText: field.helpText ?? null,
              options: field.options ?? []
            }))
          }))
        : [createDefaultSection()],
    rules: schema.rules
      .filter((rule) => fieldNameSet.has(rule.sourceFieldName) && fieldNameSet.has(rule.targetFieldName))
      .map((rule) => ({
        id: rule.id,
        sourceFieldName: rule.sourceFieldName,
        operator: rule.operator,
        value: rule.value ?? null,
        targetFieldName: rule.targetFieldName,
        effect: rule.effect
      }))
  };
}

export function parseFormSchemaJson(rawJson: string, fallbackName = "Form"): { schema: FormSchema; error: string | null } {
  const trimmed = rawJson.trim();
  if (!trimmed) {
    return {
      schema: createDefaultFormSchema(fallbackName),
      error: null
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return {
      schema: parseFormSchema(parsed, fallbackName),
      error: null
    };
  } catch {
    return {
      schema: createDefaultFormSchema(fallbackName),
      error: "Invalid schema JSON."
    };
  }
}
