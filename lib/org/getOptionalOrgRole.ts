import { cache } from "react";
import { getOptionalOrgMembershipAccess } from "@/lib/org/getOptionalOrgMembershipAccess";
import type { OrgRole } from "@/modules/core/tools/access";

export const getOptionalOrgRole = cache(async (orgId: string): Promise<OrgRole | null> => {
  const membershipAccess = await getOptionalOrgMembershipAccess(orgId);
  return membershipAccess?.role ?? null;
});
