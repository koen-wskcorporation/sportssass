import { hasPermissions, type OrgRole, type Permission } from "@/modules/core/tools/access";

export function can(role: OrgRole, permission: Permission | Permission[]) {
  const permissions = Array.isArray(permission) ? permission : [permission];
  return hasPermissions(role, permissions);
}
