"use client";

import { useMemo } from "react";
import { Building2, CalendarDays, CreditCard, FileText, LayoutDashboard, Palette, Settings, Users, Wrench, type LucideIcon } from "lucide-react";
import { OrgAreaSidebarNav, OrgAreaSidebarNavMobile, type OrgAreaSidebarConfig } from "@/components/manage/OrgAreaSidebarNav";
import { getOrgAdminNavItems, type OrgAdminNavIcon } from "@/lib/org/toolsNav";

type ToolsSidebarProps = {
  orgSlug: string;
  mobile?: boolean;
  showHeader?: boolean;
};

const iconMap: Record<OrgAdminNavIcon, LucideIcon> = {
  wrench: Wrench,
  settings: Settings,
  building: Building2,
  palette: Palette,
  users: Users,
  "credit-card": CreditCard,
  layout: LayoutDashboard,
  calendar: CalendarDays,
  "file-text": FileText
};

function navConfig(orgSlug: string): OrgAreaSidebarConfig {
  const items = getOrgAdminNavItems(orgSlug);

  const topLevel = items.filter((item) => !item.parentKey);
  const toolsHome = topLevel.find((item) => item.href.endsWith("/tools/manage"));

  if (!toolsHome) {
    throw new Error("Org admin navigation is missing an overview item.");
  }

  const otherTopLevel = topLevel.filter((item) => item.key !== toolsHome.key);
  const orderedTopLevel = [toolsHome, ...otherTopLevel];

  const sidebarItems: OrgAreaSidebarConfig["items"] = orderedTopLevel.map((item) => {
    const children = items.filter((candidate) => candidate.parentKey === item.key);
    const icon = iconMap[item.icon];

    if (children.length === 0) {
      return {
        key: item.key,
        label: item.label,
        icon,
        href: item.href,
        match: item.href.endsWith("/tools/manage") ? ("exact" as const) : ("prefix" as const)
      };
    }

    return {
      key: item.key,
      label: item.label,
      icon,
      href: item.href,
      match: "prefix" as const,
      subtreePrefixes: [item.href, ...children.map((child) => child.href)],
      children: children.map((child) => ({
        key: child.key,
        label: child.label,
        icon: iconMap[child.icon],
        href: child.href,
        match: "prefix" as const
      }))
    };
  });

  return {
    title: "Tools",
    subtitle: "Workspace tools",
    mobileLabel: "Tools",
    ariaLabel: "Tools area navigation",
    collapseStorageKey: `tools-sidebar:${orgSlug}:collapsed`,
    items: sidebarItems
  };
}

export function ToolsSidebar({ orgSlug, mobile = false, showHeader = true }: ToolsSidebarProps) {
  const config = useMemo(() => navConfig(orgSlug), [orgSlug]);
  return <OrgAreaSidebarNav config={config} mobile={mobile} showHeader={showHeader} />;
}

type ToolsSidebarMobileProps = {
  orgSlug: string;
};

export function ToolsSidebarMobile({ orgSlug }: ToolsSidebarMobileProps) {
  const config = useMemo(() => navConfig(orgSlug), [orgSlug]);
  return <OrgAreaSidebarNavMobile config={config} />;
}
