"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ResolvedOrgContext } from "@/lib/tenancy/types";
import { getToolsForRole, resolveToolRoute } from "@/modules/core/tools/registry";
import { cn } from "@/lib/utils";

type MobileShellProps = {
  orgContext: ResolvedOrgContext;
};

export function MobileShell({ orgContext }: MobileShellProps) {
  const pathname = usePathname();
  const tools = getToolsForRole(orgContext.membershipRole);

  return (
    <div className="border-b bg-surface md:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link className="font-display text-lg font-bold" href={`/app/o/${orgContext.orgSlug}`}>
          {orgContext.orgName}
        </Link>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{orgContext.membershipRole}</span>
      </div>
      <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3">
        <Link
          className={cn(
            "rounded-md border px-3 py-1.5 text-xs font-semibold",
            pathname === `/app/o/${orgContext.orgSlug}` ? "bg-surface-alt" : "bg-surface"
          )}
          href={`/app/o/${orgContext.orgSlug}`}
        >
          Overview
        </Link>
        {tools.map((tool) => {
          const href = resolveToolRoute(tool.routes.appBase, orgContext.orgSlug);
          const isActive = pathname.startsWith(href);

          return (
            <Link
              className={cn("rounded-md border px-3 py-1.5 text-xs font-semibold", isActive ? "bg-surface-alt" : "bg-surface")}
              href={href}
              key={tool.toolId}
            >
              {tool.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
