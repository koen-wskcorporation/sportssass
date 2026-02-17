"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Wrench } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { NavItem } from "@/components/ui/nav-item";
import { ORG_SITE_OPEN_EDITOR_EVENT } from "@/modules/site-builder/events";
import { CreatePageDialogTrigger } from "@/modules/site-builder/components/CreatePageDialogTrigger";
import { OrgToolsManageMenu } from "@/components/shared/OrgToolsManageMenu";
import { cn } from "@/lib/utils";
import { resolveLinkHref, type LinkValue } from "@/lib/links";
import type { OrgNavItem } from "@/modules/site-builder/nav";

type OrgHeaderProps = {
  orgSlug: string;
  orgName: string;
  orgLogoUrl?: string | null;
  governingBodyLogoUrl?: string | null;
  governingBodyName?: string | null;
  canManageOrg: boolean;
  canAccessTools: boolean;
  canEditPages: boolean;
  navItems: OrgNavItem[];
};

type ResolvedNavChild = {
  id: string;
  label: string;
  href: string;
  active: boolean;
  target?: "_blank";
  rel?: string;
};

type ResolvedNavItem = {
  id: string;
  label: string;
  href: string | null;
  active: boolean;
  children: ResolvedNavChild[];
  target?: "_blank";
  rel?: string;
};

function getOrgInitial(orgName: string) {
  return orgName.trim().charAt(0).toUpperCase() || "O";
}

function isEditablePublicOrgPath(pathname: string, orgBasePath: string) {
  if (pathname === orgBasePath) {
    return true;
  }

  if (!pathname.startsWith(`${orgBasePath}/`)) {
    return false;
  }

  return (
    !pathname.startsWith(`${orgBasePath}/manage`) &&
    !pathname.startsWith(`${orgBasePath}/tools`) &&
    !pathname.startsWith(`${orgBasePath}/sponsors`) &&
    !pathname.startsWith(`${orgBasePath}/icon`)
  );
}

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function isInternalLinkActive(pathname: string, orgSlug: string, link: LinkValue) {
  if (link.type !== "internal") {
    return false;
  }

  const current = normalizePath(pathname);
  const href = normalizePath(resolveLinkHref(orgSlug, link));

  if (link.pageSlug === "home") {
    return current === href;
  }

  return current === href || current.startsWith(`${href}/`);
}

function linkTarget(link: LinkValue | null, openInNewTab: boolean) {
  if (!link || link.type !== "external" || !openInNewTab) {
    return {
      target: undefined,
      rel: undefined
    };
  }

  return {
    target: "_blank" as const,
    rel: "noopener noreferrer"
  };
}

function resolveNavItems({
  pathname,
  orgSlug,
  navItems
}: {
  pathname: string;
  orgSlug: string;
  navItems: OrgNavItem[];
}): ResolvedNavItem[] {
  return navItems.map((item) => {
    const childItems: ResolvedNavChild[] = item.children.map((child) => {
      const childHref = resolveLinkHref(orgSlug, child.link);
      const childActive = isInternalLinkActive(pathname, orgSlug, child.link);
      const childTarget = linkTarget(child.link, child.openInNewTab);

      return {
        id: child.id,
        label: child.label,
        href: childHref,
        active: childActive,
        target: childTarget.target,
        rel: childTarget.rel
      };
    });

    const itemHref = item.link ? resolveLinkHref(orgSlug, item.link) : null;
    const selfActive = item.link ? isInternalLinkActive(pathname, orgSlug, item.link) : false;
    const childActive = childItems.some((child) => child.active);
    const itemTarget = linkTarget(item.link, item.openInNewTab);

    return {
      id: item.id,
      label: item.label,
      href: itemHref,
      active: selfActive || childActive,
      children: childItems,
      target: itemTarget.target,
      rel: itemTarget.rel
    };
  });
}

