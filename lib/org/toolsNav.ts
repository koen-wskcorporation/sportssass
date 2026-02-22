export type OrgAdminNavIcon =
  | "wrench"
  | "settings"
  | "building"
  | "palette"
  | "users"
  | "credit-card"
  | "layout"
  | "calendar"
  | "file-text";

export type OrgAdminNavItem = {
  key: string;
  label: string;
  href: string;
  description: string;
  icon: OrgAdminNavIcon;
  parentKey?: string;
  showInHome?: boolean;
};

export function getOrgAdminNavItems(orgSlug: string): OrgAdminNavItem[] {
  return [
    {
      key: "manage-overview",
      label: "Overview",
      href: `/${orgSlug}/manage`,
      description: "Open the organization admin overview.",
      icon: "wrench",
      showInHome: false
    },
    {
      key: "manage-general",
      label: "General",
      href: `/${orgSlug}/manage/info`,
      description: "View organization metadata and governing body settings.",
      icon: "building",
      parentKey: "manage",
      showInHome: false
    },
    {
      key: "manage-branding",
      label: "Branding",
      href: `/${orgSlug}/manage/branding`,
      description: "Update logo, icon, and organization accent color.",
      icon: "palette",
      parentKey: "manage",
      showInHome: false
    },
    {
      key: "manage-accounts",
      label: "Accounts",
      href: `/${orgSlug}/manage/access`,
      description: "Invite users and manage organization roles.",
      icon: "users",
      parentKey: "manage",
      showInHome: false
    },
    {
      key: "manage-billing",
      label: "Billing",
      href: `/${orgSlug}/manage/billing`,
      description: "Review subscription and billing controls.",
      icon: "credit-card",
      parentKey: "manage",
      showInHome: false
    },
    {
      key: "programs",
      label: "Programs",
      href: `/${orgSlug}/manage/programs`,
      description: "Create and edit programs, divisions, and schedules.",
      icon: "calendar",
      showInHome: true
    },
    {
      key: "forms",
      label: "Forms",
      href: `/${orgSlug}/manage/forms`,
      description: "Build forms and process submissions.",
      icon: "file-text",
      showInHome: true
    },
    {
      key: "manage",
      label: "Manage",
      href: `/${orgSlug}/manage`,
      description: "Organization management settings and access controls.",
      icon: "settings",
      showInHome: true
    }
  ];
}

export type OrgToolsNavIcon = OrgAdminNavIcon;
export type OrgToolsNavItem = OrgAdminNavItem;

// Backward-compat alias while callsites migrate.
export const getOrgToolsNavItems = getOrgAdminNavItems;
