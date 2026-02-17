export const formDefinitionStatuses = ["draft", "published", "archived"] as const;
export type FormDefinitionStatus = (typeof formDefinitionStatuses)[number];

export const formSubmissionStatuses = ["submitted", "reviewed", "archived"] as const;
export type FormSubmissionStatus = (typeof formSubmissionStatuses)[number];

export const sponsorProfileStatuses = ["draft", "pending", "approved", "published"] as const;
export type SponsorProfileStatus = (typeof sponsorProfileStatuses)[number];

export const conditionOperatorValues = ["equals", "contains"] as const;
export type ConditionOperator = (typeof conditionOperatorValues)[number];

export const formFieldTypeValues = [
  "text",
  "textarea",
  "email",
  "phone",
  "select",
  "radio",
  "checkbox",
  "multiCheckbox",
  "fileUpload",
  "heading",
  "paragraph"
] as const;
export type FormFieldType = (typeof formFieldTypeValues)[number];

export type FormFieldCondition = {
  fieldId: string;
  operator: ConditionOperator;
  value: string;
};

export type FormFieldOption = {
  id: string;
  label: string;
  value: string;
};

export type FormFieldValidation = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  regex?: string;
  email?: boolean;
  maxFileSizeMB?: number;
  allowedFileTypes?: string[];
};

export type FormFieldDefinition = {
  id: string;
  type: FormFieldType;
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  condition?: FormFieldCondition;
};

export type FormSchemaJson = {
  version: number;
  fields: FormFieldDefinition[];
};

export type FormUiJson = {
  submitLabel: string;
  successMessage: string;
  honeypotFieldName: string;
};

export type FormThemeJson = {
  variant: "default" | "compact";
};

export type SponsorshipBehaviorMapping = {
  sponsorName: string;
  websiteUrl: string;
  tier: string;
  logoAssetId: string;
};

export type FormBehaviorJson =
  | {
      type: "none";
    }
  | {
      type: "sponsorship_intake";
      mapping: SponsorshipBehaviorMapping;
    };

export type FormSnapshot = {
  schema: FormSchemaJson;
  ui: FormUiJson;
  theme: FormThemeJson;
  behavior: FormBehaviorJson;
};

export type FormDefinition = {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  status: FormDefinitionStatus;
  schemaJson: FormSchemaJson;
  uiJson: FormUiJson;
  themeJson: FormThemeJson;
  behaviorJson: FormBehaviorJson;
  createdAt: string;
  updatedAt: string;
};

export type FormVersion = {
  id: string;
  orgId: string;
  formId: string;
  versionNumber: number;
  snapshotJson: FormSnapshot;
  publishedAt: string;
  createdBy: string | null;
  createdAt: string;
};

export type FormSubmission = {
  id: string;
  orgId: string;
  formId: string;
  versionId: string;
  answersJson: Record<string, unknown>;
  metadataJson: Record<string, unknown>;
  status: FormSubmissionStatus;
  createdAt: string;
};

export type SponsorProfile = {
  id: string;
  orgId: string;
  name: string;
  logoAssetId: string | null;
  websiteUrl: string | null;
  tier: string | null;
  status: SponsorProfileStatus;
  submissionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  orgId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  detailJson: Record<string, unknown>;
  createdAt: string;
};

export type FormListItem = {
  id: string;
  slug: string;
  name: string;
  status: FormDefinitionStatus;
  lastPublishedAt: string | null;
  updatedAt: string;
};

export type PublishedFormRuntime = {
  id: string;
  slug: string;
  name: string;
  versionId: string;
  versionNumber: number;
  snapshot: FormSnapshot;
  publishedAt: string;
};

export type FormSubmissionValidationResult =
  | {
      ok: true;
      answers: Record<string, unknown>;
      normalizedByFieldId: Record<string, unknown>;
    }
  | {
      ok: false;
      answers: Record<string, unknown>;
      normalizedByFieldId: Record<string, unknown>;
      errors: Record<string, string>;
    };

export const DEFAULT_FORM_UI: FormUiJson = {
  submitLabel: "Submit",
  successMessage: "Thanks. Your submission has been received.",
  honeypotFieldName: "companyWebsite"
};

export const DEFAULT_FORM_THEME: FormThemeJson = {
  variant: "default"
};

export const DEFAULT_FORM_BEHAVIOR: FormBehaviorJson = {
  type: "none"
};
