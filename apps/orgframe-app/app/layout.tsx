import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AppFooter } from "@/src/features/core/layout/components/AppFooter";
import { PrimaryHeader } from "@/src/features/core/layout/components/PrimaryHeader";
import { ConfirmDialogProvider } from "@orgframe/ui/primitives/confirm-dialog";
import { ThemeModeProvider } from "@orgframe/ui/primitives/theme-mode";
import { ToastProvider } from "@orgframe/ui/primitives/toast";
import { shouldShowBranchHeaders } from "@/src/shared/env/branchVisibility";
import { getTenantBaseHosts, normalizeHost, resolveOrgSubdomain } from "@/src/shared/domains/customDomains";
import { FileManagerProvider } from "@/src/features/files/manager";
import { UploadProvider } from "@/src/features/files/uploads";
import { OrderPanelProvider } from "@/src/features/orders";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "OrgFrame",
    template: "%s | OrgFrame"
  },
  description: "Multi-tenant sports operations suite"
};

function parseHeaderHostWithPort(value: string | null | undefined) {
  const raw = value?.split(",")[0]?.trim() ?? "";
  if (!raw) {
    return {
      host: "",
      hostWithPort: "",
      port: ""
    };
  }

  try {
    const parsed = new URL(`http://${raw}`);
    const host = normalizeHost(parsed.hostname);
    const port = parsed.port.trim();
    return {
      host,
      hostWithPort: port ? `${host}:${port}` : host,
      port
    };
  } catch {
    const host = normalizeHost(raw);
    const portMatch = raw.match(/:(\d+)$/);
    const port = portMatch?.[1]?.trim() ?? "";
    return {
      host,
      hostWithPort: port ? `${host}:${port}` : host,
      port
    };
  }
}

async function getHeaderRoutingContext() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const hostHeader = forwardedHost || headerStore.get("host");
  const parsedHost = parseHeaderHostWithPort(hostHeader);
  const host = parsedHost.host;
  const hostWithPort = parsedHost.hostWithPort || host;
  const tenantBaseHosts = getTenantBaseHosts();
  const orgSubdomain = resolveOrgSubdomain(host, tenantBaseHosts);

  const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const protocol =
    forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : process.env.NODE_ENV === "production" ? "https" : "http";

  if (orgSubdomain) {
    const baseHostWithPort = parsedHost.port ? `${orgSubdomain.baseHost}:${parsedHost.port}` : orgSubdomain.baseHost;
    const tenantBaseOrigin = `${protocol}://${baseHostWithPort}`;
    return {
      currentOrgSlug: orgSubdomain.orgSlug,
      homeHref: `${tenantBaseOrigin}/`,
      tenantBaseOrigin
    };
  }

  if (tenantBaseHosts.has(host)) {
    return {
      currentOrgSlug: null,
      homeHref: "/",
      tenantBaseOrigin: `${protocol}://${hostWithPort}`
    };
  }

  return {
    currentOrgSlug: null,
    homeHref: "/",
    tenantBaseOrigin: null
  };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showHeaders = shouldShowBranchHeaders();
  const headerRouting = showHeaders ? await getHeaderRoutingContext() : { currentOrgSlug: null, homeHref: "/", tenantBaseOrigin: null };
  return (
    <html lang="en">
      <body className="bg-canvas text-text antialiased">
        <ThemeModeProvider>
          <ToastProvider>
            <ConfirmDialogProvider>
              <OrderPanelProvider>
                <FileManagerProvider>
                  <UploadProvider>
                    <div className="app-frame">
                      <div className="app-root flex min-h-screen min-w-0 flex-col">
                        {showHeaders ? (
                          <PrimaryHeader currentOrgSlug={headerRouting.currentOrgSlug} homeHref={headerRouting.homeHref} tenantBaseOrigin={headerRouting.tenantBaseOrigin} />
                        ) : null}
                        <div className={showHeaders ? "flex-1 min-w-0 pt-[var(--layout-gap)]" : "flex-1 min-w-0"}>{children}</div>
                      </div>
                      <div className="panel-dock" id="panel-dock" />
                    </div>
                  </UploadProvider>
                </FileManagerProvider>
              </OrderPanelProvider>
            </ConfirmDialogProvider>
          </ToastProvider>
        </ThemeModeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
