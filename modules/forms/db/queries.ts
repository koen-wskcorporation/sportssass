import { createSupabaseServer } from "@/lib/supabase/server";
import { createOptionalSupabaseServiceRoleClient, createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import {
  sanitizeFormBehaviorJson,
  sanitizeFormDefinitionStatus,
  sanitizeFormSnapshot,
  sanitizeFormSubmissionStatus,
  sanitizeFormThemeJson,
  sanitizeFormUiJson,
  sanitizeFormSchemaJson,
  sanitizeSponsorProfileStatus
} from "@/modules/forms/schema";
import type {
  AuditLog,
  FormDefinition,
  FormListItem,
  FormSnapshot,
  FormSubmission,
  FormSubmissionStatus,
  FormVersion,
  PublishedFormRuntime,
  SponsorProfile,
  SponsorProfileStatus
} from "@/modules/forms/types";

const formDefinitionSelect = "id, org_id, slug, name, status, schema_json, ui_json, theme_json, behavior_json, created_at, updated_at";
const formVersionSelect = "id, org_id, form_id, version_number, snapshot_json, published_at, created_by, created_at";
const formSubmissionSelect = "id, org_id, form_id, version_id, answers_json, metadata_json, status, created_at";
const sponsorProfileSelect = "id, org_id, name, logo_asset_id, website_url, tier, status, submission_id, created_at, updated_at";
const auditLogSelect = "id, org_id, actor_user_id, action, entity_type, entity_id, detail_json, created_at";

type FormDefinitionRow = {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  status: string;
  schema_json: unknown;
  ui_json: unknown;
  theme_json: unknown;
  behavior_json: unknown;
  created_at: string;
  updated_at: string;
};

type FormVersionRow = {
  id: string;
  org_id: string;
  form_id: string;
  version_number: number;
  snapshot_json: unknown;
  published_at: string;
  created_by: string | null;
  created_at: string;
};

type FormSubmissionRow = {
  id: string;
  org_id: string;
  form_id: string;
  version_id: string;
  answers_json: unknown;
  metadata_json: unknown;
  status: string;
  created_at: string;
};

type SponsorProfileRow = {
  id: string;
  org_id: string;
  name: string;
  logo_asset_id: string | null;
  website_url: string | null;
  tier: string | null;
  status: string;
  submission_id: string | null;
  created_at: string;
  updated_at: string;
};

type AuditLogRow = {
  id: string;
  org_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail_json: unknown;
  created_at: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function mapFormDefinition(row: FormDefinitionRow): FormDefinition {
  return {
    id: row.id,
    orgId: row.org_id,
    slug: row.slug,
    name: row.name,
    status: sanitizeFormDefinitionStatus(row.status),
    schemaJson: sanitizeFormSchemaJson(row.schema_json),
    uiJson: sanitizeFormUiJson(row.ui_json),
    themeJson: sanitizeFormThemeJson(row.theme_json),
    behaviorJson: sanitizeFormBehaviorJson(row.behavior_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapFormVersion(row: FormVersionRow): FormVersion {
  return {
    id: row.id,
    orgId: row.org_id,
    formId: row.form_id,
    versionNumber: Number(row.version_number) || 1,
    snapshotJson: sanitizeFormSnapshot(row.snapshot_json),
    publishedAt: row.published_at,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

function mapFormSubmission(row: FormSubmissionRow): FormSubmission {
  return {
    id: row.id,
    orgId: row.org_id,
    formId: row.form_id,
    versionId: row.version_id,
    answersJson: asRecord(row.answers_json),
    metadataJson: asRecord(row.metadata_json),
    status: sanitizeFormSubmissionStatus(row.status),
    createdAt: row.created_at
  };
}

function mapSponsorProfile(row: SponsorProfileRow): SponsorProfile {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    logoAssetId: row.logo_asset_id,
    websiteUrl: row.website_url,
    tier: row.tier,
    status: sanitizeSponsorProfileStatus(row.status),
    submissionId: row.submission_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    orgId: row.org_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    detailJson: asRecord(row.detail_json),
    createdAt: row.created_at
  };
}

function buildSnapshot(definition: FormDefinition): FormSnapshot {
  return {
    schema: definition.schemaJson,
    ui: definition.uiJson,
    theme: definition.themeJson,
    behavior: definition.behaviorJson
  };
}

async function createFormAssetsSignedUrl(path: string) {
  const buckets = ["form-assets", "sponsor-assets"] as const;
  const serviceRoleClient = createOptionalSupabaseServiceRoleClient();

  if (serviceRoleClient) {
    for (const bucket of buckets) {
      const { data, error } = await serviceRoleClient.storage.from(bucket).createSignedUrl(path, 60 * 10);

      if (!error) {
        return data.signedUrl;
      }
    }
  }

  const supabase = await createSupabaseServer();
  for (const bucket of buckets) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);

    if (!error) {
      return data.signedUrl;
    }
  }

  return null;
}

export async function listFormDefinitions(orgId: string): Promise<FormListItem[]> {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase.from("form_definitions").select(formDefinitionSelect).eq("org_id", orgId).order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list forms: ${error.message}`);
  }

  const definitions = (data ?? []).map((row) => mapFormDefinition(row as FormDefinitionRow));

  if (definitions.length === 0) {
    return [];
  }

  const { data: versions, error: versionsError } = await supabase
    .from("form_versions")
    .select("form_id, published_at, version_number")
    .in(
      "form_id",
      definitions.map((definition) => definition.id)
    )
    .order("version_number", { ascending: false });

  if (versionsError) {
    throw new Error(`Failed to list form versions: ${versionsError.message}`);
  }

  const latestPublishedByFormId = new Map<string, string>();

  for (const row of versions ?? []) {
    const formId = String((row as { form_id: string }).form_id);

    if (latestPublishedByFormId.has(formId)) {
      continue;
    }

    latestPublishedByFormId.set(formId, String((row as { published_at: string }).published_at));
  }

  return definitions.map((definition) => ({
    id: definition.id,
    slug: definition.slug,
    name: definition.name,
    status: definition.status,
    updatedAt: definition.updatedAt,
    lastPublishedAt: latestPublishedByFormId.get(definition.id) ?? null
  }));
}

export async function getFormDefinitionById(orgId: string, formId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("form_definitions")
    .select(formDefinitionSelect)
    .eq("org_id", orgId)
    .eq("id", formId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load form definition: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapFormDefinition(data as FormDefinitionRow);
}

export async function getFormDefinitionBySlug(orgId: string, slug: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("form_definitions")
    .select(formDefinitionSelect)
    .eq("org_id", orgId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load form definition by slug: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapFormDefinition(data as FormDefinitionRow);
}

export async function createFormDefinition(input: {
  orgId: string;
  slug: string;
  name: string;
  status: string;
  schemaJson: unknown;
  uiJson: unknown;
  themeJson: unknown;
  behaviorJson: unknown;
}) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("form_definitions")
    .insert({
      org_id: input.orgId,
      slug: input.slug,
      name: input.name,
      status: sanitizeFormDefinitionStatus(input.status),
      schema_json: sanitizeFormSchemaJson(input.schemaJson),
      ui_json: sanitizeFormUiJson(input.uiJson),
      theme_json: sanitizeFormThemeJson(input.themeJson),
      behavior_json: sanitizeFormBehaviorJson(input.behaviorJson)
    })
    .select(formDefinitionSelect)
    .single();

  if (error) {
    throw new Error(`Failed to create form: ${error.message}`);
  }

  return mapFormDefinition(data as FormDefinitionRow);
}

async function formSlugExists(orgId: string, slug: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("form_definitions")
    .select("id")
    .eq("org_id", orgId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check form slug: ${error.message}`);
  }

  return Boolean(data?.id);
}

export async function resolveNextCopySlug(orgId: string, sourceSlug: string) {
  const base = `${sourceSlug}-copy`.slice(0, 110);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const exists = await formSlugExists(orgId, candidate);

    if (!exists) {
      return candidate;
    }

    candidate = `${base}-${suffix}`.slice(0, 120);
    suffix += 1;
  }
}

export async function updateFormDefinitionDraft(input: {
  orgId: string;
  formId: string;
  slug: string;
  name: string;
  schemaJson: unknown;
  uiJson: unknown;
  themeJson: unknown;
  behaviorJson: unknown;
}) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("form_definitions")
    .update({
      slug: input.slug,
      name: input.name,
      schema_json: sanitizeFormSchemaJson(input.schemaJson),
      ui_json: sanitizeFormUiJson(input.uiJson),
      theme_json: sanitizeFormThemeJson(input.themeJson),
      behavior_json: sanitizeFormBehaviorJson(input.behaviorJson)
    })
    .eq("org_id", input.orgId)
    .eq("id", input.formId)
    .select(formDefinitionSelect)
    .single();

  if (error) {
    throw new Error(`Failed to save form draft: ${error.message}`);
  }

  return mapFormDefinition(data as FormDefinitionRow);
}

