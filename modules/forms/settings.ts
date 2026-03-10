import type { FormKind, FormPage } from "@/modules/forms/types";

export const DEFAULT_SUBMISSION_CLOSED_PAGE_TITLE = "This form is no longer accepting submissions";
export const DEFAULT_SUBMISSION_CLOSED_PAGE_DESCRIPTION =
  "The submission limit has been reached. Please contact us if you have questions.";

type FormSettingsSource = {
  formKind: FormKind;
  settingsJson: Record<string, unknown>;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const next = value.trim();
  return next.length > 0 ? next : null;
}

function asPositiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const integer = Math.trunc(parsed);
  return integer > 0 ? integer : null;
}

export function getFormRequireSignIn(source: FormSettingsSource): boolean {
  if (source.formKind === "program_registration") {
    return true;
  }

  return source.settingsJson.requireSignIn !== false;
}

export function getFormAllowMultiplePlayers(source: FormSettingsSource): boolean {
  return Boolean(source.settingsJson.allowMultiplePlayers);
}

export function getFormSubmissionCap(source: FormSettingsSource): {
  enabled: boolean;
  cap: number | null;
} {
  const enabled = source.formKind === "generic" ? Boolean(source.settingsJson.submissionCapEnabled) : false;
  const cap = source.formKind === "generic" ? asPositiveInteger(source.settingsJson.submissionCap) : null;

  return {
    enabled,
    cap
  };
}

export function getFormSubmissionClosedPage(source: {
  formKind: FormKind;
  settingsJson: Record<string, unknown>;
  pages: FormPage[];
}): { title: string; description: string } {
  if (source.formKind !== "generic") {
    return {
      title: DEFAULT_SUBMISSION_CLOSED_PAGE_TITLE,
      description: DEFAULT_SUBMISSION_CLOSED_PAGE_DESCRIPTION
    };
  }

  const schemaPage = source.pages.find((page) => page.pageKey === "generic_submission_closed");
  if (schemaPage) {
    return {
      title: asTrimmedString(schemaPage.title) ?? DEFAULT_SUBMISSION_CLOSED_PAGE_TITLE,
      description: asTrimmedString(schemaPage.description) ?? DEFAULT_SUBMISSION_CLOSED_PAGE_DESCRIPTION
    };
  }

  return {
    title: asTrimmedString(source.settingsJson.submissionClosedPageTitle) ?? DEFAULT_SUBMISSION_CLOSED_PAGE_TITLE,
    description: asTrimmedString(source.settingsJson.submissionClosedPageDescription) ?? DEFAULT_SUBMISSION_CLOSED_PAGE_DESCRIPTION
  };
}

export function isFormSubmissionCapReached(source: FormSettingsSource, submissionCount: number): boolean {
  const cap = getFormSubmissionCap(source);
  if (!cap.enabled || cap.cap === null || source.formKind !== "generic") {
    return false;
  }

  return submissionCount >= cap.cap;
}
