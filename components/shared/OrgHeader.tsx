"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import type { OrgRole } from "@/modules/core/tools/access";
import { can } from "@/lib/permissions/can";
import { getEditablePageForPathname, getEditablePageHref } from "@/modules/site-builder/registry";
import { cn } from "@/lib/utils";

type OrgHeaderProps = {
  orgSlug: string;
  orgName: string;
  orgLogoUrl?: string | null;
  membershipRole?: OrgRole | null;
};

type OrgNavItem = {
  href: string;
  label: string;
  active: (pathname: string) => boolean;
};

export function OrgHeader({ orgSlug, orgName, orgLogoUrl, membershipRole = null }: OrgHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgBasePath = `/${orgSlug}`;
  const canManageOrg = membershipRole ? can(membershipRole, "org.branding.write") : false;
  const editablePageKey = getEditablePageForPathname(pathname, orgSlug);
  const canEditPage = membershipRole ? can(membershipRole, "org.site.write") : false;
  const editModeActive = searchParams.get("edit") === "1";
  const editPageHref = editablePageKey ? getEditablePageHref(orgSlug, editablePageKey, !editModeActive) : null;

  const navItems: OrgNavItem[] = [
    {
      href: orgBasePath,
      label: "Home",
      active: (path) => path === orgBasePath
    },
    {
      href: `${orgBasePath}/sponsors`,
      label: "Sponsors",
      active: (path) => path === `${orgBasePath}/sponsors` || path.startsWith(`${orgBasePath}/sponsors/success`)
    }
  ];

  return (
    <header className="border-b bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-[52px] w-full max-w-7xl items-center gap-4 px-4 md:h-14 md:px-8">
        <Link className="inline-flex min-w-0 items-center gap-3" href={orgBasePath}>
          {orgLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={`${orgName} logo`} className="h-8 max-w-[140px] object-contain" src={orgLogoUrl} />
          ) : (
            <span className="truncate text-sm font-semibold">{orgName}</span>
          )}
        </Link>

        <nav className="ml-2 hidden min-w-0 flex-1 items-center gap-4 overflow-x-auto md:flex">
          {navItems.map((item) => (
            <Link
              className={cn(
                "inline-flex h-14 items-center border-b-2 px-1 text-sm font-medium transition-colors",
                item.active(pathname)
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-primary/60 hover:text-foreground"
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {canEditPage && editPageHref ? (
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={editPageHref}>
              {editModeActive ? "Cancel Edit" : "Edit Page"}
            </Link>
          ) : null}
          {canManageOrg ? (
            <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={`${orgBasePath}/manage`}>
              Manage
            </Link>
          ) : null}
        </div>
      </div>

      <div className="border-t md:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2">
          {navItems.map((item) => (
            <Link
              className={cn(
                "inline-flex items-center whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                item.active(pathname) ? "border-primary bg-surface-alt text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          {canEditPage && editPageHref ? (
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={editPageHref}>
              {editModeActive ? "Cancel Edit" : "Edit Page"}
            </Link>
          ) : null}
          {canManageOrg ? (
            <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={`${orgBasePath}/manage`}>
              Manage
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