export async function archiveFormDefinition(orgId: string, formId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("form_definitions")
    .update({
      status: "archived"
    })
    .eq("org_id", orgId)
    .eq("id", formId)
    .select(formDefinitionSelect)
    .single();

  if (error) {
    throw new Error(`Failed to archive form: ${error.message}`);
  }

  return mapFormDefinition(data as FormDefinitionRow);
}

export async function getLatestFormVersion(orgId: string, formId: string) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("form_versions")
    .select(formVersionSelect)
    .eq("org_id", orgId)
    .eq("form_id", formId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load form version: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapFormVersion(data as FormVersionRow);
}

export async function getFormVersionById(orgId: string, versionId: string) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("form_versions")
    .select(formVersionSelect)
    .eq("org_id", orgId)
    .eq("id", versionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load form version by id: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapFormVersion(data as FormVersionRow);
}

export async function publishFormDefinition(input: { orgId: string; formId: string; createdBy: string }) {
  const definition = await getFormDefinitionById(input.orgId, input.formId);

  if (!definition) {
    throw new Error("Form definition not found.");
  }

  const latestVersion = await getLatestFormVersion(input.orgId, input.formId);
  const nextVersion = (latestVersion?.versionNumber ?? 0) + 1;
  const snapshot = buildSnapshot(definition);

  const supabase = await createSupabaseServer();

  const { data: insertedVersion, error: versionError } = await supabase
    .from("form_versions")
    .insert({
      org_id: input.orgId,
      form_id: input.formId,
      version_number: nextVersion,
      snapshot_json: snapshot,
      published_at: new Date().toISOString(),
      created_by: input.createdBy
    })
    .select(formVersionSelect)
    .single();

  if (versionError) {
    throw new Error(`Failed to publish form version: ${versionError.message}`);
  }

  const { data: updatedDefinition, error: definitionError } = await supabase
    .from("form_definitions")
    .update({
      status: "published"
    })
    .eq("org_id", input.orgId)
    .eq("id", input.formId)
    .select(formDefinitionSelect)
    .single();

  if (definitionError) {
    throw new Error(`Failed to update published form state: ${definitionError.message}`);
  }

  return {
    definition: mapFormDefinition(updatedDefinition as FormDefinitionRow),
    version: mapFormVersion(insertedVersion as FormVersionRow)
  };
}