export function OrgHeader({
  orgSlug,
  orgName,
  orgLogoUrl,
  governingBodyLogoUrl,
  governingBodyName,
  canManageOrg,
  canAccessTools,
  canEditPages,
  navItems
}: OrgHeaderProps) {
  const pathname = usePathname();
  const orgBasePath = `/${orgSlug}`;
  const canEditCurrentPage = canEditPages && isEditablePublicOrgPath(pathname, orgBasePath);
  const hasPageActions = canEditPages || canEditCurrentPage;
  const hasToolsMenu = canAccessTools || canManageOrg;
  const resolvedNavItems = useMemo(() => resolveNavItems({ pathname, orgSlug, navItems }), [pathname, orgSlug, navItems]);
  const [expandedMobileItems, setExpandedMobileItems] = useState<string[]>([]);

  useEffect(() => {
    setExpandedMobileItems((current) => {
      const activeWithChildren = resolvedNavItems.filter((item) => item.children.some((child) => child.active)).map((item) => item.id);
      const allowedIds = new Set(resolvedNavItems.map((item) => item.id));
      const merged = [...current.filter((id) => allowedIds.has(id)), ...activeWithChildren];

      return [...new Set(merged)];
    });
  }, [resolvedNavItems]);

  function toggleMobileItem(itemId: string) {
    setExpandedMobileItems((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
      }

      return [...current, itemId];
    });
  }

  function openPageEditor() {
    window.dispatchEvent(
      new CustomEvent(ORG_SITE_OPEN_EDITOR_EVENT, {
        detail: {
          pathname
        }
      })
    );
  }

  return (
    <div className="app-container mt-4">
      <div className="flex w-full flex-col gap-3 md:flex-row md:items-stretch">
        <div className="w-full rounded-card border bg-surface shadow-floating md:min-w-0 md:flex-1">
          <div className="flex min-h-[60px] items-center gap-3 px-4 md:px-6">
            <Link className="inline-flex min-w-0 items-center gap-3" href={orgBasePath}>
              {governingBodyLogoUrl ? (
                <>
                  <span className="inline-flex h-7 shrink-0 items-center md:h-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`${governingBodyName ?? "Governing body"} seal`}
                      className="h-full w-auto max-w-[44px] object-contain"
                      src={governingBodyLogoUrl}
                    />
                  </span>
                  <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
                </>
              ) : null}

              <span className="inline-flex h-7 max-w-[220px] shrink-0 items-center md:h-8">
                {orgLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={`${orgName} logo`} className="h-full w-auto max-w-full object-contain object-left" src={orgLogoUrl} />
                ) : (
                  <span className="inline-flex h-full items-center text-sm font-semibold text-text-muted">{getOrgInitial(orgName)}</span>
                )}
              </span>
              {!orgLogoUrl ? <span className="truncate text-sm font-semibold text-text">{orgName}</span> : null}
            </Link>

            <nav className="ml-auto hidden items-center gap-2 md:flex">
              {resolvedNavItems.map((item) => {
                const hasChildren = item.children.length > 0;

                if (!hasChildren) {
                  if (!item.href) {
                    return null;
                  }

                  return (
                    <NavItem active={item.active} href={item.href} key={item.id} rel={item.rel} target={item.target} variant="header">
                      {item.label}
                    </NavItem>
                  );
                }

                return (
                  <div className="group relative" key={item.id}>
                    {item.href ? (
                      <NavItem active={item.active} href={item.href} rel={item.rel} rightSlot={<ChevronDown className="h-3.5 w-3.5" />} target={item.target} variant="header">
                        {item.label}
                      </NavItem>
                    ) : (
                      <NavItem active={item.active} ariaHaspopup="menu" rightSlot={<ChevronDown className="h-3.5 w-3.5" />} variant="header">
                        {item.label}
                      </NavItem>
                    )}

                    <div className="pointer-events-none invisible absolute left-0 top-full z-50 min-w-[220px] pt-1 opacity-0 transition-all group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100">
                      <div className="rounded-card border bg-surface p-2 shadow-card" role="menu">
                        <div className="space-y-1">
                          {item.children.map((child) => (
                            <NavItem
                              active={child.active}
                              href={child.href}
                              key={child.id}
                              rel={child.rel}
                              role="menuitem"
                              size="sm"
                              target={child.target}
                              variant="dropdown"
                            >
                              {child.label}
                            </NavItem>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </nav>

            {hasToolsMenu ? (
              <div className="ml-1 hidden items-center border-l border-border pl-3 md:flex">
                <OrgToolsManageMenu canAccessTools={canAccessTools} canEditPages={canEditPages} canManageOrg={canManageOrg} orgSlug={orgSlug} />
              </div>
            ) : null}
          </div>

          <div className="border-t px-4 py-3 md:hidden">
            <div className="space-y-2">
              {resolvedNavItems.map((item) => {
                const hasChildren = item.children.length > 0;

                if (!hasChildren) {
                  if (!item.href) {
                    return null;
                  }

                  return (
                    <NavItem active={item.active} className="w-full" href={item.href} key={item.id} rel={item.rel} size="sm" target={item.target} variant="dropdown">
                      {item.label}
                    </NavItem>
                  );
                }

                const isExpanded = expandedMobileItems.includes(item.id);

                if (!item.href) {
                  return (
                    <div className="space-y-2" key={item.id}>
                      <NavItem
                        active={item.active}
                        ariaExpanded={isExpanded}
                        ariaHaspopup="menu"
                        className="w-full"
                        onClick={() => toggleMobileItem(item.id)}
                        rightSlot={<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded ? "rotate-180" : "rotate-0")} />}
                        size="sm"
                        variant="dropdown"
                      >
                        {item.label}
                      </NavItem>

                      {isExpanded ? (
                        <div className="space-y-1 border-l border-border/70 pl-3">
                          {item.children.map((child) => (
                            <NavItem
                              active={child.active}
                              className="w-full"
                              href={child.href}
                              key={child.id}
                              rel={child.rel}
                              size="sm"
                              target={child.target}
                              variant="dropdown"
                            >
                              {child.label}
                            </NavItem>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2" key={item.id}>
                    <div className="flex items-center gap-2">
                      <NavItem active={item.active} className="min-w-0 flex-1" href={item.href} rel={item.rel} size="sm" target={item.target} variant="dropdown">
                        {item.label}
                      </NavItem>

                      <button
                        aria-expanded={isExpanded}
                        aria-haspopup="menu"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-border bg-surface text-text-muted transition-colors hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                        onClick={() => toggleMobileItem(item.id)}
                        type="button"
                      >
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded ? "rotate-180" : "rotate-0")} />
                      </button>
                    </div>

                    {isExpanded ? (
                      <div className="space-y-1 border-l border-border/70 pl-3">
                        {item.children.map((child) => (
                          <NavItem
                            active={child.active}
                            className="w-full"
                            href={child.href}
                            key={child.id}
                            rel={child.rel}
                            size="sm"
                            target={child.target}
                            variant="dropdown"
                          >
                            {child.label}
                          </NavItem>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {hasToolsMenu ? (
                <div className="pt-1">
                  <OrgToolsManageMenu canAccessTools={canAccessTools} canEditPages={canEditPages} canManageOrg={canManageOrg} orgSlug={orgSlug} />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {hasPageActions ? (
          <div className="w-fit self-start rounded-card border bg-surface shadow-floating md:self-auto">
            <div className="flex min-h-[60px] items-center gap-2 px-4 whitespace-nowrap">
              {canEditPages ? <CreatePageDialogTrigger canWrite={canEditPages} orgSlug={orgSlug} /> : null}
              {canEditPages ? (
                <Link className={buttonVariants({ size: "sm", variant: "secondary" })} href={`/${orgSlug}/manage/pages?menu=1`}>
                  <Wrench className="h-4 w-4" />
                  Header items
                </Link>
              ) : null}
              {canEditCurrentPage ? (
                <button className={buttonVariants({ size: "sm", variant: "secondary" })} onClick={openPageEditor} type="button">
                  <Pencil className="h-4 w-4" />
                  Edit page
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
