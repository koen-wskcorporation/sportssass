import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { CreateSponsorSubmissionInput, SponsorSubmission, SponsorSubmissionStatus } from "@/modules/sponsors/types";

const sponsorsSelect =
  "id, org_id, company_name, contact_name, contact_email, contact_phone, website, message, logo_path, status, internal_notes, created_at, updated_at";

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

export async function uploadSponsorLogo(orgId: string, submissionId: string, file: File) {
  const supabase = createSupabaseServiceRoleClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orgId}/${submissionId}/${safeName}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage.from("sponsor-assets").upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: false
  });

  if (error) {
    throw new Error(`Failed to upload sponsor logo: ${error.message}`);
  }

  return path;
}

export async function getSignedSponsorLogoUrl(path: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.storage.from("sponsor-assets").createSignedUrl(path, 60 * 10);

  if (error) {
    return null;
  }

  return data.signedUrl;
}
