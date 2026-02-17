"use client";

import { useMemo } from "react";
import { FileText, Handshake, LayoutDashboard, ListChecks, Megaphone } from "lucide-react";
import { OrgAreaSidebarNav, OrgAreaSidebarNavMobile, type OrgAreaSidebarConfig } from "@/components/manage/OrgAreaSidebarNav";

type ToolsSidebarProps = {
  orgSlug: string;
  mobile?: boolean;
  showHeader?: boolean;
};

type ToolsSidebarMobileProps = {
  orgSlug: string;
};

function navConfig(orgSlug: string): OrgAreaSidebarConfig {
  return {
    title: "Tools",
    subtitle: "Operational workflows",
    mobileLabel: "Tools",
    ariaLabel: "Tools area navigation",
    groups: [
      {
        key: "engagement",
        label: "Engagement",
        items: [
          {
            key: "tools-dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            href: `/${orgSlug}/tools`,
            match: "exact"
          },
          {
            key: "forms",
            label: "Forms",
            icon: FileText,
            href: `/${orgSlug}/tools/forms`,
            match: "prefix"
          },
          {
            key: "sponsors",
            label: "Sponsors",
            icon: Handshake,
            href: `/${orgSlug}/tools/sponsors`,
            match: "prefix",
            subtreePrefixes: [`/${orgSlug}/tools/sponsors/manage`],
            children: [
              {
                key: "sponsors-overview",
                label: "Overview",
                icon: LayoutDashboard,
                href: `/${orgSlug}/tools/sponsors`,
                match: "exact"
              },
              {
                key: "sponsors-manage",
                label: "Manage submissions",
                icon: ListChecks,
                href: `/${orgSlug}/tools/sponsors/manage`,
                match: "prefix"
              }
            ]
          },
          {
            key: "announcements",
            label: "Announcements",
            icon: Megaphone,
            href: `/${orgSlug}/tools/announcements`,
            match: "prefix"
          }
        ]
      }
    ]
  };
}

export function ToolsSidebar({ orgSlug, mobile = false, showHeader = true }: ToolsSidebarProps) {
  const config = useMemo(() => navConfig(orgSlug), [orgSlug]);
  return <OrgAreaSidebarNav config={config} mobile={mobile} showHeader={showHeader} />;
}

export function ToolsSidebarMobile({ orgSlug }: ToolsSidebarMobileProps) {
  const config = useMemo(() => navConfig(orgSlug), [orgSlug]);
  return <OrgAreaSidebarNavMobile config={config} />;
}
