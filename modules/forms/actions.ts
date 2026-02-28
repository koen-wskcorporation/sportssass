"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { rethrowIfNavigationError } from "@/lib/actions/rethrowIfNavigationError";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { can } from "@/lib/permissions/can";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import { parseFormSchemaJson } from "@/modules/forms/schema";
import {
  createFormRecord,
  getFormById,
  getFormBySlug,
  getLatestFormVersion,
  listFormSubmissions,
  listFormsForManage,
  listPublishedFormsForProgram,
  publishFormVersionRecord,
  setFormSubmissionStatus,
  updateFormRecord
} from "@/modules/forms/db/queries";
import type { RegistrationPlayerEntryInput, SubmissionStatus } from "@/modules/forms/types";
import { getProgramById } from "@/modules/programs/db/queries";

const textSchema = z.string().trim();
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const createFormSchema = z.object({
  orgSlug: textSchema.min(1),
  slug: slugSchema,
  name: textSchema.min(2).max(120),
  description: textSchema.max(2000).optional(),
  formKind: z.enum(["generic", "program_registration"]),
  status: z.enum(["draft", "published", "archived"]),
  programId: z.string().uuid().nullable().optional(),
  targetMode: z.enum(["locked", "choice"]),
  lockedProgramNodeId: z.string().uuid().nullable().optional(),
  allowMultiplePlayers: z.boolean().optional(),
  requireSignIn: z.boolean().optional()
});

const saveFormDraftSchema = createFormSchema.extend({
  formId: z.string().uuid(),
  schemaJson: z.string().trim().min(1)
});

const publishFormSchema = z.object({
  orgSlug: textSchema.min(1),
  formId: z.string().uuid()
});

const submissionStatusSchema = z.object({
  orgSlug: textSchema.min(1),
  formId: z.string().uuid(),
  submissionId: z.string().uuid(),
  status: z.enum(["submitted", "in_review", "approved", "rejected", "waitlisted", "cancelled"] satisfies SubmissionStatus[])
});

const submitFormSchema = z.object({
  orgSlug: textSchema.min(1),
  formSlug: slugSchema,
  answers: z.record(z.string(), z.unknown()).optional(),
  playerEntries: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        programNodeId: z.string().uuid().nullable().optional(),
        answers: z.record(z.string(), z.unknown()).optional()
      })
    )
    .optional()
    .default([]),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type FormsActionResult<TData = undefined> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      error: string;
    };

function asError(error: string): FormsActionResult<never> {
  return {
    ok: false,
    error
  };
}

