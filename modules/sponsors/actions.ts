"use server";

import { redirect } from "next/navigation";
import { resolveOrg, resolvePublicOrg } from "@/lib/tenancy/resolveOrg";
import { requireOrgRole } from "@/lib/tenancy/requireOrgRole";
import {
  createSponsorSubmission,
  getSponsorSubmission,
  updateSponsorSubmissionNotes,
  updateSponsorSubmissionLogoPath,
  updateSponsorSubmissionStatus,
  uploadSponsorLogo
} from "@/modules/sponsors/db/queries";
import {
  emitSponsorSubmissionAssetUploaded,
  emitSponsorSubmissionCreated,
  emitSponsorSubmissionNotesUpdated,
  emitSponsorSubmissionStatusChanged
} from "@/modules/sponsors/events";
import { sponsorSubmissionStatuses, type SponsorSubmissionStatus } from "@/modules/sponsors/types";

function stringField(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function submitSponsorInterestAction(orgSlug: string, formData: FormData) {
  const org = await resolvePublicOrg(orgSlug);

  const companyName = stringField(formData.get("companyName"));
  const contactName = stringField(formData.get("contactName"));
  const contactEmail = stringField(formData.get("contactEmail"));
  const contactPhone = stringField(formData.get("contactPhone"));
  const website = stringField(formData.get("website"));
  const message = stringField(formData.get("message"));
  const logo = formData.get("logo");

  if (!companyName || !contactName || !contactEmail) {
    throw new Error("Company name, contact name, and contact email are required.");
  }

  const submissionId = crypto.randomUUID();
  let logoPath: string | null = null;

  if (logo instanceof File && logo.size > 0) {
    logoPath = await uploadSponsorLogo(org.orgId, submissionId, logo);
  }

  const submission = await createSponsorSubmission({
    id: submissionId,
    org_id: org.orgId,
    company_name: companyName,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone || null,
    website: website || null,
    message: message || null,
    logo_path: logoPath
  });

  await emitSponsorSubmissionCreated({
    orgId: org.orgId,
    submissionId: submission.id,
    companyName,
    actorUserId: undefined
  });

  redirect(`/org/${orgSlug}/sponsor/success`);
}

export async function updateSponsorStatusAction(orgSlug: string, submissionId: string, formData: FormData) {
  const org = await resolveOrg(orgSlug);
  requireOrgRole(org.membershipRole, "manager");

  const statusValue = stringField(formData.get("status"));

  if (!sponsorSubmissionStatuses.includes(statusValue as SponsorSubmissionStatus)) {
    throw new Error("Invalid status value.");
  }

  const status = statusValue as SponsorSubmissionStatus;
  const submission = await updateSponsorSubmissionStatus(org.orgId, submissionId, status);

  await emitSponsorSubmissionStatusChanged({
    orgId: org.orgId,
    submissionId: submission.id,
    companyName: submission.company_name,
    actorUserId: org.userId,
    status
  });

  redirect(`/app/org/${orgSlug}/sponsors/${submissionId}?statusUpdated=1`);
}

export async function updateSponsorNotesAction(orgSlug: string, submissionId: string, formData: FormData) {
  const org = await resolveOrg(orgSlug);
  requireOrgRole(org.membershipRole, "manager");

  const notes = stringField(formData.get("internalNotes"));
  const submission = await getSponsorSubmission(org.orgId, submissionId);

  await updateSponsorSubmissionNotes(org.orgId, submission.id, notes || null);

  await emitSponsorSubmissionAssetUploaded({
    orgId: org.orgId,
    submissionId: submission.id,
    companyName: submission.company_name,
    actorUserId: org.userId
  });

  redirect(`/app/org/${orgSlug}/sponsors/${submissionId}?notesSaved=1`);
}

export async function uploadSponsorAssetAction(orgSlug: string, submissionId: string, formData: FormData) {
  const org = await resolveOrg(orgSlug);
  requireOrgRole(org.membershipRole, "manager");

  const logo = formData.get("logo");

  if (!(logo instanceof File) || logo.size === 0) {
    throw new Error("Please select a file to upload.");
  }

  const submission = await getSponsorSubmission(org.orgId, submissionId);
  const logoPath = await uploadSponsorLogo(org.orgId, submission.id, logo);
  await updateSponsorSubmissionLogoPath(org.orgId, submission.id, logoPath);

  await emitSponsorSubmissionNotesUpdated({
    orgId: org.orgId,
    submissionId: submission.id,
    companyName: submission.company_name,
    actorUserId: org.userId
  });

  redirect(`/app/org/${orgSlug}/sponsors/${submissionId}?assetUploaded=1`);
}