export async function listPublishedForms(orgId: string): Promise<PublishedFormRuntime[]> {
  const supabase = await createSupabaseServer();

  const { data: definitions, error } = await supabase
    .from("form_definitions")
    .select(formDefinitionSelect)
    .eq("org_id", orgId)
    .eq("status", "published")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to list published forms: ${error.message}`);
  }

  if (!definitions || definitions.length === 0) {
    return [];
  }

  const mappedDefinitions = definitions.map((row) => mapFormDefinition(row as FormDefinitionRow));
  const formIds = mappedDefinitions.map((definition) => definition.id);

  const { data: versions, error: versionsError } = await supabase
    .from("form_versions")
    .select(formVersionSelect)
    .in("form_id", formIds)
    .order("version_number", { ascending: false });

  if (versionsError) {
    throw new Error(`Failed to list published form versions: ${versionsError.message}`);
  }

  const latestVersionByForm = new Map<string, FormVersion>();

  for (const row of versions ?? []) {
    const version = mapFormVersion(row as FormVersionRow);

    if (latestVersionByForm.has(version.formId)) {
      continue;
    }

    latestVersionByForm.set(version.formId, version);
  }

  return mappedDefinitions.flatMap((definition) => {
    const latest = latestVersionByForm.get(definition.id);

    if (!latest) {
      return [];
    }

    return [
      {
        id: definition.id,
        slug: definition.slug,
        name: definition.name,
        versionId: latest.id,
        versionNumber: latest.versionNumber,
        snapshot: latest.snapshotJson,
        publishedAt: latest.publishedAt
      }
    ];
  });
}

export async function getPublishedFormRuntimeBySlug(orgId: string, slug: string) {
  const forms = await listPublishedForms(orgId);
  return forms.find((form) => form.slug === slug) ?? null;
}

function getSubmissionServiceClient() {
  const serviceClient = createOptionalSupabaseServiceRoleClient();

  if (!serviceClient) {
    throw new Error("Form submissions require SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return serviceClient;
}

export async function countRecentSubmissionAttempts(input: { orgId: string; formId: string; ipHash: string; sinceIso: string }) {
  const supabase = getSubmissionServiceClient();

  const { count, error } = await supabase
    .from("form_submission_attempts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", input.orgId)
    .eq("form_id", input.formId)
    .eq("ip_hash", input.ipHash)
    .gte("created_at", input.sinceIso);

  if (error) {
    throw new Error(`Failed to count submission attempts: ${error.message}`);
  }

  return count ?? 0;
}

export async function recordSubmissionAttempt(input: { orgId: string; formId: string; ipHash: string }) {
  const supabase = getSubmissionServiceClient();

  const { error } = await supabase.from("form_submission_attempts").insert({
    org_id: input.orgId,
    form_id: input.formId,
    ip_hash: input.ipHash
  });

  if (error) {
    throw new Error(`Failed to record submission attempt: ${error.message}`);
  }
}

export async function createFormSubmission(input: {
  orgId: string;
  formId: string;
  versionId: string;
  answersJson: Record<string, unknown>;
  metadataJson: Record<string, unknown>;
  status?: FormSubmissionStatus;
}) {
  const supabase = getSubmissionServiceClient();

  const { data, error } = await supabase
    .from("form_submissions")
    .insert({
      org_id: input.orgId,
      form_id: input.formId,
      version_id: input.versionId,
      answers_json: input.answersJson,
      metadata_json: input.metadataJson,
      status: input.status ?? "submitted"
    })
    .select(formSubmissionSelect)
    .single();

  if (error) {
    throw new Error(`Failed to create form submission: ${error.message}`);
  }

  return mapFormSubmission(data as FormSubmissionRow);
}

export async function listFormSubmissions(
  orgId: string,
  options?: {
    formId?: string;
    status?: FormSubmissionStatus | "all";
  }
) {
  const supabase = await createSupabaseServer();
  let query = supabase.from("form_submissions").select(formSubmissionSelect).eq("org_id", orgId).order("created_at", { ascending: false });

  if (options?.formId) {
    query = query.eq("form_id", options.formId);
  }

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list form submissions: ${error.message}`);
  }

  return (data ?? []).map((row) => mapFormSubmission(row as FormSubmissionRow));
}

