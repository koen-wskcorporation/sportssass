"use client";

import { useMemo } from "react";
import { Building2, CreditCard, LayoutDashboard, Palette, Users } from "lucide-react";
import { OrgAreaSidebarNav, OrgAreaSidebarNavMobile, type OrgAreaSidebarConfig } from "@/components/manage/OrgAreaSidebarNav";

type ManageSidebarProps = {
  orgSlug: string;
  mobile?: boolean;
  showHeader?: boolean;
};

function navConfig(orgSlug: string): OrgAreaSidebarConfig {
  return {
    title: "Manage",
    subtitle: "Organization settings",
    mobileLabel: "Manage",
    ariaLabel: "Manage area navigation",
    groups: [
      {
        key: "setup",
        label: "Setup",
        items: [
          {
            key: "dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            href: `/${orgSlug}/manage`,
            match: "exact"
          },
          {
            key: "org-info",
            label: "Org Info",
            icon: Building2,
            href: `/${orgSlug}/manage/info`,
            match: "prefix"
          },
          {
            key: "branding",
            label: "Branding",
            icon: Palette,
            href: `/${orgSlug}/manage/branding`,
            match: "prefix"
          }
        ]
      },
      {
        key: "people",
        label: "People",
        items: [
          {
            key: "accounts-access",
            label: "Accounts & Access",
            icon: Users,
            href: `/${orgSlug}/manage/access`,
            match: "prefix"
          }
        ]
      },
      {
        key: "billing",
        label: "Billing",
        items: [
          {
            key: "billing-item",
            label: "Billing",
            icon: CreditCard,
            href: `/${orgSlug}/manage/billing`,
            match: "prefix"
          }
        ]
      }
    ]
  };
}

export function ManageSidebar({ orgSlug, mobile = false, showHeader = true }: ManageSidebarProps) {
  const config = useMemo(() => navConfig(orgSlug), [orgSlug]);
  return <OrgAreaSidebarNav config={config} mobile={mobile} showHeader={showHeader} />;
}

type ManageSidebarMobileProps = {
  orgSlug: string;
};

export function ManageSidebarMobile({ orgSlug }: ManageSidebarMobileProps) {
  const config = useMemo(() => navConfig(orgSlug), [orgSlug]);
  return <OrgAreaSidebarNavMobile config={config} />;
}
