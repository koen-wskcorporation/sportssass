"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrgAuthContext } from "@/lib/org/getOrgAuthContext";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { can } from "@/lib/permissions/can";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import { rethrowIfNavigationError } from "@/lib/actions/rethrowIfNavigationError";
import {
  createProgramNodeRecord,
  createProgramRecord,
  createProgramScheduleBlockRecord,
  deleteProgramNodeRecord,
  deleteProgramScheduleBlockRecord,
  getProgramById,
  getProgramDetailsById,
  getProgramDetailsBySlug,
  listProgramsForManage,
  listPublishedProgramsForCatalog,
  updateProgramRecord
} from "@/modules/programs/db/queries";
import type { ProgramScheduleBlockType, ProgramType } from "@/modules/programs/types";

const textSchema = z.string().trim();
const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const nullableDateSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }

    return value;
  });

const nullableDateTimeSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }

    return value;
  });

const createProgramSchema = z.object({
  orgSlug: textSchema.min(1),
  slug: slugSchema,
  name: textSchema.min(2).max(120),
  description: textSchema.max(2000).optional(),
  programType: z.enum(["league", "season", "clinic", "custom"] satisfies ProgramType[]),
  customTypeLabel: textSchema.max(80).optional(),
  status: z.enum(["draft", "published", "archived"]),
  startDate: nullableDateSchema,
  endDate: nullableDateSchema,
  coverImagePath: textSchema.max(500).optional(),
  registrationOpenAt: nullableDateTimeSchema,
  registrationCloseAt: nullableDateTimeSchema
});

const updateProgramSchema = createProgramSchema.extend({
  programId: z.string().uuid()
});

const saveHierarchySchema = z.object({
  orgSlug: textSchema.min(1),
  programId: z.string().uuid(),
  action: z.enum(["create", "delete"]),
  nodeId: z.string().uuid().optional(),
  parentId: z.string().uuid().nullable().optional(),
  name: textSchema.max(120).optional(),
  slug: slugSchema.optional(),
  nodeKind: z.enum(["division", "subdivision"]).optional(),
  capacity: z
    .union([z.number().int().min(0), z.null()])
    .optional()
    .transform((value) => (typeof value === "number" ? value : null)),
  waitlistEnabled: z.boolean().optional()
});

const saveScheduleSchema = z.object({
  orgSlug: textSchema.min(1),
  programId: z.string().uuid(),
  action: z.enum(["create", "delete"]),
  scheduleBlockId: z.string().uuid().optional(),
  programNodeId: z.string().uuid().nullable().optional(),
  blockType: z.enum(["date_range", "meeting_pattern", "one_off"] satisfies ProgramScheduleBlockType[]).optional(),
  title: textSchema.max(120).optional(),
  timezone: textSchema.max(80).optional(),
  startDate: nullableDateSchema,
  endDate: nullableDateSchema,
  startTime: textSchema.max(20).optional(),
  endTime: textSchema.max(20).optional(),
  byDay: z.array(z.number().int().min(0).max(6)).optional(),
  oneOffAt: nullableDateTimeSchema
});

export type ProgramsActionResult<TData = undefined> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      error: string;
    };

function asError(error: string): ProgramsActionResult<never> {
  return {
    ok: false,
    error
  };
}

