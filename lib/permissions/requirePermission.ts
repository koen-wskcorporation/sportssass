import { forbidden } from "next/navigation";
import type { OrgRole, Permission } from "@/modules/core/tools/access";
import { can } from "@/lib/permissions/can";

export function requirePermission(role: OrgRole, permission: Permission | Permission[]) {
  if (!can(role, permission)) {
    forbidden();
  }
}
