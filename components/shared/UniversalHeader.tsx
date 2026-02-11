import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { AccountMenu } from "@/components/shared/AccountMenu";
import { getOrgContext } from "@/lib/tenancy/getOrgContext";
import { getSignedOrgAssetUrl } from "@/lib/branding/getSignedOrgAssetUrl";

function resolveLogoSrc() {
  const svgPath = path.join(process.cwd(), "public", "brand", "logo.svg");
  if (fs.existsSync(svgPath)) {
    return "/brand/logo.svg";
  }

  const pngPath = path.join(process.cwd(), "public", "brand", "logo.png");
  if (fs.existsSync(pngPath)) {
    return "/brand/logo.png";
  }

  return null;
}

function getOrgRoute(pathname: string | null): { orgSlug: string; mode: "public" | "auth" } | null {
  if (!pathname) {
    return null;
  }

  const appMatch = /^\/app\/o\/([^/]+)/.exec(pathname);

  if (appMatch) {
    return { orgSlug: appMatch[1], mode: "auth" };
  }

  const publicMatch = /^\/o\/([^/]+)/.exec(pathname);

  if (publicMatch) {
    return { orgSlug: publicMatch[1], mode: "public" };
  }

  return null;
}

export async function UniversalHeader() {
  const currentUser = await getCurrentUser();
  const requestHeaders = await headers();
  const orgRoute = getOrgRoute(requestHeaders.get("x-pathname"));
  const logoSrc = resolveLogoSrc();
  const homeHref = currentUser ? "/app" : "/";
  const orgContext = orgRoute
    ? orgRoute.mode === "auth"
      ? await getOrgContext(orgRoute.orgSlug, "auth")
      : await getOrgContext(orgRoute.orgSlug, "public")
    : null;
  const orgLogoSignedUrl = orgContext?.branding.logoPath ? await getSignedOrgAssetUrl(orgContext.branding.logoPath, 60 * 10) : null;

  return (
    <header className="border-b bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <div className="inline-flex items-center gap-2">
          <Link className="inline-flex items-center gap-2" href={homeHref}>
            {logoSrc ? (
              <Image alt="Platform logo" height={28} priority src={logoSrc} width={92} />
            ) : (
              <span className="font-display text-lg font-bold">Platform</span>
            )}
          </Link>

          {orgLogoSignedUrl ? (
            <>
              <span aria-hidden className="h-5 w-px bg-border" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`${orgContext?.orgName ?? "Organization"} logo`} className="h-6 w-auto" src={orgLogoSignedUrl} />
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <AccountMenu
              avatarUrl={currentUser.avatarUrl}
              email={currentUser.email}
              firstName={currentUser.firstName}
              lastName={currentUser.lastName}
            />
          ) : (
            <Link href="/auth/login">
              <Button size="sm" variant="secondary">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