function normalizeOptional(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

async function requireProgramsReadOrWrite(orgSlug: string) {
  const orgContext = await getOrgAuthContext(orgSlug);
  const hasAccess = can(orgContext.membershipPermissions, "programs.read") || can(orgContext.membershipPermissions, "programs.write");

  if (!hasAccess) {
    throw new Error("FORBIDDEN");
  }

  return orgContext;
}

export async function getProgramsManagePageData(orgSlug: string) {
  const org = await requireProgramsReadOrWrite(orgSlug);
  const programs = await listProgramsForManage(org.orgId);

  return {
    org,
    programs
  };
}

export async function getProgramManageDetail(orgSlug: string, programId: string) {
  const org = await requireProgramsReadOrWrite(orgSlug);
  const details = await getProgramDetailsById(org.orgId, programId);

  if (!details) {
    return null;
  }

  return {
    org,
    details
  };
}

export async function getPublishedProgramsCatalog(orgSlug: string) {
  const org = await getOrgAuthContext(orgSlug).catch(() => null);
  if (org && can(org.membershipPermissions, "programs.read")) {
    return listProgramsForManage(org.orgId);
  }

  return [];
}

export async function createProgramAction(input: z.input<typeof createProgramSchema>): Promise<ProgramsActionResult<{ programId: string }>> {
  const parsed = createProgramSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Please fill in the required program fields.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "programs.write");
    const created = await createProgramRecord({
      orgId: org.orgId,
      slug: payload.slug,
      name: payload.name,
      description: normalizeOptional(payload.description),
      programType: payload.programType,
      customTypeLabel: payload.programType === "custom" ? normalizeOptional(payload.customTypeLabel) : null,
      status: payload.status,
      startDate: payload.startDate,
      endDate: payload.endDate,
      coverImagePath: normalizeOptional(payload.coverImagePath),
      registrationOpenAt: payload.registrationOpenAt,
      registrationCloseAt: payload.registrationCloseAt,
      settingsJson: {}
    });

    revalidatePath(`/${org.orgSlug}/tools/programs`);
    revalidatePath(`/${org.orgSlug}/programs`);

    return {
      ok: true,
      data: {
        programId: created.id
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to create this program right now.");
  }
}

export async function updateProgramAction(input: z.input<typeof updateProgramSchema>): Promise<ProgramsActionResult<{ programId: string }>> {
  const parsed = updateProgramSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Please review the program details.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "programs.write");
    const updated = await updateProgramRecord({
      orgId: org.orgId,
      programId: payload.programId,
      slug: payload.slug,
      name: payload.name,
      description: normalizeOptional(payload.description),
      programType: payload.programType,
      customTypeLabel: payload.programType === "custom" ? normalizeOptional(payload.customTypeLabel) : null,
      status: payload.status,
      startDate: payload.startDate,
      endDate: payload.endDate,
      coverImagePath: normalizeOptional(payload.coverImagePath),
      registrationOpenAt: payload.registrationOpenAt,
      registrationCloseAt: payload.registrationCloseAt,
      settingsJson: {}
    });

    revalidatePath(`/${org.orgSlug}/tools/programs`);
    revalidatePath(`/${org.orgSlug}/tools/programs/${updated.id}`);
    revalidatePath(`/${org.orgSlug}/programs`);
    revalidatePath(`/${org.orgSlug}/programs/${updated.slug}`);

    return {
      ok: true,
      data: {
        programId: updated.id
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to update this program right now.");
  }
}

export async function saveProgramHierarchyAction(input: z.input<typeof saveHierarchySchema>): Promise<ProgramsActionResult<{ details: NonNullable<Awaited<ReturnType<typeof getProgramDetailsById>>> }>> {
  const parsed = saveHierarchySchema.safeParse(input);
  if (!parsed.success) {
    return asError("Please review division details.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "programs.write");
    const program = await getProgramById(org.orgId, payload.programId);

    if (!program) {
      return asError("Program not found.");
    }

    if (payload.action === "create") {
      if (!payload.name || !payload.slug || !payload.nodeKind) {
        return asError("Division name, slug, and type are required.");
      }

      await createProgramNodeRecord({
        programId: payload.programId,
        parentId: payload.parentId ?? null,
        name: payload.name,
        slug: payload.slug,
        nodeKind: payload.nodeKind,
        capacity: payload.capacity,
        waitlistEnabled: payload.waitlistEnabled ?? false,
        settingsJson: {}
      });
    } else {
      if (!payload.nodeId) {
        return asError("Node id is required for delete.");
      }

      await deleteProgramNodeRecord(payload.programId, payload.nodeId);
    }

    const refreshedDetails = await getProgramDetailsById(org.orgId, payload.programId);
    if (!refreshedDetails) {
      return asError("Program not found.");
    }

    revalidatePath(`/${org.orgSlug}/tools/programs/${payload.programId}`);
    revalidatePath(`/${org.orgSlug}/programs/${program.slug}`);

    return {
      ok: true,
      data: {
        details: refreshedDetails
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to save divisions right now.");
  }
}

export async function saveProgramScheduleAction(input: z.input<typeof saveScheduleSchema>): Promise<ProgramsActionResult<{ details: NonNullable<Awaited<ReturnType<typeof getProgramDetailsById>>> }>> {
  const parsed = saveScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return asError("Please review schedule details.");
  }

  try {
    const payload = parsed.data;
    const org = await requireOrgPermission(payload.orgSlug, "programs.write");
    const program = await getProgramById(org.orgId, payload.programId);

    if (!program) {
      return asError("Program not found.");
    }

    if (payload.action === "create") {
      if (!payload.blockType) {
        return asError("Schedule block type is required.");
      }

      await createProgramScheduleBlockRecord({
        programId: payload.programId,
        programNodeId: payload.programNodeId ?? null,
        blockType: payload.blockType,
        title: normalizeOptional(payload.title),
        timezone: normalizeOptional(payload.timezone),
        startDate: payload.startDate,
        endDate: payload.endDate,
        startTime: normalizeOptional(payload.startTime),
        endTime: normalizeOptional(payload.endTime),
        byDay: payload.byDay ?? null,
        oneOffAt: payload.oneOffAt,
        settingsJson: {}
      });
    } else {
      if (!payload.scheduleBlockId) {
        return asError("Schedule block id is required for delete.");
      }

      await deleteProgramScheduleBlockRecord(payload.programId, payload.scheduleBlockId);
    }

    const refreshedDetails = await getProgramDetailsById(org.orgId, payload.programId);
    if (!refreshedDetails) {
      return asError("Program not found.");
    }

    revalidatePath(`/${org.orgSlug}/tools/programs/${payload.programId}`);
    revalidatePath(`/${org.orgSlug}/programs/${program.slug}`);

    return {
      ok: true,
      data: {
        details: refreshedDetails
      }
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return asError("Unable to save schedule right now.");
  }
}

export async function getPublicProgramDetails(orgSlug: string, programSlug: string) {
  const orgContext = await getOrgPublicContext(orgSlug);
  return getProgramDetailsBySlug(orgContext.orgId, programSlug, {
    includeDraft: false
  });
}

export async function getPublicProgramCatalog(orgSlug: string) {
  const orgContext = await getOrgPublicContext(orgSlug);
  return listPublishedProgramsForCatalog(orgContext.orgId);
}
