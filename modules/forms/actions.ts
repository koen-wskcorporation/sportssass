"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rethrowIfNavigationError } from "@/lib/actions/rethrowIfNavigationError";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { can } from "@/lib/permissions/can";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import {
  archiveFormDefinition,
  createFormDefinition,
  getFormDefinitionById,
  getLatestFormVersion,
  listFormDefinitions,
  listFormSubmissions,
  listPublishedForms,
  publishFormDefinition,
  resolveNextCopySlug,
  updateFormDefinitionDraft
} from "@/modules/forms/db/queries";
import { sanitizeFormBehaviorJson, sanitizeFormSchemaJson, sanitizeFormThemeJson, sanitizeFormUiJson } from "@/modules/forms/schema";
import { formSubmissionStatuses, type FormBehaviorJson, type FormSchemaJson, type FormThemeJson, type FormUiJson } from "@/modules/forms/types";

const formSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "form";
}

function createDefaultFieldName(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

function createDefaultFormSchema(name: string): FormSchemaJson {
  const safeName = name.trim() || "New Form";

  return {
    version: 1,
    fields: [
      {
        id: "heading-intro",
        type: "heading",
        name: "heading_intro",
        label: safeName
      },
      {
        id: "paragraph-intro",
        type: "paragraph",
        name: "paragraph_intro",
        label: "Add form fields from the editor palette to begin collecting submissions."
      },
      {
        id: "name",
        type: "text",
        name: createDefaultFieldName("Name") || "name",
        label: "Name",
        validation: {
          required: true,
          maxLength: 120
        }
      },
      {
        id: "email",
        type: "email",
        name: createDefaultFieldName("Email") || "email",
        label: "Email",
        validation: {
          required: true,
          email: true,
          maxLength: 200
        }
      }
    ]
  };
}

function createDefaultFormUi(name: string): FormUiJson {
  return {
    submitLabel: "Submit",
    successMessage: `Thanks. ${name.trim() || "Your"} submission has been received.`,
    honeypotFieldName: "companyWebsite"
  };
}

function createDefaultFormTheme(): FormThemeJson {
  return {
    variant: "default"
  };
}

function createDefaultFormBehavior(): FormBehaviorJson {
  return {
    type: "none"
  };
}

const createFormSchema = z.object({
  orgSlug: z.string().trim().min(1),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(120).optional()
});

const duplicateFormSchema = z.object({
  orgSlug: z.string().trim().min(1),
  formId: z.string().uuid()
});

const archiveFormSchema = z.object({
  orgSlug: z.string().trim().min(1),
  formId: z.string().uuid()
});

const saveDraftSchema = z.object({
  orgSlug: z.string().trim().min(1),
  formId: z.string().uuid(),
  slug: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(120),
  schemaJson: z.unknown(),
  uiJson: z.unknown(),
  themeJson: z.unknown(),
  behaviorJson: z.unknown()
});

const publishFormSchema = z.object({
  orgSlug: z.string().trim().min(1),
  formId: z.string().uuid()
});

const submissionsFilterStatusValues = ["all", ...formSubmissionStatuses] as const;
const submissionsFilterSchema = z.object({
  orgSlug: z.string().trim().min(1),
  formId: z.string().uuid(),
  status: z.enum(submissionsFilterStatusValues).default("all")
});

type ActionResult<TPayload extends object | void = void> =
  | (TPayload extends void ? { ok: true } : { ok: true } & TPayload)
  | {
      ok: false;
      error: string;
    };

export async function getFormsManagePageData(orgSlug: string) {
  const orgContext = await requireOrgPermission(orgSlug, "forms.read");
  const forms = await listFormDefinitions(orgContext.orgId);

  return {
    orgSlug: orgContext.orgSlug,
    orgId: orgContext.orgId,
    forms,
    canWrite: can(orgContext.membershipPermissions, "forms.write")
  };
}

export async function createFormAction(input: { orgSlug: string; name: string; slug?: string }): Promise<ActionResult<{ formId: string }>> {
  const parsed = createFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Provide a valid form name and slug."
    };
  }

  try {
    const payload = parsed.data;
    const orgContext = await requireOrgPermission(payload.orgSlug, "forms.write");

    const slugRaw = payload.slug?.trim() ? payload.slug : payload.name;
    const slug = normalizeSlug(slugRaw);

    if (!formSlugPattern.test(slug)) {
      return {
        ok: false,
        error: "Form slug can only include lowercase letters, numbers, and hyphens."
      };
    }

    const created = await createFormDefinition({
      orgId: orgContext.orgId,
      slug,
      name: payload.name,
      status: "draft",
      schemaJson: createDefaultFormSchema(payload.name),
      uiJson: createDefaultFormUi(payload.name),
      themeJson: createDefaultFormTheme(),
      behaviorJson: createDefaultFormBehavior()
    });

    revalidatePath(`/${payload.orgSlug}/tools/forms`);

    return {
      ok: true,
      formId: created.id
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to create a new form right now."
    };
  }
}