export async function getFormSubmissionById(orgId: string, submissionId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("form_submissions")
    .select(formSubmissionSelect)
    .eq("org_id", orgId)
    .eq("id", submissionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load form submission: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapFormSubmission(data as FormSubmissionRow);
}

export async function listSponsorProfiles(orgId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("sponsor_profiles")
    .select(sponsorProfileSelect)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list sponsor profiles: ${error.message}`);
  }

  return (data ?? []).map((row) => mapSponsorProfile(row as SponsorProfileRow));
}

export async function getSponsorProfile(orgId: string, profileId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("sponsor_profiles")
    .select(sponsorProfileSelect)
    .eq("org_id", orgId)
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load sponsor profile: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapSponsorProfile(data as SponsorProfileRow);
}

export async function upsertSponsorProfileFromSubmission(input: {
  orgId: string;
  submissionId: string;
  name: string;
  logoAssetId: string | null;
  websiteUrl: string | null;
  tier: string | null;
}) {
  const supabase = createSupabaseServiceRoleClient();

  const { data: existing, error: existingError } = await supabase
    .from("sponsor_profiles")
    .select(sponsorProfileSelect)
    .eq("org_id", input.orgId)
    .eq("submission_id", input.submissionId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check sponsor profile upsert: ${existingError.message}`);
  }

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from("sponsor_profiles")
      .update({
        name: input.name,
        logo_asset_id: input.logoAssetId,
        website_url: input.websiteUrl,
        tier: input.tier,
        status: "pending"
      })
      .eq("id", existing.id)
      .select(sponsorProfileSelect)
      .single();

    if (updateError) {
      throw new Error(`Failed to update sponsor profile from submission: ${updateError.message}`);
    }

    return mapSponsorProfile(updated as SponsorProfileRow);
  }

  const { data, error } = await supabase
    .from("sponsor_profiles")
    .insert({
      org_id: input.orgId,
      submission_id: input.submissionId,
      name: input.name,
      logo_asset_id: input.logoAssetId,
      website_url: input.websiteUrl,
      tier: input.tier,
      status: "pending"
    })
    .select(sponsorProfileSelect)
    .single();

  if (error) {
    throw new Error(`Failed to create sponsor profile from submission: ${error.message}`);
  }

  return mapSponsorProfile(data as SponsorProfileRow);
}

