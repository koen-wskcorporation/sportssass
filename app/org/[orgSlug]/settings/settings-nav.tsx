"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type SettingsNavProps = {
  orgSlug: string;
};

const settingsLinks = [
  { href: "", label: "Overview" },
  { href: "/branding", label: "Branding" },
  { href: "/members", label: "Members" },
  { href: "/billing", label: "Billing" }
];

export function SettingsNav({ orgSlug }: SettingsNavProps) {
  const pathname = usePathname();
  const basePath = `/org/${orgSlug}/settings`;

  return (
    <nav className="flex flex-wrap gap-2">
      {settingsLinks.map((item) => {
        const href = `${basePath}${item.href}`;
        const isActive = item.href === "" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-alt",
              isActive && "bg-surface-alt"
            )}
            href={href}
            key={item.label}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
