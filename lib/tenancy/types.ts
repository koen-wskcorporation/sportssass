import type { OrgRole } from "@/modules/core/tools/access";

export type OrgBranding = {
  logoPath: string | null;
  iconPath: string | null;
  brandPrimary: string | null;
  brandSecondary: string | null;
};

export type ResolvedOrgContext = {
  orgId: string;
  orgSlug: string;
  orgName: string;
  membershipRole: OrgRole;
  userId: string;
  branding: OrgBranding;
};

export type PublicOrgContext = {
  orgId: string;
  orgSlug: string;
  orgName: string;
  branding: OrgBranding;
};