export async function duplicateFormAction(input: { orgSlug: string; formId: string }): Promise<ActionResult<{ formId: string }>> {
  const parsed = duplicateFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid duplicate request."
    };
  }

  try {
    const payload = parsed.data;
    const orgContext = await requireOrgPermission(payload.orgSlug, "forms.write");
    const source = await getFormDefinitionById(orgContext.orgId, payload.formId);

    if (!source) {
      return {
        ok: false,
        error: "Form not found."
      };
    }

    const nextSlug = await resolveNextCopySlug(orgContext.orgId, source.slug);

    const created = await createFormDefinition({
      orgId: orgContext.orgId,
      slug: nextSlug,
      name: `${source.name} Copy`,
      status: "draft",
      schemaJson: source.schemaJson,
      uiJson: source.uiJson,
      themeJson: source.themeJson,
      behaviorJson: source.behaviorJson
    });

    revalidatePath(`/${payload.orgSlug}/tools/forms`);

    return {
      ok: true,
      formId: created.id
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to duplicate this form right now."
    };
  }
}

export async function archiveFormAction(input: { orgSlug: string; formId: string }): Promise<ActionResult> {
  const parsed = archiveFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid archive request."
    };
  }

  try {
    const payload = parsed.data;
    const orgContext = await requireOrgPermission(payload.orgSlug, "forms.write");
    await archiveFormDefinition(orgContext.orgId, payload.formId);

    revalidatePath(`/${payload.orgSlug}/tools/forms`);

    return {
      ok: true
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to archive this form right now."
    };
  }
}

export async function getFormEditorPageData(input: { orgSlug: string; formId: string }) {
  const orgContext = await requireOrgPermission(input.orgSlug, "forms.read");
  const form = await getFormDefinitionById(orgContext.orgId, input.formId);

  if (!form) {
    return {
      ok: false as const,
      error: "not_found" as const
    };
  }

  const latestPublishedVersion = await getLatestFormVersion(orgContext.orgId, form.id);

  return {
    ok: true as const,
    orgSlug: orgContext.orgSlug,
    form,
    latestPublishedVersion,
    canWrite: can(orgContext.membershipPermissions, "forms.write")
  };
}

