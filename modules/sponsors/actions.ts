"use server";

import { redirect } from "next/navigation";
import { requireOrgPermission } from "@/lib/permissions/requireOrgPermission";
import { rethrowIfNavigationError } from "@/lib/actions/rethrowIfNavigationError";
import { updateSponsorProfileStatus } from "@/modules/sponsors/db/queries";
import { sponsorProfileStatuses, type SponsorProfileStatus } from "@/modules/sponsors/types";

function stringField(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function updateSponsorProfileStatusAction(orgSlug: string, profileId: string, formData: FormData) {
  try {
    const org = await requireOrgPermission(orgSlug, "sponsors.write");
    const statusValue = stringField(formData.get("status"));

    if (!sponsorProfileStatuses.includes(statusValue as SponsorProfileStatus)) {
      redirect(`/${orgSlug}/tools/sponsors/manage/${profileId}?error=status_update_failed`);
    }

    await updateSponsorProfileStatus(org.orgId, profileId, statusValue as SponsorProfileStatus);
    redirect(`/${orgSlug}/tools/sponsors/manage/${profileId}?statusUpdated=1`);
  } catch (error) {
    rethrowIfNavigationError(error);
    redirect(`/${orgSlug}/tools/sponsors/manage/${profileId}?error=status_update_failed`);
  }
}

export async function submitSponsorInterestAction(orgSlug: string) {
  redirect(`/${orgSlug}/forms/sponsorship-intake`);
}
