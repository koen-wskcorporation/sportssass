import type { FormFieldCondition, FormFieldDefinition, FormSnapshot, FormSubmissionValidationResult } from "@/modules/forms/types";

type SubmissionInputValue = FormDataEntryValue | FormDataEntryValue[] | string | string[] | boolean | number | null | undefined;

export type SubmissionInput = Record<string, SubmissionInputValue>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asString(value: SubmissionInputValue) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return "";
}

function asStringArray(value: SubmissionInputValue) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
  }

  const single = asString(value);
  return single ? [single] : [];
}

function toBoolean(value: SubmissionInputValue): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }

  if (Array.isArray(value)) {
    return value.some((entry) => toBoolean(entry as SubmissionInputValue));
  }

  return false;
}

function matchesConditionValue(value: unknown, expected: string) {
  if (Array.isArray(value)) {
    return value.some((entry) => String(entry) === expected);
  }

  if (typeof value === "boolean") {
    return value === ["1", "true", "yes", "on"].includes(expected.toLowerCase());
  }

  return String(value ?? "") === expected;
}

function containsConditionValue(value: unknown, expected: string) {
  const needle = expected.toLowerCase();

  if (Array.isArray(value)) {
    return value.some((entry) => String(entry).toLowerCase().includes(needle));
  }

  return String(value ?? "").toLowerCase().includes(needle);
}

export function evaluateFieldCondition(condition: FormFieldCondition | undefined, answerByFieldId: Record<string, unknown>) {
  if (!condition) {
    return true;
  }

  const sourceValue = answerByFieldId[condition.fieldId];

  if (condition.operator === "equals") {
    return matchesConditionValue(sourceValue, condition.value);
  }

  return containsConditionValue(sourceValue, condition.value);
}

function normalizeSingleFieldValue(field: FormFieldDefinition, input: SubmissionInput): unknown {
  const fieldValue = input[field.name];

  switch (field.type) {
    case "heading":
    case "paragraph":
      return undefined;
    case "checkbox":
      return toBoolean(fieldValue);
    case "multiCheckbox":
      return asStringArray(fieldValue);
    case "fileUpload":
      return asString(fieldValue);
    default:
      return asString(fieldValue);
  }
}

export function buildNormalizedFieldAnswers(fields: FormFieldDefinition[], input: SubmissionInput) {
  return fields.reduce<Record<string, unknown>>((draft, field) => {
    draft[field.id] = normalizeSingleFieldValue(field, input);
    return draft;
  }, {});
}

export function getVisibleFields(fields: FormFieldDefinition[], answerByFieldId: Record<string, unknown>) {
  return fields.filter((field) => evaluateFieldCondition(field.condition, answerByFieldId));
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value ?? "").trim().length > 0;
}

function validateOptionValue(field: FormFieldDefinition, value: unknown) {
  const options = field.options ?? [];

  if (options.length === 0) {
    return true;
  }

  const allowed = new Set(options.map((option) => option.value));

  if (Array.isArray(value)) {
    return value.every((entry) => allowed.has(String(entry)));
  }

  return !value || allowed.has(String(value));
}

export function validateSubmission(snapshot: FormSnapshot, input: SubmissionInput): FormSubmissionValidationResult {
  const answerByFieldId = buildNormalizedFieldAnswers(snapshot.schema.fields, input);
  const visibleFields = getVisibleFields(snapshot.schema.fields, answerByFieldId);

  const errors: Record<string, string> = {};
  const answers: Record<string, unknown> = {};

  for (const field of visibleFields) {
    if (field.type === "heading" || field.type === "paragraph") {
      continue;
    }

    const value = answerByFieldId[field.id];
    const validation = field.validation ?? {};

    if (validation.required && !hasValue(value)) {
      errors[field.id] = `${field.label} is required.`;
      continue;
    }

    if (!validation.required && !hasValue(value)) {
      answers[field.name] = field.type === "checkbox" ? false : field.type === "multiCheckbox" ? [] : "";
      continue;
    }

    if (!validateOptionValue(field, value)) {
      errors[field.id] = `${field.label} contains an invalid option.`;
      continue;
    }

    if (typeof value === "string") {
      if (typeof validation.minLength === "number" && value.length < validation.minLength) {
        errors[field.id] = `${field.label} must be at least ${validation.minLength} characters.`;
        continue;
      }

      if (typeof validation.maxLength === "number" && value.length > validation.maxLength) {
        errors[field.id] = `${field.label} must be ${validation.maxLength} characters or fewer.`;
        continue;
      }

      if (validation.regex) {
        try {
          const regex = new RegExp(validation.regex);
          if (!regex.test(value)) {
            errors[field.id] = `${field.label} is invalid.`;
            continue;
          }
        } catch {
          errors[field.id] = `${field.label} has an invalid validation rule.`;
          continue;
        }
      }

      if ((field.type === "email" || validation.email) && !emailPattern.test(value)) {
        errors[field.id] = `${field.label} must be a valid email address.`;
        continue;
      }

      if (field.type === "fileUpload") {
        const mimeType = asString(input[`${field.name}__mime`]);
        const fileSize = Number.parseFloat(asString(input[`${field.name}__size`]));
        const hasFilePath = value.trim().length > 0;

        if (hasFilePath && (!mimeType || !Number.isFinite(fileSize) || fileSize <= 0)) {
          errors[field.id] = `${field.label} upload metadata is missing. Please upload the file again.`;
          continue;
        }

        if (validation.allowedFileTypes && validation.allowedFileTypes.length > 0 && mimeType) {
          const allowed = validation.allowedFileTypes.map((item) => item.toLowerCase());
          if (!allowed.includes(mimeType.toLowerCase())) {
            errors[field.id] = `${field.label} must match an allowed file type.`;
            continue;
          }
        }

        if (Number.isFinite(fileSize) && typeof validation.maxFileSizeMB === "number") {
          const maxBytes = Math.floor(validation.maxFileSizeMB * 1024 * 1024);
          if (fileSize > maxBytes) {
            errors[field.id] = `${field.label} exceeds the ${validation.maxFileSizeMB}MB size limit.`;
            continue;
          }
        }
      }
    }

    answers[field.name] = value;
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      answers,
      normalizedByFieldId: answerByFieldId,
      errors
    };
  }

  return {
    ok: true,
    answers,
    normalizedByFieldId: answerByFieldId
  };
}

export function extractSubmissionInputFromFormData(formData: FormData): SubmissionInput {
  const input: SubmissionInput = {};

  for (const [key, value] of formData.entries()) {
    const existing = input[key];

    if (existing === undefined) {
      input[key] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      input[key] = [...existing, value as FormDataEntryValue];
      continue;
    }

    input[key] = [existing as FormDataEntryValue, value as FormDataEntryValue];
  }

  return input;
}