export async function updateSponsorProfileStatus(orgId: string, profileId: string, status: SponsorProfileStatus) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("sponsor_profiles")
    .update({
      status
    })
    .eq("org_id", orgId)
    .eq("id", profileId)
    .select(sponsorProfileSelect)
    .single();

  if (error) {
    throw new Error(`Failed to update sponsor profile status: ${error.message}`);
  }

  return mapSponsorProfile(data as SponsorProfileRow);
}

export async function listPublishedSponsorProfiles(orgId: string) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("sponsor_profiles")
    .select(sponsorProfileSelect)
    .eq("org_id", orgId)
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list published sponsor profiles: ${error.message}`);
  }

  const profiles = (data ?? []).map((row) => mapSponsorProfile(row as SponsorProfileRow));

  return Promise.all(
    profiles.map(async (profile) => {
      const logoUrl = profile.logoAssetId ? await createFormAssetsSignedUrl(profile.logoAssetId) : null;

      return {
        ...profile,
        logoUrl
      };
    })
  );
}

export async function listPublishedSponsorLogos(orgId: string) {
  const profiles = await listPublishedSponsorProfiles(orgId);

  return profiles
    .filter((profile) => Boolean(profile.logoUrl))
    .map((profile) => ({
      id: profile.id,
      companyName: profile.name,
      logoUrl: profile.logoUrl ?? ""
    }));
}

export async function createAuditLog(input: {
  orgId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  detailJson?: Record<string, unknown>;
}) {
  const serviceRoleClient = createOptionalSupabaseServiceRoleClient();
  const supabase = serviceRoleClient ?? (await createSupabaseServer());

  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      org_id: input.orgId,
      actor_user_id: input.actorUserId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      detail_json: input.detailJson ?? {}
    })
    .select(auditLogSelect)
    .single();

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`);
  }

  return mapAuditLog(data as AuditLogRow);
}

export async function listAuditLogs(orgId: string) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase.from("audit_logs").select(auditLogSelect).eq("org_id", orgId).order("created_at", { ascending: false }).limit(200);

  if (error) {
    throw new Error(`Failed to list audit logs: ${error.message}`);
  }

  return (data ?? []).map((row) => mapAuditLog(row as AuditLogRow));
}
