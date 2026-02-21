import { getOptionalOrgMembershipAccess } from "@/lib/org/getOptionalOrgMembershipAccess";
import type { OrgRole } from "@/modules/core/access";

export async function getOptionalOrgRole(orgId: string): Promise<OrgRole | null> {
  const membershipAccess = await getOptionalOrgMembershipAccess(orgId);
  return membershipAccess?.role ?? null;
}
