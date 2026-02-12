import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOptionalSupabaseServiceRoleClient, createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { UploadError } from "@/lib/uploads/errors";
import type { CreateSponsorSubmissionInput, SponsorSubmission, SponsorSubmissionStatus } from "@/modules/sponsors/types";

const sponsorsSelect =
  "id, org_id, company_name, contact_name, contact_email, contact_phone, website, message, logo_path, status, internal_notes, created_at, updated_at";
const MAX_SPONSOR_ASSET_SIZE_BYTES = 10 * 1024 * 1024;

const sponsorLogoExtensionByMimeType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg"
};

function getSponsorLogoExtension(file: File) {
  const byMimeType = sponsorLogoExtensionByMimeType[file.type];
  if (byMimeType) {
    return byMimeType;
  }

  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["png", "jpg", "jpeg", "svg"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  throw new UploadError("unsupported_file_type", "Unsupported sponsor logo file type.");
}

export async function listSponsorSubmissions(orgId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("sponsor_submissions")
    .select(sponsorsSelect)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list sponsor submissions: ${error.message}`);
  }

  return (data ?? []) as SponsorSubmission[];
}

export async function getSponsorSubmission(orgId: string, submissionId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("sponsor_submissions")
    .select(sponsorsSelect)
    .eq("org_id", orgId)
    .eq("id", submissionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load sponsor submission: ${error.message}`);
  }

  if (!data) {
    notFound();
  }

  return data as SponsorSubmission;
}

export async function createSponsorSubmission(input: CreateSponsorSubmissionInput) {
  const supabase = createSupabaseServiceRoleClient();

  const { data, error } = await supabase
    .from("sponsor_submissions")
    .insert({
      id: input.id,
      org_id: input.org_id,
      company_name: input.company_name,
      contact_name: input.contact_name,
      contact_email: input.contact_email,
      contact_phone: input.contact_phone ?? null,
      website: input.website ?? null,
      message: input.message ?? null,
      logo_path: input.logo_path ?? null,
      status: "submitted"
    })
    .select(sponsorsSelect)
    .single();

  if (error) {
    throw new Error(`Failed to create sponsor submission: ${error.message}`);
  }

  return data as SponsorSubmission;
}

export async function updateSponsorSubmissionStatus(orgId: string, submissionId: string, status: SponsorSubmissionStatus) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("sponsor_submissions")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("org_id", orgId)
    .eq("id", submissionId)
    .select(sponsorsSelect)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update sponsor submission status: ${error.message}`);
  }

  if (!data) {
    notFound();
  }

  return data as SponsorSubmission;
}

export async function updateSponsorSubmissionNotes(orgId: string, submissionId: string, notes: string | null) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("sponsor_submissions")
    .update({
      internal_notes: notes,
      updated_at: new Date().toISOString()
    })
    .eq("org_id", orgId)
    .eq("id", submissionId)
    .select(sponsorsSelect)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update sponsor notes: ${error.message}`);
  }

  if (!data) {
    notFound();
  }

  return data as SponsorSubmission;
}

export async function updateSponsorSubmissionLogoPath(orgId: string, submissionId: string, logoPath: string | null) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("sponsor_submissions")
    .update({
      logo_path: logoPath,
      updated_at: new Date().toISOString()
    })
    .eq("org_id", orgId)
    .eq("id", submissionId)
    .select(sponsorsSelect)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update sponsor logo path: ${error.message}`);
  }

  if (!data) {
    notFound();
  }

  return data as SponsorSubmission;
}

export async function uploadSponsorLogo(
  orgId: string,
  submissionId: string,
  file: File,
  options?: {
    requiresServiceRole?: boolean;
  }
) {
  if (file.size > MAX_SPONSOR_ASSET_SIZE_BYTES) {
    throw new UploadError("file_too_large", "Sponsor asset exceeds the 10MB limit.");
  }

  const extension = getSponsorLogoExtension(file);
  const path = `${orgId}/${submissionId}/logo.${extension}`;
  const requiresServiceRole = options?.requiresServiceRole ?? false;
  const supabase = requiresServiceRole
    ? createOptionalSupabaseServiceRoleClient()
    : await createSupabaseServerClient();

  if (!supabase) {
    throw new UploadError(
      "storage_not_configured",
      "Public sponsor file uploads require SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) on the server."
    );
  }

  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage.from("sponsor-assets").upload(path, arrayBuffer, {
    contentType: file.type || undefined,
    upsert: true
  });

  if (error) {
    throw new UploadError("storage_upload_failed", `Failed to upload sponsor logo: ${error.message}`);
  }

  return path;
}

export async function getSignedSponsorLogoUrl(path: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from("sponsor-assets").createSignedUrl(path, 60 * 10);

  if (!error) {
    return data.signedUrl;
  }

  const serviceRoleClient = createOptionalSupabaseServiceRoleClient();
  if (!serviceRoleClient) {
    return null;
  }

  const { data: fallbackData, error: fallbackError } = await serviceRoleClient.storage
    .from("sponsor-assets")
    .createSignedUrl(path, 60 * 10);

  if (fallbackError) {
    return null;
  }

  return fallbackData.signedUrl;
}
