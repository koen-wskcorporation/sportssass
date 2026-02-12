import type { OrgRole } from "@/modules/core/tools/access";

export type OrgBranding = {
  logoPath: string | null;
  iconPath: string | null;
  brandPrimary: string | null;
  brandSecondary: string | null;
};

export type OrgPublicContext = {
  orgId: string;
  orgSlug: string;
  orgName: string;
  branding: OrgBranding;
};

export type OrgAuthContext = OrgPublicContext & {
  membershipRole: OrgRole;
  userId: string;
};
