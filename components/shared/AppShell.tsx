"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { OrgAuthContext } from "@/lib/org/types";
import { can } from "@/lib/permissions/can";
import { cn } from "@/lib/utils";
import { getToolsForRole, resolveToolRoute } from "@/modules/core/tools/registry";

type AppShellProps = {
  orgContext: OrgAuthContext;
  children: React.ReactNode;
};

type ShellNavItem = {
  href: string;
  label: string;
  active: (pathname: string) => boolean;
};

function ShellLink({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      className={cn(
        "block rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-surface-alt",
        active && "bg-surface-alt"
      )}
      href={href}
    >
      {label}
    </Link>
  );
}

export function AppShell({ orgContext, children }: AppShellProps) {
  const pathname = usePathname();
  const tools = getToolsForRole(orgContext.membershipRole);
  const canManageOrg = can(orgContext.membershipRole, "org.branding.write");

  const coreLinks: ShellNavItem[] = [
    {
      href: `/${orgContext.orgSlug}`,
      label: "Home",
      active: (path) => path === `/${orgContext.orgSlug}`
    },
    {
      href: `/${orgContext.orgSlug}/sponsors`,
      label: "Sponsors",
      active: (path) => path === `/${orgContext.orgSlug}/sponsors` || path.startsWith(`/${orgContext.orgSlug}/sponsors/success`)
    }
  ];

  const manageLinks: ShellNavItem[] = canManageOrg
    ? [
        {
          href: `/${orgContext.orgSlug}/manage`,
          label: "Manage Overview",
          active: (path) => path === `/${orgContext.orgSlug}/manage`
        },
        {
          href: `/${orgContext.orgSlug}/manage/branding`,
          label: "Branding",
          active: (path) => path.startsWith(`/${orgContext.orgSlug}/manage/branding`)
        },
        {
          href: `/${orgContext.orgSlug}/manage/members`,
          label: "Members",
          active: (path) => path.startsWith(`/${orgContext.orgSlug}/manage/members`)
        },
        {
          href: `/${orgContext.orgSlug}/manage/billing`,
          label: "Billing",
          active: (path) => path.startsWith(`/${orgContext.orgSlug}/manage/billing`)
        }
      ]
    : [];

  const toolLinks = tools.map((tool) => {
    const href = resolveToolRoute(tool.routes.appBase, orgContext.orgSlug);
    const toolPath = href.split("?")[0];

    return {
      href,
      label: tool.name,
      active: (path: string) => path.startsWith(toolPath),
      status: tool.status
    };
  });

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-surface p-4 md:flex">
        <div className="mt-5 rounded-md border bg-surface-alt p-3">
          <p className="text-sm font-semibold">{orgContext.orgName}</p>
          <Badge className="mt-2" variant="secondary">
            {orgContext.membershipRole}
          </Badge>
        </div>

        <nav className="mt-6 space-y-6">
          <div>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Organization</p>
            <div className="space-y-1">
              {coreLinks.map((link) => (
                <ShellLink active={link.active(pathname)} href={link.href} key={link.href} label={link.label} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tools</p>
            <div className="space-y-1">
              {toolLinks.map((toolLink) => (
                <Link
                  className={cn(
                    "block rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-surface-alt",
                    toolLink.active(pathname) && "bg-surface-alt"
                  )}
                  href={toolLink.href}
                  key={toolLink.href}
                >
                  {toolLink.label}
                  {toolLink.status === "beta" ? (
                    <Badge className="ml-2" variant="warning">
                      beta
                    </Badge>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>

          {manageLinks.length ? (
            <div>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manage Org</p>
              <div className="space-y-1">
                {manageLinks.map((link) => (
                  <ShellLink active={link.active(pathname)} href={link.href} key={link.href} label={link.label} />
                ))}
              </div>
            </div>
          ) : null}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col">
        <div className="border-b bg-surface md:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link className="font-display text-lg font-bold" href={`/${orgContext.orgSlug}/sponsors/manage`}>
              {orgContext.orgName}
            </Link>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{orgContext.membershipRole}</span>
          </div>
          <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3">
            {coreLinks.map((link) => (
              <Link
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-semibold",
                  link.active(pathname) ? "bg-surface-alt" : "bg-surface"
                )}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
            {toolLinks.map((toolLink) => (
              <Link
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-semibold",
                  toolLink.active(pathname) ? "bg-surface-alt" : "bg-surface"
                )}
                href={toolLink.href}
                key={toolLink.href}
              >
                {toolLink.label}
              </Link>
            ))}
            {manageLinks[0] ? (
              <Link
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-semibold",
                  manageLinks[0].active(pathname) ? "bg-surface-alt" : "bg-surface"
                )}
                href={manageLinks[0].href}
              >
                Manage
              </Link>
            ) : null}
          </div>
        </div>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
