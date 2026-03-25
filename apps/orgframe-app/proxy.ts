import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeHost,
  getPlatformHost,
  getPlatformHosts,
  getTenantBaseHosts,
  shouldSkipCustomDomainRoutingPath,
  resolveOrgSubdomain,
  isReservedSubdomain
} from "@/src/shared/domains/customDomains";
import { updateSupabaseSessionFromProxy } from "@/src/shared/supabase/proxy";
import { getSupabasePublicConfig } from "@/src/shared/supabase/config";

let lookupClient: ReturnType<typeof createClient<any>> | null = null;

function getLookupClient() {
  if (lookupClient) {
    return lookupClient;
  }

  const { supabaseUrl, supabasePublishableKey } = getSupabasePublicConfig();

  lookupClient = createClient<any>(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return lookupClient;
}

function parseHostWithPort(value: string | null | undefined) {
  const raw = value?.split(",")[0]?.trim() ?? "";
  if (!raw) {
    return {
      host: "",
      port: ""
    };
  }

  try {
    const parsed = new URL(`http://${raw}`);
    return {
      host: normalizeHost(parsed.hostname),
      port: parsed.port.trim()
    };
  } catch {
    const host = normalizeHost(raw);
    const portMatch = raw.match(/:(\d+)$/);
    return {
      host,
      port: portMatch?.[1]?.trim() ?? ""
    };
  }
}

function applyRedirectHostname(url: URL, hostname: string, port: string) {
  url.hostname = hostname;
  if (port) {
    url.port = port;
  }
}

async function resolveOrgSlugForDomain(host: string) {
  const supabase = getLookupClient();
  const candidates = getDomainLookupCandidates(host);

  for (const candidate of candidates) {
    const { data, error } = await supabase.rpc("resolve_org_slug_for_domain", {
      target_domain: candidate
    });

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Custom domain lookup failed:", error.message);
      }

      continue;
    }

    if (typeof data === "string" && data.trim().length > 0) {
      return data.trim();
    }
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = forwardedHost || request.headers.get("host");
  const parsedHost = parseHostWithPort(hostHeader);
  const host = parsedHost.host;
  const tenantBaseHosts = getTenantBaseHosts();
  const platformHosts = getPlatformHosts();
  const orgSubdomain = resolveOrgSubdomain(host, tenantBaseHosts);

  const legacyOrgPathRedirect = getLegacyOrgPathRedirect(host, request.nextUrl.pathname, tenantBaseHosts);
  if (legacyOrgPathRedirect) {
    const redirectUrl = request.nextUrl.clone();
    applyRedirectHostname(redirectUrl, `${legacyOrgPathRedirect.orgSlug}.${legacyOrgPathRedirect.baseHost}`, parsedHost.port);
    redirectUrl.pathname = legacyOrgPathRedirect.pathname;
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }

  let rewriteUrl: URL | null = null;

  if (orgSubdomain && !shouldSkipCustomDomainRoutingPath(request.nextUrl.pathname)) {
    const prefix = `/${orgSubdomain.orgSlug}`;
    const currentPathname = request.nextUrl.pathname;
    const alreadyOrgPrefixed = currentPathname === prefix || currentPathname.startsWith(`${prefix}/`);

    if (alreadyOrgPrefixed) {
      const redirectUrl = request.nextUrl.clone();
      applyRedirectHostname(redirectUrl, host, parsedHost.port);
      redirectUrl.pathname = stripOrgPrefixPath(currentPathname, prefix);
      return NextResponse.redirect(redirectUrl, { status: 308 });
    }

    rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = currentPathname === "/" ? prefix : `${prefix}${currentPathname}`;
  } else if (host && !platformHosts.has(host)) {
    const orgSlug = await resolveOrgSlugForDomain(host);

    if (orgSlug) {
      const redirectHost = getCustomDomainRedirectHost(request.nextUrl.pathname, orgSlug);

      if (redirectHost) {
        const protocol = getRequestProtocol(request);
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.protocol = `${protocol}:`;
        applyRedirectHostname(redirectUrl, redirectHost, parsedHost.port);
        return NextResponse.redirect(redirectUrl, { status: 307 });
      }

      if (!shouldSkipCustomDomainRoutingPath(request.nextUrl.pathname)) {
        const prefix = `/${orgSlug}`;
        const currentPathname = request.nextUrl.pathname;
        const alreadyOrgPrefixed = currentPathname === prefix || currentPathname.startsWith(`${prefix}/`);

        if (alreadyOrgPrefixed) {
          const redirectUrl = request.nextUrl.clone();
          applyRedirectHostname(redirectUrl, host, parsedHost.port);
          redirectUrl.pathname = stripOrgPrefixPath(currentPathname, prefix);
          return NextResponse.redirect(redirectUrl, { status: 308 });
        }

        rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = currentPathname === "/" ? prefix : `${prefix}${currentPathname}`;
      }
    }
  }

  return updateSupabaseSessionFromProxy(request, {
    rewriteUrl
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|heic|heif|ico)$).*)"]
};

