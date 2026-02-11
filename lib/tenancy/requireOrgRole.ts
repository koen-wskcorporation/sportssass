import type { OrgRole } from "@/modules/core/tools/access";

const roleOrder: Record<OrgRole, number> = {
  member: 1,
  manager: 2,
  admin: 3,
  owner: 4
};

export function hasMinimumOrgRole(currentRole: OrgRole, minimumRole: OrgRole) {
  return roleOrder[currentRole] >= roleOrder[minimumRole];
}

export function requireOrgRole(currentRole: OrgRole, minimumRole: OrgRole) {
  if (!hasMinimumOrgRole(currentRole, minimumRole)) {
    throw new Error(`Forbidden: requires at least ${minimumRole}`);
  }
}
