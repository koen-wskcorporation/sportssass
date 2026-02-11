"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AccountMenuProps = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
};

function initialsFromName(firstName?: string | null, lastName?: string | null, email?: string | null) {
  const first = firstName?.trim().charAt(0) ?? "";
  const last = lastName?.trim().charAt(0) ?? "";

  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }

  return (email?.trim().charAt(0) ?? "A").toUpperCase();
}

export function AccountMenu({ email, firstName, lastName, avatarUrl }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

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

  const accountLabel = email ?? "Signed-in account";
  const fullName = useMemo(() => {
    const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean) as string[];

    if (parts.length) {
      return parts.join(" ");
    }

    return "Account";
  }, [firstName, lastName]);
  const initials = initialsFromName(firstName, lastName, email);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-md border border-transparent px-2 py-1 transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`${fullName} profile`} className="h-8 w-8 rounded-full border object-cover" src={avatarUrl} />
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-surface-alt text-xs font-semibold">
            {initials}
          </span>
        )}
        <span className="max-w-32 truncate text-sm font-semibold">{fullName}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-md border bg-surface p-2 shadow-lg" role="menu">
          <div className="border-b px-2 pb-2">
            <p className="truncate text-sm font-semibold">{fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{accountLabel}</p>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <Link
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")}
              href="/app/account"
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              Account settings
            </Link>
            <Link
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")}
              href="/auth/logout"
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              Sign out
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
