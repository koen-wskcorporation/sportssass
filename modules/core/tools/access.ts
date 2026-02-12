export type OrgRole = "owner" | "admin" | "manager" | "member";

export type Permission =
  | "org.dashboard.read"
  | "org.branding.read"
  | "org.branding.write"
  | "org.site.write"
  | "org.events.read"
  | "sponsors.read"
  | "sponsors.write";

const rolePermissions: Record<OrgRole, Permission[]> = {
  owner: [
    "org.dashboard.read",
    "org.branding.read",
    "org.branding.write",
    "org.site.write",
    "org.events.read",
    "sponsors.read",
    "sponsors.write"
  ],
  admin: [
    "org.dashboard.read",
    "org.branding.read",
    "org.branding.write",
    "org.site.write",
    "org.events.read",
    "sponsors.read",
    "sponsors.write"
  ],
  manager: ["org.dashboard.read", "org.branding.read", "org.site.write", "org.events.read", "sponsors.read", "sponsors.write"],
  member: ["org.dashboard.read", "org.branding.read", "org.events.read", "sponsors.read"]
};

export function getRolePermissions(role: OrgRole) {
  return rolePermissions[role];
}

export function hasPermissions(role: OrgRole, requiredPermissions: Permission[]) {
  const granted = new Set(getRolePermissions(role));
  return requiredPermissions.every((permission) => granted.has(permission));
}
