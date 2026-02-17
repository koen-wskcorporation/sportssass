import { createSupabaseServer } from "@/lib/supabase/server";
import { asOptionalButton } from "@/modules/site-builder/blocks/helpers";
import type { OrgAnnouncement } from "@/modules/announcements/types";

const announcementSelect = "id, org_id, title, summary, button, publish_at, is_published, created_at, updated_at";

type AnnouncementRow = {
  id: string;
  org_id: string;
  title: string;
  summary: string;
  button: unknown;
  publish_at: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

function mapAnnouncement(row: AnnouncementRow): OrgAnnouncement {
  return {
    id: row.id,
    orgId: row.org_id,
    title: row.title,
    summary: row.summary,
    button: asOptionalButton(row.button),
    publishAt: row.publish_at,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listOrgAnnouncements(
  orgId: string,
  options?: {
    includeUnpublished?: boolean;
    limit?: number;
  }
) {
  const includeUnpublished = options?.includeUnpublished ?? false;
  const limit = options?.limit ?? null;

  const supabase = await createSupabaseServer();

  let query = supabase.from("org_announcements").select(announcementSelect).eq("org_id", orgId).order("publish_at", { ascending: false, nullsFirst: false });

  if (!includeUnpublished) {
    const nowIso = new Date().toISOString();
    query = query.eq("is_published", true).or(`publish_at.is.null,publish_at.lte.${nowIso}`);
  }

  if (limit && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list announcements: ${error.message}`);
  }

  return (data ?? []).map((row) => mapAnnouncement(row as AnnouncementRow));
}

export async function upsertOrgAnnouncement(input: {
  id?: string;
  orgId: string;
  title: string;
  summary: string;
  button: unknown;
  publishAt: string | null;
  isPublished: boolean;
}) {
  const supabase = await createSupabaseServer();

  const payload = {
    ...(input.id ? { id: input.id } : {}),
    org_id: input.orgId,
    title: input.title,
    summary: input.summary,
    button: input.button,
    publish_at: input.publishAt,
    is_published: input.isPublished
  };

  const { data, error } = await supabase
    .from("org_announcements")
    .upsert(payload)
    .select(announcementSelect)
    .single();

  if (error) {
    throw new Error(`Failed to save announcement: ${error.message}`);
  }

  return mapAnnouncement(data as AnnouncementRow);
}

export async function deleteOrgAnnouncement(orgId: string, announcementId: string) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("org_announcements").delete().eq("org_id", orgId).eq("id", announcementId);

  if (error) {
    throw new Error(`Failed to delete announcement: ${error.message}`);
  }
}
