import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { AppFooter } from "@orgframe/ui/shared/AppFooter";
import { PrimaryHeader } from "@orgframe/ui/shared/PrimaryHeader";
import { ConfirmDialogProvider } from "@orgframe/ui/ui/confirm-dialog";
import { ThemeModeProvider } from "@orgframe/ui/ui/theme-mode";
import { ToastProvider } from "@orgframe/ui/ui/toast";
import { shouldShowBranchHeaders } from "@/lib/env/branchVisibility";
import { getTenantBaseHosts, normalizeHost, resolveOrgSubdomain } from "@/lib/domains/customDomains";
import { FileManagerProvider } from "@/modules/file-manager";
import { UploadProvider } from "@/modules/uploads";
import { OrderPanelProvider } from "@/modules/orders";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "OrgFrame",
    template: "%s | OrgFrame"
  },
  description: "Multi-tenant sports operations suite"
};

async function getHeaderRoutingContext() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = normalizeHost(forwardedHost || headerStore.get("host"));
  const tenantBaseHosts = getTenantBaseHosts();
  const orgSubdomain = resolveOrgSubdomain(host, tenantBaseHosts);

  const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const protocol =
    forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : process.env.NODE_ENV === "production" ? "https" : "http";

  if (orgSubdomain) {
    const tenantBaseOrigin = `${protocol}://${orgSubdomain.baseHost}`;
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
      tenantBaseOrigin: `${protocol}://${host}`
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
