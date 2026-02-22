"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  Palette,
  Pencil,
  Settings,
  Users,
  Wrench,
  type LucideIcon
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { NavItem } from "@/components/ui/nav-item";
import { getOrgAdminNavItems, type OrgAdminNavIcon } from "@/lib/org/toolsNav";
import { cn } from "@/lib/utils";
import type { OrgManagePage } from "@/modules/site-builder/types";

type OrgHeaderProps = {
  orgSlug: string;
  orgName: string;
  orgLogoUrl?: string | null;
  governingBodyLogoUrl?: string | null;
  governingBodyName?: string | null;
  canManageOrg: boolean;
  canEditPages: boolean;
  pages: OrgManagePage[];
};

const toolsNavIconMap: Record<OrgAdminNavIcon, LucideIcon> = {
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

function getOrgInitial(orgName: string) {
  return orgName.trim().charAt(0).toUpperCase() || "O";
}

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function pageHref(orgSlug: string, pageSlug: string) {
  return pageSlug === "home" ? `/${orgSlug}` : `/${orgSlug}/${pageSlug}`;
}

function isActivePath(pathname: string, href: string) {
  const current = normalizePath(pathname);
  const normalizedHref = normalizePath(href);

  if (normalizedHref === `/${pathname.split("/")[1]}`) {
    return current === normalizedHref;
  }

  return current === normalizedHref;
}

function isActivePrefixPath(pathname: string, href: string) {
  const current = normalizePath(pathname);
  const normalizedHref = normalizePath(href);
  return current === normalizedHref || current.startsWith(`${normalizedHref}/`);
}

function isEditablePublicOrgPath(pathname: string, orgBasePath: string) {
  if (pathname === orgBasePath) {
    return true;
  }

  if (!pathname.startsWith(`${orgBasePath}/`)) {
    return false;
  }

  return !pathname.startsWith(`${orgBasePath}/manage`) && !pathname.startsWith(`${orgBasePath}/tools`) && !pathname.startsWith(`${orgBasePath}/icon`);
}

function sortedPages(pages: OrgManagePage[]) {
  return [...pages].sort((a, b) => a.sortIndex - b.sortIndex || a.createdAt.localeCompare(b.createdAt));
}

export function OrgHeader({ orgSlug, orgName, orgLogoUrl, governingBodyLogoUrl, governingBodyName, canManageOrg, canEditPages, pages }: OrgHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgBasePath = `/${orgSlug}`;
  const canEditCurrentPage = canEditPages && isEditablePublicOrgPath(pathname, orgBasePath);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [expandedToolsParents, setExpandedToolsParents] = useState<Record<string, boolean>>({});
  const [isScrolled, setIsScrolled] = useState(false);

  const toolsNavItems = useMemo(() => getOrgAdminNavItems(orgSlug), [orgSlug]);
  const toolsNavTopLevelItems = useMemo(() => toolsNavItems.filter((item) => !item.parentKey), [toolsNavItems]);
  const toolsNavChildrenByParent = useMemo(() => {
    const map = new Map<string, typeof toolsNavItems>();

    for (const item of toolsNavItems) {
      if (!item.parentKey) {
        continue;
      }

      const current = map.get(item.parentKey) ?? [];
      current.push(item);
      map.set(item.parentKey, current);
    }

    return map;
  }, [toolsNavItems]);

  const orderedPages = useMemo(() => sortedPages(pages), [pages]);
  const navPages = useMemo(() => orderedPages.filter((page) => page.isPublished), [orderedPages]);

  const editHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", "1");
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsToolsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    setExpandedToolsParents((current) => {
      const next = { ...current };

      for (const item of toolsNavTopLevelItems) {
        const children = toolsNavChildrenByParent.get(item.key) ?? [];
        if (children.length === 0) {
          continue;
        }

        const isActive = isActivePrefixPath(pathname, item.href) || children.some((child) => isActivePrefixPath(pathname, child.href));
        if (isActive) {
          next[item.key] = true;
        } else if (!(item.key in next)) {
          next[item.key] = false;
        }
      }

      return next;
    });
  }, [pathname, toolsNavChildrenByParent, toolsNavTopLevelItems]);

  const hasHeaderActions = canEditCurrentPage || canManageOrg;

  return (
    <div className="app-container sticky top-0 z-40 py-4">
      <div className={cn("rounded-card border bg-surface shadow-floating transition-shadow", isScrolled ? "shadow-lg" : "") }>
        <div className="flex min-h-[64px] items-center gap-3 px-3 py-3 md:px-[18px]">
          <div className="shrink-0 self-stretch">
            <Link className="flex h-full min-w-0 items-center gap-3 leading-none" href={orgBasePath} prefetch>
              {governingBodyLogoUrl ? (
                <>
                  <span className="flex h-7 shrink-0 items-center leading-none md:h-8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`${governingBodyName ?? "Governing body"} seal`}
                      className="block h-full w-auto max-w-[44px] align-middle object-contain"
                      src={governingBodyLogoUrl}
                    />
                  </span>
                  <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
                </>
              ) : null}

              <span className="flex h-7 max-w-[220px] shrink-0 items-center leading-none md:h-8">
                {orgLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={`${orgName} logo`} className="block h-full w-auto max-w-full align-middle object-contain object-left" src={orgLogoUrl} />
                ) : (
                  <span className="inline-flex h-full items-center text-sm font-semibold text-text-muted">{getOrgInitial(orgName)}</span>
                )}
              </span>

              {!orgLogoUrl ? <span className="hidden max-w-[180px] truncate text-sm font-semibold text-text sm:inline">{orgName}</span> : null}
            </Link>
          </div>

          <nav className="hidden min-w-0 flex-1 md:block">
            <div className="flex min-w-0 items-center justify-end gap-2 overflow-x-auto pb-1">
              {navPages.map((page) => {
                const href = pageHref(orgSlug, page.slug);
                return (
                  <NavItem active={isActivePath(pathname, href)} href={href} key={page.id} variant="header">
                    {page.title}
                  </NavItem>
                );
              })}
            </div>
          </nav>

          {hasHeaderActions ? <span aria-hidden className="hidden h-6 w-px shrink-0 bg-border md:block" /> : null}

          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
            {canEditCurrentPage ? (
              <Link className={buttonVariants({ size: "sm", variant: "secondary" })} href={editHref} prefetch>
                <Pencil className="h-4 w-4" />
                Edit page
              </Link>
            ) : null}

            {canManageOrg ? (
              <div
                className="relative"
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setIsToolsMenuOpen(false);
                  }
                }}
              >
                <button
                  aria-expanded={isToolsMenuOpen}
                  aria-label="Open admin menu"
                  className={buttonVariants({ size: "sm" })}
                  onClick={() => setIsToolsMenuOpen((current) => !current)}
                  type="button"
                >
                  <Settings className="h-4 w-4" />
                  Admin
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isToolsMenuOpen ? "rotate-180" : "rotate-0")} />
                </button>
                {isToolsMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[20rem] max-w-[calc(100vw-1rem)] rounded-card border bg-surface p-2 shadow-floating">
                    {toolsNavTopLevelItems.map((item) => {
                      const children = toolsNavChildrenByParent.get(item.key) ?? [];
                      const isActive = isActivePrefixPath(pathname, item.href) || children.some((child) => isActivePrefixPath(pathname, child.href));
                      const isExpanded = Boolean(expandedToolsParents[item.key]);

                      return (
                        <div className="space-y-1" key={item.key}>
                          {children.length > 0 ? (
                            <NavItem
                              accentWhenActive
                              active={isActive}
                              icon={(() => {
                                const Icon = toolsNavIconMap[item.icon];
                                return <Icon className="h-[17px] w-[17px]" />;
                              })()}
                              rightSlot={<ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded ? "rotate-180" : "rotate-0")} />}
                              size="md"
                              type="button"
                              variant="sidebar"
                              onClick={() => {
                                setExpandedToolsParents((current) => ({
                                  ...current,
                                  [item.key]: !Boolean(current[item.key])
                                }));
                              }}
                            >
                              {item.label}
                            </NavItem>
                          ) : (
                            <NavItem
                              accentWhenActive
                              active={isActive}
                              href={item.href}
                              icon={(() => {
                                const Icon = toolsNavIconMap[item.icon];
                                return <Icon className="h-[17px] w-[17px]" />;
                              })()}
                              size="md"
                              variant="sidebar"
                              onClick={() => setIsToolsMenuOpen(false)}
                            >
                              {item.label}
                            </NavItem>
                          )}
                          {children.length > 0 && isExpanded ? (
                            <div className="space-y-1 pb-1 pl-[14px]">
                              {children.map((child) => (
                                <NavItem
                                  active={isActivePrefixPath(pathname, child.href)}
                                  href={child.href}
                                  icon={(() => {
                                    const Icon = toolsNavIconMap[child.icon];
                                    return <Icon className="h-4 w-4" />;
                                  })()}
                                  key={child.key}
                                  size="sm"
                                  variant="sidebar"
                                  onClick={() => setIsToolsMenuOpen(false)}
                                >
                                  {child.label}
                                </NavItem>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none h-3 rounded-b-card border-b border-border/60 bg-surface transition-opacity",
          isScrolled ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
