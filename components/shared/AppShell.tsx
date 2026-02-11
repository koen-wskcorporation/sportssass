"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ResolvedOrgContext } from "@/lib/tenancy/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getToolsForRole, resolveToolRoute } from "@/modules/core/tools/registry";
import { hasPermissions } from "@/modules/core/tools/access";
import { MobileShell } from "@/components/shared/MobileShell";

type AppShellProps = {
  orgContext: ResolvedOrgContext;
  children: React.ReactNode;
};

export function AppShell({ orgContext, children }: AppShellProps) {
  const pathname = usePathname();
  const tools = getToolsForRole(orgContext.membershipRole);

  const toolsByGroup = tools.reduce<Record<string, typeof tools>>((groupMap, tool) => {
    groupMap[tool.navGroup] = groupMap[tool.navGroup] ?? [];
    groupMap[tool.navGroup].push(tool);
    return groupMap;
  }, {});

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-surface p-4 md:flex">
        <Link className="rounded-md px-2 py-1 font-display text-xl font-bold" href={`/app/o/${orgContext.orgSlug}`}>
          Platform
        </Link>
        <div className="mt-5 rounded-md border bg-surface-alt p-3">
          <p className="text-sm font-semibold">{orgContext.orgName}</p>
          <Badge className="mt-2" variant="secondary">
            {orgContext.membershipRole}
          </Badge>
        </div>

        <nav className="mt-6 space-y-6">
          <div>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
            <Link
              className={cn(
                "block rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-surface-alt",
                pathname === `/app/o/${orgContext.orgSlug}` && "bg-surface-alt"
              )}
              href={`/app/o/${orgContext.orgSlug}`}
            >
              Overview
            </Link>
            {hasPermissions(orgContext.membershipRole, ["org.branding.read"]) ? (
              <Link
                className={cn(
                  "mt-1 block rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-surface-alt",
                  pathname === `/app/o/${orgContext.orgSlug}/settings/branding` && "bg-surface-alt"
                )}
                href={`/app/o/${orgContext.orgSlug}/settings/branding`}
              >
                Branding Settings
              </Link>
            ) : null}
          </div>

          {Object.entries(toolsByGroup).map(([group, groupedTools]) => (
            <div key={group}>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
              <div className="space-y-1">
                {groupedTools.map((tool) => {
                  const href = resolveToolRoute(tool.routes.appBase, orgContext.orgSlug);
                  const isActive = pathname.startsWith(href);

                  return (
                    <Link
                      className={cn(
                        "block rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-surface-alt",
                        isActive && "bg-surface-alt"
                      )}
                      href={href}
                      key={tool.toolId}
                    >
                      {tool.name}
                      {tool.status === "beta" ? <Badge className="ml-2" variant="warning">beta</Badge> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col">
        <MobileShell orgContext={orgContext} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
