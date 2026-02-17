export const sponsorProfileStatuses = ["draft", "pending", "approved", "published"] as const;

export type SponsorProfileStatus = (typeof sponsorProfileStatuses)[number];

export type SponsorProfileListItem = {
  id: string;
  orgId: string;
  name: string;
  logoAssetId: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  tier: string | null;
  status: SponsorProfileStatus;
  submissionId: string | null;
  createdAt: string;
  updatedAt: string;
};
