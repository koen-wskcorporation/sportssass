import { forbidden } from "next/navigation";
import { hasPermissions, type OrgRole, type Permission } from "@/modules/core/tools/access";

export function requirePermission(role: OrgRole, permission: Permission | Permission[]) {
  const permissions = Array.isArray(permission) ? permission : [permission];

  if (!hasPermissions(role, permissions)) {
    forbidden();
  }
}
