"use client";

import Link from "next/link";
import { ChevronDown, CreditCard, FileText, Handshake, LayoutDashboard, Megaphone, Palette, Settings, Shield, Users, Wrench } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { NavItem } from "@/components/ui/nav-item";
import { cn } from "@/lib/utils";

type OrgToolsManageMenuProps = {
  orgSlug: string;
  canManageOrg: boolean;
  canAccessTools: boolean;
  canEditPages: boolean;
};

type MenuItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

function matchesPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OrgToolsManageMenu({ orgSlug, canManageOrg, canAccessTools, canEditPages }: OrgToolsManageMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isTopMenuOpen = searchParams.get("menu") === "1";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapperRef.current) {
        return;
      }

      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const primaryHref = canAccessTools ? `/${orgSlug}/tools` : `/${orgSlug}/manage`;
  const toolsItems = useMemo<MenuItem[]>(
    () => [
      {
        href: `/${orgSlug}/tools`,
        label: "Tools dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
        active: matchesPath(pathname, `/${orgSlug}/tools`)
      },
      {
        href: `/${orgSlug}/tools/forms`,
        label: "Forms",
        icon: <FileText className="h-4 w-4" />,
        active: matchesPath(pathname, `/${orgSlug}/tools/forms`)
      },
      {
        href: `/${orgSlug}/tools/sponsors`,
        label: "Sponsors",
        icon: <Handshake className="h-4 w-4" />,
        active: matchesPath(pathname, `/${orgSlug}/tools/sponsors`)
      },
      {
        href: `/${orgSlug}/tools/sponsors/manage`,
        label: "Sponsor submissions",
        icon: <Wrench className="h-4 w-4" />,
        active: matchesPath(pathname, `/${orgSlug}/tools/sponsors/manage`)
      },
      {
        href: `/${orgSlug}/tools/announcements`,
        label: "Announcements",
        icon: <Megaphone className="h-4 w-4" />,
        active: matchesPath(pathname, `/${orgSlug}/tools/announcements`)
      }
    ],
    [orgSlug, pathname]
  );
  const managementItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [];

    if (canManageOrg || canEditPages) {
      items.push({
        href: `/${orgSlug}/manage`,
        label: "Manage overview",
        icon: <Settings className="h-4 w-4" />,
        active: matchesPath(pathname, `/${orgSlug}/manage`)
      });
    }

    if (canManageOrg) {
      items.push(
        {
          href: `/${orgSlug}/manage/org-info`,
          label: "Org info",
          icon: <LayoutDashboard className="h-4 w-4" />,
          active: matchesPath(pathname, `/${orgSlug}/manage/org-info`)
        },
        {
          href: `/${orgSlug}/manage/branding`,
          label: "Branding",
          icon: <Palette className="h-4 w-4" />,
          active: matchesPath(pathname, `/${orgSlug}/manage/branding`)
        },
        {
          href: `/${orgSlug}/manage/members`,
          label: "Accounts & access",
          icon: <Users className="h-4 w-4" />,
          active: matchesPath(pathname, `/${orgSlug}/manage/members`)
        },
        {
          href: `/${orgSlug}/manage/members/roles`,
          label: "Roles",
          icon: <Shield className="h-4 w-4" />,
          active: matchesPath(pathname, `/${orgSlug}/manage/members/roles`)
        },
        {
          href: `/${orgSlug}/manage/billing`,
          label: "Billing",
          icon: <CreditCard className="h-4 w-4" />,
          active: matchesPath(pathname, `/${orgSlug}/manage/billing`)
        }
      );
    }

    if (canManageOrg || canEditPages) {
      items.push({
        href: `/${orgSlug}/manage/pages`,
        label: "Pages",
        icon: <FileText className="h-4 w-4" />,
        active: matchesPath(pathname, `/${orgSlug}/manage/pages`) && !isTopMenuOpen
      });

      items.push({
        href: `/${orgSlug}/manage/pages?menu=1`,
        label: "Top menu",
        icon: <Wrench className="h-4 w-4" />,
        active: matchesPath(pathname, `/${orgSlug}/manage/pages`) && isTopMenuOpen
      });
    }

    return items;
  }, [canEditPages, canManageOrg, isTopMenuOpen, orgSlug, pathname]);

  const sections = useMemo<MenuSection[]>(() => {
    const nextSections: MenuSection[] = [];

    if (canAccessTools) {
      nextSections.push({
        label: "Tools",
        items: toolsItems
      });
    }

    if (managementItems.length > 0) {
      nextSections.push({
        label: "Management",
        items: managementItems
      });
    }

    return nextSections;
  }, [canAccessTools, managementItems, toolsItems]);

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <div className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "h-9 gap-0 overflow-hidden p-0")}>
        <Link className="inline-flex h-full items-center gap-2 px-3" href={primaryHref}>
          <Wrench className="h-4 w-4" />
          Tools
        </Link>
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          className="inline-flex h-full w-8 items-center justify-center border-l border-border/70 text-text-muted transition-colors hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "rotate-0")} />
        </button>
      </div>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-card border bg-surface px-2 py-3 shadow-card" role="menu">
          <div className="max-h-[min(70vh,420px)] space-y-4 overflow-y-auto pr-1">
            {sections.map((section) => (
              <div key={section.label}>
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{section.label}</p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavItem
                      active={item.active}
                      href={item.href}
                      icon={item.icon}
                      key={item.href}
                      onClick={() => setOpen(false)}
                      role="menuitem"
                      size="sm"
                      variant="dropdown"
                    >
                      {item.label}
                    </NavItem>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
