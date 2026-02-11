import { forbidden } from "next/navigation";
import { getOrgContext } from "@/lib/tenancy/getOrgContext";
import { hasPermissions, type Permission } from "@/modules/core/tools/access";

export async function requireOrgPermission(orgSlug: string, permission: Permission | Permission[]) {
  const orgContext = await getOrgContext(orgSlug, "auth");
  const permissions = Array.isArray(permission) ? permission : [permission];

  if (!hasPermissions(orgContext.membershipRole, permissions)) {
    forbidden();
  }

  return orgContext;
}
