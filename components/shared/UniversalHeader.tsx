import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { AccountMenu } from "@/components/shared/AccountMenu";
import { getOrgContext, getOrgSlugFromSearchParams } from "@/lib/tenancy/getOrgContext";
import { getSignedOrgAssetUrl } from "@/lib/branding/getSignedOrgAssetUrl";

function getOrgRoute(pathname: string | null, search: string | null): { orgSlug: string; mode: "public" | "auth" } | null {
  if (!pathname) {
    return null;
  }

  const searchParams = new URLSearchParams(search ?? "");
  const queryOrgSlug = getOrgSlugFromSearchParams(searchParams);

  if (pathname.startsWith("/app/sponsors/manage") && queryOrgSlug) {
    return { orgSlug: queryOrgSlug, mode: "auth" };
  }

  if (pathname.startsWith("/app/sponsors/form") && queryOrgSlug) {
    return { orgSlug: queryOrgSlug, mode: "public" };
  }

  const appMatch = /^\/app\/org\/([^/]+)/.exec(pathname);

  if (appMatch) {
    return { orgSlug: appMatch[1], mode: "auth" };
  }

  const settingsMatch = /^\/org\/([^/]+)\/settings(?:\/|$)/.exec(pathname);

  if (settingsMatch) {
    return { orgSlug: settingsMatch[1], mode: "auth" };
  }

  const publicMatch = /^\/org\/([^/]+)/.exec(pathname);

  if (publicMatch) {
    return { orgSlug: publicMatch[1], mode: "public" };
  }

  return null;
}

export async function UniversalHeader() {
  const currentUser = await getCurrentUser();
  const requestHeaders = await headers();
  const orgRoute = getOrgRoute(requestHeaders.get("x-pathname"), requestHeaders.get("x-search"));
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
            <picture>
              <source srcSet="/brand/logo.svg" type="image/svg+xml" />
              <img alt="Platform logo" className="h-7 w-auto" src="/brand/logo.png" />
            </picture>
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