function normalizeOptional(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePlayerEntries(entries: z.infer<typeof submitFormSchema>["playerEntries"]): RegistrationPlayerEntryInput[] {
  return entries.map((entry) => ({
    playerId: entry.playerId,
    programNodeId: entry.programNodeId ?? null,
    answers: entry.answers ?? {}
  }));
}

async function getRegistrationFormNameAndValidateLink(params: { orgId: string; formId?: string; programId: string }) {
  const program = await getProgramById(params.orgId, params.programId);
  if (!program) {
    return {
      ok: false as const,
      error: "Program not found."
    };
  }

  const forms = await listFormsForManage(params.orgId);
  const existingLinkedForm = forms.find((form) => form.programId === params.programId && form.id !== params.formId);
  if (existingLinkedForm) {
    return {
      ok: false as const,
      error: "This program already has a linked form."
    };
  }

  return {
    ok: true as const,
    name: `${program.name} Registration`
  };
}

async function requireFormsReadOrWrite(orgSlug: string) {
  const orgContext = await getOrgAuthContext(orgSlug);
  const hasAccess = can(orgContext.membershipPermissions, "forms.read") || can(orgContext.membershipPermissions, "forms.write");

  if (!hasAccess) {
    throw new Error("FORBIDDEN");
  }

  return orgContext;
}

export async function getFormsManagePageData(orgSlug: string) {
  const org = await requireFormsReadOrWrite(orgSlug);
  const forms = await listFormsForManage(org.orgId);

  return {
    org,
    forms
  };
}

export async function getFormManageDetail(orgSlug: string, formId: string) {
  const org = await requireFormsReadOrWrite(orgSlug);
  const form = await getFormById(org.orgId, formId);

  if (!form) {
    return null;
  }

  const latestVersion = await getLatestFormVersion(form.id);

  return {
    org,
    form,
    latestVersion
  };
}

export async function createFormAction(input: z.input<typeof createFormSchema>): Promise<FormsActionResult<{ formId: string }>> {
  const parsed = createFormSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Please fill in the required form fields.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "forms.write");
    let resolvedName = payload.name;
    const resolvedRequireSignIn = payload.formKind === "program_registration" ? true : payload.requireSignIn ?? true;

    if (payload.formKind === "program_registration") {
      if (!payload.programId) {
        return asError("Program registration forms require a program.");
      }

      const result = await getRegistrationFormNameAndValidateLink({
        orgId: org.orgId,
        programId: payload.programId
      });

      if (!result.ok) {
        return asError(result.error);
      }

      resolvedName = result.name;
    }

    const created = await createFormRecord({
      orgId: org.orgId,
      createdByUserId: org.userId,
      slug: payload.slug,
      name: resolvedName,
      description: normalizeOptional(payload.description),
      formKind: payload.formKind,
      status: payload.status,
      programId: payload.programId ?? null,
      targetMode: payload.targetMode,
      lockedProgramNodeId: payload.lockedProgramNodeId ?? null,
      settingsJson: {
        allowMultiplePlayers: payload.allowMultiplePlayers ?? false,
        requireSignIn: resolvedRequireSignIn
      }
    });

    if (payload.status === "published") {
      await publishFormVersionRecord({
        orgId: org.orgId,
        formId: created.id,
        createdByUserId: org.userId,
        snapshotJson: {
          schema: created.schemaJson,
          ui: created.uiJson,
          settings: created.settingsJson
        }
      });
    }

    revalidatePath(`/${org.orgSlug}/tools/forms`);

    return {
      ok: true,
      data: {
        formId: created.id
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to create this form right now.");
  }
}

export async function saveFormDraftAction(input: z.input<typeof saveFormDraftSchema>): Promise<FormsActionResult<{ formId: string }>> {
  const parsed = saveFormDraftSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Please review the form details.");
  }

  const payload = parsed.data;
  let resolvedName = payload.name;
  const resolvedRequireSignIn = payload.formKind === "program_registration" ? true : payload.requireSignIn ?? true;

  try {
    const org = await requireOrgPermission(payload.orgSlug, "forms.write");

    if (payload.formKind === "program_registration") {
      if (!payload.programId) {
        return asError("Program registration forms require a program.");
      }

      const result = await getRegistrationFormNameAndValidateLink({
        orgId: org.orgId,
        formId: payload.formId,
        programId: payload.programId
      });

      if (!result.ok) {
        return asError(result.error);
      }

      resolvedName = result.name;
    }

    const parsedSchema = parseFormSchemaJson(payload.schemaJson, resolvedName, payload.formKind);
    if (parsedSchema.error) {
      return asError(parsedSchema.error);
    }

    const updated = await updateFormRecord({
      orgId: org.orgId,
      formId: payload.formId,
      slug: payload.slug,
      name: resolvedName,
      description: normalizeOptional(payload.description),
      formKind: payload.formKind,
      status: payload.status,
      programId: payload.programId ?? null,
      targetMode: payload.targetMode,
      lockedProgramNodeId: payload.lockedProgramNodeId ?? null,
      schemaJson: parsedSchema.schema,
      settingsJson: {
        allowMultiplePlayers: payload.allowMultiplePlayers ?? false,
        requireSignIn: resolvedRequireSignIn
      }
    });

    revalidatePath(`/${org.orgSlug}/tools/forms`);
    revalidatePath(`/${org.orgSlug}/tools/forms/${updated.id}/editor`);

    return {
      ok: true,
      data: {
        formId: updated.id
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to save this form right now.");
  }
}

export async function publishFormVersionAction(input: z.input<typeof publishFormSchema>): Promise<FormsActionResult<{ formId: string; versionId: string }>> {
  const parsed = publishFormSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Invalid publish request.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "forms.write");
    const form = await getFormById(org.orgId, payload.formId);

    if (!form) {
      return asError("Form not found.");
    }

    const version = await publishFormVersionRecord({
      orgId: org.orgId,
      formId: form.id,
      createdByUserId: org.userId,
      snapshotJson: {
        schema: form.schemaJson,
        ui: form.uiJson,
        settings: form.settingsJson
      }
    });

    await updateFormRecord({
      orgId: org.orgId,
      formId: form.id,
      slug: form.slug,
      name: form.name,
      description: form.description,
      formKind: form.formKind,
      status: "published",
      programId: form.programId,
      targetMode: form.targetMode,
      lockedProgramNodeId: form.lockedProgramNodeId,
      schemaJson: form.schemaJson,
      settingsJson: form.settingsJson
    });

    revalidatePath(`/${org.orgSlug}/tools/forms`);
    revalidatePath(`/${org.orgSlug}/tools/forms/${form.id}/editor`);
    revalidatePath(`/${org.orgSlug}/register/${form.slug}`);

    return {
      ok: true,
      data: {
        formId: form.id,
        versionId: version.id
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to publish this form right now.");
  }
}

export async function listFormSubmissionsAction(input: { orgSlug: string; formId: string }): Promise<FormsActionResult<{ submissions: Awaited<ReturnType<typeof listFormSubmissions>> }>> {
  try {
    const org = await requireFormsReadOrWrite(input.orgSlug);
    const submissions = await listFormSubmissions(org.orgId, input.formId);

    return {
      ok: true,
      data: {
        submissions
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to load form submissions.");
  }
}

export async function setSubmissionStatusAction(input: z.input<typeof submissionStatusSchema>): Promise<FormsActionResult<{ submissionId: string }>> {
  const parsed = submissionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Invalid status update.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "forms.write");
    const updated = await setFormSubmissionStatus({
      orgId: org.orgId,
      submissionId: payload.submissionId,
      status: payload.status
    });

    revalidatePath(`/${org.orgSlug}/tools/forms/${payload.formId}/submissions`);

    return {
      ok: true,
      data: {
        submissionId: updated.id
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to update submission status right now.");
  }
}

export async function submitFormResponseAction(input: z.input<typeof submitFormSchema>): Promise<FormsActionResult<{ submissionId: string; status: string }>> {
  const parsed = submitFormSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Please complete required registration fields.");
  }

  try {
    const payload = parsed.data;
    const org = await getOrgPublicContext(payload.orgSlug);
    const form = await getFormBySlug(org.orgId, payload.formSlug, {
      includeDraft: false
    });

    if (!form) {
      return asError("Form not found.");
    }

    const user = await getSessionUser();
    const requireSignIn = form.formKind === "program_registration" || form.settingsJson.requireSignIn !== false;

    if (requireSignIn && !user) {
      return asError("Please sign in to submit this form.");
    }

    const supabase = await createSupabaseServer();

    const { data, error } = await supabase.rpc("submit_form_response", {
      input_org_slug: payload.orgSlug,
      input_form_slug: payload.formSlug,
      input_answers: payload.answers ?? {},
      input_player_entries: normalizePlayerEntries(payload.playerEntries),
      input_metadata: payload.metadata ?? {}
    });

    if (error) {
      if (error.message.includes("AUTH_REQUIRED")) {
        return asError("Please sign in to submit this form.");
      }

      throw new Error(error.message);
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row || typeof row.submission_id !== "string") {
      return asError("Registration did not complete. Please try again.");
    }

    revalidatePath(`/${payload.orgSlug}/register/${payload.formSlug}`);

    return {
      ok: true,
      data: {
        submissionId: row.submission_id,
        status: typeof row.status === "string" ? row.status : "submitted"
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to submit this registration right now.");
  }
}

export async function getPublicRegistrationForm(orgSlug: string, formSlug: string) {
  const org = await getOrgPublicContext(orgSlug);
  const form = await getFormBySlug(org.orgId, formSlug, {
    includeDraft: false
  });

  return {
    org,
    form
  };
}

export async function getPublishedFormsForProgram(orgSlug: string, programId: string) {
  const org = await getOrgPublicContext(orgSlug);
  return listPublishedFormsForProgram(org.orgId, programId);
}
