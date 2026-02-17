import type { LinkValue } from "@/lib/links";

export const ORG_NAV_MAX_TOP_LEVEL_ITEMS = 8;
export const ORG_NAV_MAX_CHILD_ITEMS = 10;

export type OrgNavChildItem = {
  id: string;
  label: string;
  link: LinkValue;
  openInNewTab: boolean;
};

export type OrgNavItem = {
  id: string;
  label: string;
  link: LinkValue | null;
  openInNewTab: boolean;
  children: OrgNavChildItem[];
};

export function createDefaultOrgNavItems(): OrgNavItem[] {
  return [
    {
      id: "home",
      label: "Home",
      link: {
        type: "internal",
        pageSlug: "home"
      },
      openInNewTab: false,
      children: []
    },
    {
      id: "sponsors",
      label: "Sponsors",
      link: {
        type: "internal",
        pageSlug: "sponsors"
      },
      openInNewTab: false,
      children: []
    }
  ];
}