const NON_ORG_PATH_SEGMENTS = new Set(["account", "api", "auth", "brand", "forbidden", "x"]);
const ORG_SEGMENT_PATTERN = /^[a-z0-9-]+$/;

export function getLegacyOrgPathRedirect(host: string, pathname: string, tenantBaseHosts: Set<string>) {
  if (!tenantBaseHosts.has(host)) {
    return null;
  }

  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  if (!trimmed) {
    return null;
  }

  const [firstSegment, ...restSegments] = trimmed.split("/");
  if (
    !firstSegment ||
    NON_ORG_PATH_SEGMENTS.has(firstSegment) ||
    isReservedSubdomain(firstSegment) ||
    !ORG_SEGMENT_PATTERN.test(firstSegment)
  ) {
    return null;
  }

  return {
    baseHost: host,
    orgSlug: firstSegment,
    pathname: restSegments.length > 0 ? `/${restSegments.join("/")}` : "/"
  };
}

function stripOrgPrefixPath(pathname: string, prefix: string) {
  if (pathname === prefix) {
    return "/";
  }

  const stripped = pathname.slice(prefix.length);
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

function getRequestProtocol(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwardedProto === "http" || forwardedProto === "https") {
    return forwardedProto;
  }

  return request.nextUrl.protocol === "https:" ? "https" : "http";
}

const ORG_SCOPED_ROOT_SEGMENTS = new Set(["manage", "tools"]);
const PLATFORM_ONLY_ROOT_SEGMENTS = new Set(["account", "api", "auth", "brand", "forbidden", "x"]);

export function getCustomDomainRedirectHost(pathname: string, orgSlug: string) {
  const trimmedPath = pathname.replace(/^\/+/, "");
  if (!trimmedPath) {
    return null;
  }

  const [firstSegment, secondSegment] = trimmedPath.split("/");
  const platformHost = getPlatformHost();

  if (firstSegment && ORG_SCOPED_ROOT_SEGMENTS.has(firstSegment)) {
    return `${orgSlug}.${platformHost}`;
  }

  if (firstSegment && PLATFORM_ONLY_ROOT_SEGMENTS.has(firstSegment)) {
    return platformHost;
  }

  if (
    firstSegment &&
    secondSegment &&
    firstSegment !== orgSlug &&
    ORG_SEGMENT_PATTERN.test(firstSegment) &&
    !NON_ORG_PATH_SEGMENTS.has(firstSegment) &&
    !isReservedSubdomain(firstSegment)
  ) {
    return platformHost;
  }

  return null;
}

function getDomainLookupCandidates(host: string) {
  const candidates = new Set<string>([host]);

  if (host.startsWith("www.")) {
    candidates.add(host.slice("www.".length));
  } else {
    candidates.add(`www.${host}`);
  }

  return Array.from(candidates).filter(Boolean);
}