export async function saveFormDraftAction(input: {
  orgSlug: string;
  formId: string;
  slug: string;
  name: string;
  schemaJson: unknown;
  uiJson: unknown;
  themeJson: unknown;
  behaviorJson: unknown;
}): Promise<ActionResult<{ updatedAt: string }>> {
  const parsed = saveDraftSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid form draft payload."
    };
  }

  try {
    const payload = parsed.data;

    if (!formSlugPattern.test(payload.slug)) {
      return {
        ok: false,
        error: "Form slug can only include lowercase letters, numbers, and hyphens."
      };
    }

    const orgContext = await requireOrgPermission(payload.orgSlug, "forms.write");

    const saved = await updateFormDefinitionDraft({
      orgId: orgContext.orgId,
      formId: payload.formId,
      slug: payload.slug,
      name: payload.name,
      schemaJson: sanitizeFormSchemaJson(payload.schemaJson),
      uiJson: sanitizeFormUiJson(payload.uiJson),
      themeJson: sanitizeFormThemeJson(payload.themeJson),
      behaviorJson: sanitizeFormBehaviorJson(payload.behaviorJson)
    });

    revalidatePath(`/${payload.orgSlug}/tools/forms`);
    revalidatePath(`/${payload.orgSlug}/tools/forms/${payload.formId}/edit`);

    return {
      ok: true,
      updatedAt: saved.updatedAt
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to save this draft right now."
    };
  }
}

export async function publishFormAction(input: { orgSlug: string; formId: string }): Promise<ActionResult<{ versionNumber: number }>> {
  const parsed = publishFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid publish request."
    };
  }

  try {
    const payload = parsed.data;
    const orgContext = await requireOrgPermission(payload.orgSlug, "forms.write");

    const published = await publishFormDefinition({
      orgId: orgContext.orgId,
      formId: payload.formId,
      createdBy: orgContext.userId
    });

    revalidatePath(`/${payload.orgSlug}/tools/forms`);
    revalidatePath(`/${payload.orgSlug}/tools/forms/${payload.formId}/edit`);
    revalidatePath(`/${payload.orgSlug}/forms/${published.definition.slug}`);

    return {
      ok: true,
      versionNumber: published.version.versionNumber
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to publish this form right now."
    };
  }
}

export async function getFormSubmissionsPageData(input: {
  orgSlug: string;
  formId: string;
  status?: "all" | "submitted" | "reviewed" | "archived";
}) {
  const parsed = submissionsFilterSchema.safeParse({
    orgSlug: input.orgSlug,
    formId: input.formId,
    status: input.status ?? "all"
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      error: "invalid_input" as const
    };
  }

  const payload = parsed.data;
  const orgContext = await requireOrgPermission(payload.orgSlug, "forms.read");
  const form = await getFormDefinitionById(orgContext.orgId, payload.formId);

  if (!form) {
    return {
      ok: false as const,
      error: "not_found" as const
    };
  }

  const submissions = await listFormSubmissions(orgContext.orgId, {
    formId: payload.formId,
    status: payload.status
  });

  const forms = await listFormDefinitions(orgContext.orgId);

  return {
    ok: true as const,
    orgSlug: orgContext.orgSlug,
    form,
    forms,
    submissions,
    selectedStatus: payload.status
  };
}

export async function listPublishedFormsForPickerAction(input: { orgSlug: string }): Promise<ActionResult<{ forms: Array<{ id: string; slug: string; name: string }> }>> {
  try {
    const orgContext = await getOrgAuthContext(input.orgSlug);
    const canReadForms = can(orgContext.membershipPermissions, "forms.read") || can(orgContext.membershipPermissions, "org.pages.write");

    if (!canReadForms) {
      return {
        ok: false,
        error: "You do not have permission to view published forms."
      };
    }

    const forms = await listPublishedForms(orgContext.orgId);

    return {
      ok: true,
      forms: forms.map((form) => ({
        id: form.id,
        slug: form.slug,
        name: form.name
      }))
    };
  } catch (error) {
    rethrowIfNavigationError(error);

    return {
      ok: false,
      error: "Unable to load published forms right now."
    };
  }
}

export async function getPublicFormPageData(input: { orgSlug: string; slug: string }) {
  const orgContext = await getOrgPublicContext(input.orgSlug);
  const forms = await listPublishedForms(orgContext.orgId);
  const form = forms.find((item) => item.slug === normalizeSlug(input.slug));

  if (!form) {
    return {
      ok: false as const,
      error: "not_found" as const
    };
  }

  return {
    ok: true as const,
    orgSlug: orgContext.orgSlug,
    orgName: orgContext.orgName,
    form
  };
}
