import { cache } from "react";
import { getOrgContext } from "@/lib/tenancy/getOrgContext";
import type { PublicOrgContext, ResolvedOrgContext } from "@/lib/tenancy/types";

export const resolveOrg = cache(async (orgSlug: string): Promise<ResolvedOrgContext> => {
  const orgContext = await getOrgContext(orgSlug, "auth");
  return {
    orgId: orgContext.orgId,
    orgSlug: orgContext.orgSlug,
    orgName: orgContext.orgName,
    membershipRole: orgContext.membershipRole,
    userId: orgContext.userId,
    branding: orgContext.branding
  };
});

export const resolvePublicOrg = cache(async (orgSlug: string): Promise<PublicOrgContext> => {
  const orgContext = await getOrgContext(orgSlug, "public");
  return {
    orgId: orgContext.orgId,
    orgSlug: orgContext.orgSlug,
    orgName: orgContext.orgName,
    branding: orgContext.branding
  };
});
