import { getOrgContext } from "@/lib/tenancy/getOrgContext";
import type { Permission } from "@/modules/core/tools/access";
import { requirePermission } from "@/lib/auth/requirePermission";

export async function requireOrgPermission(orgSlug: string, permission: Permission | Permission[]) {
  const orgContext = await getOrgContext(orgSlug, "auth");
  requirePermission(orgContext.membershipRole, permission);

  return orgContext;
}
