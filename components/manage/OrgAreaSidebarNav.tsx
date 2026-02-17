"use client";

import { ChevronDown, Menu, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NavGroup } from "@/components/ui/nav-group";
import { NavItem } from "@/components/ui/nav-item";
import { cn } from "@/lib/utils";

export type MatchMode = "exact" | "prefix";

type SidebarNavItemBase = {
  key: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  match?: MatchMode;
  disabled?: boolean;
  soon?: boolean;
};

export type OrgAreaSidebarLeafItem = SidebarNavItemBase & {
  children?: never;
  subtreePrefixes?: never;
};

export type OrgAreaSidebarChildItem = SidebarNavItemBase;

export type OrgAreaSidebarParentItem = SidebarNavItemBase & {
  children: OrgAreaSidebarChildItem[];
  subtreePrefixes?: string[];
};

export type OrgAreaSidebarNode = OrgAreaSidebarLeafItem | OrgAreaSidebarParentItem;

export type OrgAreaSidebarGroup = {
  key: string;
  label: string;
  items: OrgAreaSidebarNode[];
};

export type OrgAreaSidebarConfig = {
  title: string;
  subtitle: string;
  mobileLabel: string;
  ariaLabel: string;
  groups: OrgAreaSidebarGroup[];
};

type OrgAreaSidebarNavProps = {
  config: OrgAreaSidebarConfig;
  mobile?: boolean;
  showHeader?: boolean;
};

type OrgAreaSidebarNavMobileProps = {
  config: OrgAreaSidebarConfig;
};

function isParentNode(node: OrgAreaSidebarNode): node is OrgAreaSidebarParentItem {
  return "children" in node;
}

function matchesPath(pathname: string, href: string, mode: MatchMode = "prefix") {
  if (mode === "exact") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function isParentActive(pathname: string, item: OrgAreaSidebarParentItem) {
  const parentHrefActive = item.href ? matchesPath(pathname, item.href, item.match ?? "prefix") : false;
  const subtreeActive = (item.subtreePrefixes ?? []).some((prefix) => matchesPath(pathname, prefix, "prefix"));
  const childActive = item.children.some((child) => (child.href ? matchesPath(pathname, child.href, child.match ?? "prefix") : false));
  return parentHrefActive || subtreeActive || childActive;
}

function SoonBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-text-muted">
      Soon
    </span>
  );
}

export function OrgAreaSidebarNav({ config, mobile = false, showHeader = true }: OrgAreaSidebarNavProps) {
  const pathname = usePathname();

  const parentNodes = useMemo(
    () =>
      config.groups
        .flatMap((group) => group.items)
        .filter((node): node is OrgAreaSidebarParentItem => isParentNode(node)),
    [config.groups]
  );

  const [expandedByKey, setExpandedByKey] = useState<Record<string, boolean>>(() => {
    return parentNodes.reduce<Record<string, boolean>>((draft, node) => {
      draft[node.key] = isParentActive(pathname, node);
      return draft;
    }, {});
  });

  useEffect(() => {
    setExpandedByKey((current) => {
      const next = { ...current };

      for (const node of parentNodes) {
        const active = isParentActive(pathname, node);

        if (active) {
          next[node.key] = true;
          continue;
        }

        if (!(node.key in next)) {
          next[node.key] = false;
        }
      }

      return next;
    });
  }, [pathname, parentNodes]);

  function toggleParent(key: string) {
    setExpandedByKey((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  function renderLeafItem(item: OrgAreaSidebarLeafItem) {
    const isActive = item.href ? matchesPath(pathname, item.href, item.match ?? "prefix") : false;
    const Icon = item.icon;

    return (
      <NavItem
        active={isActive}
        disabled={item.disabled || !item.href}
        href={item.href}
        icon={<Icon className="h-[17px] w-[17px]" />}
        key={item.key}
        rightSlot={item.soon ? <SoonBadge /> : null}
        size="md"
        variant="sidebar"
      >
        {item.label}
      </NavItem>
    );
  }

  function renderChildItem(item: OrgAreaSidebarChildItem) {
    const isActive = item.href ? matchesPath(pathname, item.href, item.match ?? "prefix") : false;
    const Icon = item.icon;

    return (
      <NavItem
        active={isActive}
        disabled={item.disabled || !item.href}
        href={item.href}
        icon={<Icon className="h-4 w-4" />}
        key={item.key}
        rightSlot={item.soon ? <SoonBadge /> : null}
        size="sm"
        variant="sidebar"
      >
        {item.label}
      </NavItem>
    );
  }

  return (
    <aside className={cn("rounded-card border border-border bg-surface p-4", mobile ? "shadow-card" : "shadow-floating")}>
      {showHeader ? (
        <>
          <header className="min-h-[44px]">
            <h2 className="text-[18px] font-bold leading-tight tracking-tight text-text">{config.title}</h2>
            <p className="mt-1 text-[12px] text-text-muted">{config.subtitle}</p>
          </header>

          <div className="my-3 border-t border-border" />
        </>
      ) : null}

      <nav aria-label={config.ariaLabel} className="space-y-5">
        {config.groups.map((group) => (
          <NavGroup key={group.key} title={group.label}>
            {group.items.map((node) => {
              if (!isParentNode(node)) {
                return renderLeafItem(node);
              }

              const Icon = node.icon;
              const expanded = Boolean(expandedByKey[node.key]);
              const parentActive = isParentActive(pathname, node);
              const parentDisabled = node.disabled || !node.href;

              return (
                <div className="space-y-1" key={node.key}>
                  <NavItem
                    active={parentActive}
                    ariaExpanded={expanded}
                    className={parentDisabled ? "opacity-55" : undefined}
                    icon={<Icon className="h-[17px] w-[17px]" />}
                    onClick={() => toggleParent(node.key)}
                    rightSlot={
                      <span className="flex items-center gap-2 text-text-muted">
                        {node.soon ? <SoonBadge /> : null}
                        <ChevronDown className={cn("h-4 w-4 transition-transform", expanded ? "rotate-180" : "rotate-0")} />
                      </span>
                    }
                    size="md"
                    type="button"
                    variant="sidebar"
                  >
                    {node.label}
                  </NavItem>

                  {expanded ? <div className="space-y-1 pl-[14px]">{node.children.map((child) => renderChildItem(child))}</div> : null}
                </div>
              );
            })}
          </NavGroup>
        ))}
      </nav>
    </aside>
  );
}

export function OrgAreaSidebarNavMobile({ config }: OrgAreaSidebarNavMobileProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="lg:hidden">
      <button
        aria-expanded={open}
        className="flex h-10 w-full items-center justify-between rounded-control border border-border bg-surface-muted px-3 text-sm font-semibold text-text transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="flex items-center gap-2">
          <Menu className="h-4 w-4 text-text-muted" />
          {config.mobileLabel}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-text-muted transition-transform", open ? "rotate-180" : "rotate-0")} />
      </button>

      {open ? (
        <div className="mt-3">
          <OrgAreaSidebarNav config={config} mobile showHeader={false} />
        </div>
      ) : null}
    </div>
  );
}
