"use server";

import { redirect } from "next/navigation";
import { getOrgPublicContext } from "@/lib/org/getOrgPublicContext";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import { rethrowIfNavigationError } from "@/lib/actions/rethrowIfNavigationError";
import { isUploadError } from "@/lib/uploads/errors";
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

function mapUploadErrorToQuery(error: unknown) {
  if (!isUploadError(error)) {
    return "upload_failed";
  }

  switch (error.code) {
    case "unsupported_file_type":
      return "unsupported_file_type";
    case "file_too_large":
      return "file_too_large";
    case "storage_not_configured":
      return "upload_not_configured";
    default:
      return "upload_failed";
  }
}

export async function submitSponsorInterestAction(orgSlug: string, formData: FormData) {
  try {
    const org = await getOrgPublicContext(orgSlug);

    const companyName = stringField(formData.get("companyName"));
    const contactName = stringField(formData.get("contactName"));
    const contactEmail = stringField(formData.get("contactEmail"));
    const contactPhone = stringField(formData.get("contactPhone"));
    const website = stringField(formData.get("website"));
    const message = stringField(formData.get("message"));
    const logo = formData.get("logo");

    if (!companyName || !contactName || !contactEmail) {
      redirect(`/${orgSlug}/sponsors?error=missing_required`);
    }

    const submissionId = crypto.randomUUID();
    let logoPath: string | null = null;

    if (logo instanceof File && logo.size > 0) {
      try {
        logoPath = await uploadSponsorLogo(org.orgId, submissionId, logo, {
          requiresServiceRole: true
        });
      } catch (error) {
        redirect(`/${orgSlug}/sponsors?error=${mapUploadErrorToQuery(error)}`);
      }
    }

    try {
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

      try {
        await emitSponsorSubmissionCreated({
          orgId: org.orgId,
          submissionId: submission.id,
          companyName,
          actorUserId: undefined
        });
      } catch {
        // Non-blocking: event stream write issues should not fail the user submission.
      }
    } catch {
      redirect(`/${orgSlug}/sponsors?error=submission_failed`);
    }

    redirect(`/${orgSlug}/sponsors/success`);
  } catch (error) {
    rethrowIfNavigationError(error);
    redirect(`/${orgSlug}/sponsors?error=submission_failed`);
  }
}

export async function updateSponsorStatusAction(orgSlug: string, submissionId: string, formData: FormData) {
  try {
    const org = await requireOrgPermission(orgSlug, "sponsors.write");

    const statusValue = stringField(formData.get("status"));

    if (!sponsorSubmissionStatuses.includes(statusValue as SponsorSubmissionStatus)) {
      redirect(`/${orgSlug}/sponsors/manage/${submissionId}?error=status_update_failed`);
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

    redirect(`/${orgSlug}/sponsors/manage/${submissionId}?statusUpdated=1`);
  } catch (error) {
    rethrowIfNavigationError(error);
    redirect(`/${orgSlug}/sponsors/manage/${submissionId}?error=status_update_failed`);
  }
}

export async function updateSponsorNotesAction(orgSlug: string, submissionId: string, formData: FormData) {
  try {
    const org = await requireOrgPermission(orgSlug, "sponsors.write");

    const notes = stringField(formData.get("internalNotes"));
    const submission = await getSponsorSubmission(org.orgId, submissionId);

    await updateSponsorSubmissionNotes(org.orgId, submission.id, notes || null);

    await emitSponsorSubmissionNotesUpdated({
      orgId: org.orgId,
      submissionId: submission.id,
      companyName: submission.company_name,
      actorUserId: org.userId
    });

    redirect(`/${orgSlug}/sponsors/manage/${submissionId}?notesSaved=1`);
  } catch (error) {
    rethrowIfNavigationError(error);
    redirect(`/${orgSlug}/sponsors/manage/${submissionId}?error=notes_save_failed`);
  }
}

export async function uploadSponsorAssetAction(orgSlug: string, submissionId: string, formData: FormData) {
  try {
    const org = await requireOrgPermission(orgSlug, "sponsors.write");

    const logo = formData.get("logo");

    if (!(logo instanceof File) || logo.size === 0) {
      redirect(`/${orgSlug}/sponsors/manage/${submissionId}?error=missing_file`);
    }

    const submission = await getSponsorSubmission(org.orgId, submissionId);
    let logoPath: string;

    try {
      logoPath = await uploadSponsorLogo(org.orgId, submission.id, logo);
    } catch (error) {
      redirect(`/${orgSlug}/sponsors/manage/${submissionId}?error=${mapUploadErrorToQuery(error)}`);
    }

    await updateSponsorSubmissionLogoPath(org.orgId, submission.id, logoPath);

    try {
      await emitSponsorSubmissionAssetUploaded({
        orgId: org.orgId,
        submissionId: submission.id,
        companyName: submission.company_name,
        actorUserId: org.userId
      });
    } catch {
      // Non-blocking: event stream write issues should not fail asset upload UX.
    }

    redirect(`/${orgSlug}/sponsors/manage/${submissionId}?assetUploaded=1`);
  } catch (error) {
    rethrowIfNavigationError(error);
    redirect(`/${orgSlug}/sponsors/manage/${submissionId}?error=upload_failed`);
  }
}
