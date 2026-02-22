export type FormStatus = "draft" | "published" | "archived";

export type FormKind = "generic" | "program_registration";

export type TargetMode = "locked" | "choice";

export type SubmissionStatus = "submitted" | "in_review" | "approved" | "rejected" | "waitlisted" | "cancelled";

export type FormFieldType = "text" | "textarea" | "email" | "number" | "date" | "select" | "checkbox";

export type FormFieldOption = {
  value: string;
  label: string;
};

export type FormField = {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  options: FormFieldOption[];
};

export type FormSection = {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
};

export type FormRuleOperator = "equals" | "not_equals" | "is_true" | "is_false";

export type FormRuleEffect = "show" | "require";

export type FormRule = {
  id: string;
  sourceFieldName: string;
  operator: FormRuleOperator;
  value: string | boolean | null;
  targetFieldName: string;
  effect: FormRuleEffect;
};

export type FormSchema = {
  version: number;
  title: string;
  description: string | null;
  sections: FormSection[];
  rules: FormRule[];
};

export type OrgForm = {
  id: string;
  orgId: string;
  slug: string;
  name: string;
  description: string | null;
  formKind: FormKind;
  status: FormStatus;
  programId: string | null;
  targetMode: TargetMode;
  lockedProgramNodeId: string | null;
  schemaJson: FormSchema;
  uiJson: Record<string, unknown>;
  settingsJson: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrgFormVersion = {
  id: string;
  orgId: string;
  formId: string;
  versionNumber: number;
  snapshotJson: Record<string, unknown>;
  publishedAt: string;
  createdBy: string | null;
  createdAt: string;
};

export type FormSubmission = {
  id: string;
  orgId: string;
  formId: string;
  versionId: string;
  submittedByUserId: string;
  status: SubmissionStatus;
  answersJson: Record<string, unknown>;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type FormSubmissionEntry = {
  id: string;
  submissionId: string;
  playerId: string;
  programNodeId: string | null;
  answersJson: Record<string, unknown>;
  createdAt: string;
};

export type ProgramRegistration = {
  id: string;
  orgId: string;
  programId: string;
  programNodeId: string | null;
  playerId: string;
  submissionId: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
};

export type RegistrationPlayerEntryInput = {
  playerId: string;
  programNodeId: string | null;
  answers: Record<string, unknown>;
};
