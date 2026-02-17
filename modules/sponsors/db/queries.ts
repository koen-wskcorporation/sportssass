import { createSupabaseServer } from "@/lib/supabase/server";
import { createOptionalSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import {
  getFormSubmissionById,
  getFormVersionById,
  getSponsorProfile as getSponsorProfileRecord,
  listPublishedSponsorLogos as listPublishedSponsorLogosRecord,
  listPublishedSponsorProfiles as listPublishedSponsorProfilesRecord,
  listSponsorProfiles as listSponsorProfilesRecord,
  updateSponsorProfileStatus as updateSponsorProfileStatusRecord
} from "@/modules/forms/db/queries";
import type { FormSubmission, FormVersion } from "@/modules/forms/types";
import type { SponsorProfileListItem, SponsorProfileStatus } from "@/modules/sponsors/types";

type SponsorProfileDetail = {
  profile: SponsorProfileListItem;
  submission: FormSubmission | null;
  version: FormVersion | null;
};

function mapProfile(
  profile: {
    id: string;
    orgId: string;
    name: string;
    logoAssetId: string | null;
    websiteUrl: string | null;
    tier: string | null;
    status: SponsorProfileStatus;
    submissionId: string | null;
    createdAt: string;
    updatedAt: string;
  },
  logoUrl: string | null
): SponsorProfileListItem {
  return {
    id: profile.id,
    orgId: profile.orgId,
    name: profile.name,
    logoAssetId: profile.logoAssetId,
    logoUrl,
    websiteUrl: profile.websiteUrl,
    tier: profile.tier,
    status: profile.status,
    submissionId: profile.submissionId,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}

export async function getSignedSponsorLogoUrl(path: string) {
  const buckets = ["form-assets", "sponsor-assets"] as const;
  const supabase = await createSupabaseServer();
  for (const bucket of buckets) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);

    if (!error) {
      return data.signedUrl;
    }
  }

  const serviceRoleClient = createOptionalSupabaseServiceRoleClient();

  if (!serviceRoleClient) {
    return null;
  }

  for (const bucket of buckets) {
    const { data: fallbackData, error: fallbackError } = await serviceRoleClient.storage.from(bucket).createSignedUrl(path, 60 * 10);

    if (!fallbackError) {
      return fallbackData.signedUrl;
    }
  }

  return null;
}

export async function listSponsorProfilesForManage(orgId: string) {
  const profiles = await listSponsorProfilesRecord(orgId);

  return Promise.all(
    profiles.map(async (profile) => {
      const logoUrl = profile.logoAssetId ? await getSignedSponsorLogoUrl(profile.logoAssetId) : null;
      return mapProfile(profile, logoUrl);
    })
  );
}

export async function getSponsorProfileDetail(orgId: string, profileId: string): Promise<SponsorProfileDetail | null> {
  const profile = await getSponsorProfileRecord(orgId, profileId);

  if (!profile) {
    return null;
  }

  const logoUrl = profile.logoAssetId ? await getSignedSponsorLogoUrl(profile.logoAssetId) : null;
  const submission = profile.submissionId ? await getFormSubmissionById(orgId, profile.submissionId) : null;
  const version = submission ? await getFormVersionById(orgId, submission.versionId) : null;

  return {
    profile: mapProfile(profile, logoUrl),
    submission,
    version
  };
}

export async function updateSponsorProfileStatus(orgId: string, profileId: string, status: SponsorProfileStatus) {
  const updated = await updateSponsorProfileStatusRecord(orgId, profileId, status);
  const logoUrl = updated.logoAssetId ? await getSignedSponsorLogoUrl(updated.logoAssetId) : null;

  return mapProfile(updated, logoUrl);
}

export async function listPublishedSponsorProfiles(orgId: string) {
  const profiles = await listPublishedSponsorProfilesRecord(orgId);

  return profiles.map((profile) =>
    mapProfile(
      {
        ...profile,
        status: profile.status as SponsorProfileStatus
      },
      profile.logoUrl
    )
  );
}

export async function listPublishedSponsorLogos(orgId: string) {
  return listPublishedSponsorLogosRecord(orgId);
}
