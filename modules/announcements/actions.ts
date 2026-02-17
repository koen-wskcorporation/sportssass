"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rethrowIfNavigationError } from "@/lib/actions/rethrowIfNavigationError";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import { buttonConfigSchema } from "@/lib/links";
import { deleteOrgAnnouncement, listOrgAnnouncements, upsertOrgAnnouncement } from "@/modules/announcements/db/queries";

const saveAnnouncementSchema = z.object({
  orgSlug: z.string().trim().min(1),
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(1200),
  button: buttonConfigSchema.nullable(),
  publishAt: z.string().trim().datetime().nullable(),
  isPublished: z.boolean()
});

const deleteAnnouncementSchema = z.object({
  orgSlug: z.string().trim().min(1),
  announcementId: z.string().uuid()
});

type AnnouncementActionResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export async function getAnnouncementsManagePageData(orgSlug: string) {
  const orgContext = await requireOrgPermission(orgSlug, "announcements.read");
  const announcements = await listOrgAnnouncements(orgContext.orgId, {
    includeUnpublished: true
  });

  return {
    orgSlug: orgContext.orgSlug,
    announcements
  };
}

export async function saveAnnouncementAction(input: {
  orgSlug: string;
  id?: string;
  title: string;
  summary: string;
  button: {
    id: string;
    label: string;
    href: string;
    variant: "primary" | "secondary" | "ghost" | "link";
    newTab?: boolean;
  } | null;
  publishAt: string | null;
  isPublished: boolean;
}): Promise<AnnouncementActionResult> {
  const parsed = saveAnnouncementSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please provide valid announcement details."
    };
  }

  try {
    const payload = parsed.data;
    const orgContext = await requireOrgPermission(payload.orgSlug, "announcements.write");

    await upsertOrgAnnouncement({
      id: payload.id,
      orgId: orgContext.orgId,
      title: payload.title,
      summary: payload.summary,
      button: payload.button,
      publishAt: payload.publishAt,
      isPublished: payload.isPublished
    });

    revalidatePath(`/${payload.orgSlug}/tools/announcements`);
    revalidatePath(`/${payload.orgSlug}`);

    return {
      ok: true
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return {
      ok: false,
      error: "Unable to save announcement right now."
    };
  }
}

export async function deleteAnnouncementAction(input: { orgSlug: string; announcementId: string }): Promise<AnnouncementActionResult> {
  const parsed = deleteAnnouncementSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid announcement deletion request."
    };
  }

  try {
    const payload = parsed.data;
    const orgContext = await requireOrgPermission(payload.orgSlug, "announcements.write");
    await deleteOrgAnnouncement(orgContext.orgId, payload.announcementId);

    revalidatePath(`/${payload.orgSlug}/tools/announcements`);
    revalidatePath(`/${payload.orgSlug}`);

    return {
      ok: true
    };
  } catch (error) {
    rethrowIfNavigationError(error);
    return {
      ok: false,
      error: "Unable to delete announcement right now."
    };
  }
}
