export type OrgRole = string;

export type DefaultOrgRole = "admin" | "member";

export type Permission =
  | "org.dashboard.read"
  | "org.manage.read"
  | "org.branding.read"
  | "org.branding.write"
  | "org.pages.read"
  | "org.pages.write"
  | "announcements.read"
  | "announcements.write"
  | "forms.read"
  | "forms.write"
  | "sponsors.read"
  | "sponsors.write";

export type PermissionDefinition = {
  permission: Permission;
  label: string;
  description: string;
  group: "Organization" | "Site Builder" | "Announcements" | "Forms" | "Sponsors";
};

export type CustomRolePermissionSource = {
  roleKey: string;
  permissions: Permission[];
};

export const allPermissions: Permission[] = [
  "org.dashboard.read",
  "org.manage.read",
  "org.branding.read",
  "org.branding.write",
  "org.pages.read",
  "org.pages.write",
  "announcements.read",
  "announcements.write",
  "forms.read",
  "forms.write",
  "sponsors.read",
  "sponsors.write"
];

const permissionSet = new Set(allPermissions);

export const permissionDefinitions: PermissionDefinition[] = [
  {
    permission: "org.dashboard.read",
    label: "Dashboard access",
    description: "View organization dashboards and core navigation.",
    group: "Organization"
  },
  {
    permission: "org.manage.read",
    label: "Management access",
    description: "Open management screens and administer organization settings.",
    group: "Organization"
  },
  {
    permission: "org.branding.read",
    label: "Branding read",
    description: "View branding assets and accent configuration.",
    group: "Organization"
  },
  {
    permission: "org.branding.write",
    label: "Branding write",
    description: "Upload branding assets and save branding updates.",
    group: "Organization"
  },
  {
    permission: "org.pages.read",
    label: "Site builder read",
    description: "Read unpublished pages and editor data.",
    group: "Site Builder"
  },
  {
    permission: "org.pages.write",
    label: "Site builder write",
    description: "Create, edit, publish, and delete site pages and blocks.",
    group: "Site Builder"
  },
  {
    permission: "announcements.read",
    label: "Announcements read",
    description: "View announcement drafts and published announcement entries.",
    group: "Announcements"
  },
  {
    permission: "announcements.write",
    label: "Announcements write",
    description: "Create, update, publish, and delete announcements.",
    group: "Announcements"
  },
  {
    permission: "forms.read",
    label: "Forms read",
    description: "View forms, published versions, and submission inbox records.",
    group: "Forms"
  },
  {
    permission: "forms.write",
    label: "Forms write",
    description: "Create, edit, publish, archive, and configure form workflows.",
    group: "Forms"
  },
  {
    permission: "sponsors.read",
    label: "Sponsors read",
    description: "View sponsor submissions and sponsor pipeline activity.",
    group: "Sponsors"
  },
  {
    permission: "sponsors.write",
    label: "Sponsors write",
    description: "Update sponsor statuses, notes, assets, and publish state.",
    group: "Sponsors"
  }
];

const defaultRolePermissions: Record<DefaultOrgRole, Permission[]> = {
  admin: allPermissions,
  member: ["org.dashboard.read", "org.branding.read", "sponsors.read"]
};

const defaultRoleLabels: Record<DefaultOrgRole, string> = {
  admin: "Admin",
  member: "Member"
};

export const reservedOrgRoleKeys = new Set<DefaultOrgRole>(["admin", "member"]);

const roleKeyPattern = /^[a-z][a-z0-9-]{1,31}$/;

export function isPermission(value: string): value is Permission {
  return permissionSet.has(value as Permission);
}

export function isDefaultOrgRole(role: string): role is DefaultOrgRole {
  return role === "admin" || role === "member";
}

export function isReservedOrgRoleKey(roleKey: string) {
  return reservedOrgRoleKeys.has(roleKey as DefaultOrgRole);
}

export function isValidRoleKey(roleKey: string) {
  return roleKeyPattern.test(roleKey);
}

export function normalizeRoleKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getDefaultRolePermissions(role: string): Permission[] | null {
  if (!isDefaultOrgRole(role)) {
    return null;
  }

  return defaultRolePermissions[role];
}

export function getDefaultRoleLabel(role: DefaultOrgRole) {
  return defaultRoleLabels[role];
}

export function getRoleLabel(roleKey: string) {
  if (isDefaultOrgRole(roleKey)) {
    return getDefaultRoleLabel(roleKey);
  }

  return roleKey
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getPermissionsForRole(roleKey: OrgRole, customRoles: CustomRolePermissionSource[] = []) {
  const defaultPermissions = getDefaultRolePermissions(roleKey);
  if (defaultPermissions) {
    return defaultPermissions;
  }

  const customRole = customRoles.find((role) => role.roleKey === roleKey);
  return customRole?.permissions ?? [];
}

export function hasPermissions(grantedPermissions: Permission[], requiredPermissions: Permission[]) {
  const granted = new Set(grantedPermissions);
  return requiredPermissions.every((permission) => granted.has(permission));
}
