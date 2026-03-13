import type { Metadata } from "next";
import "./globals.css";
import { AppFooter } from "@orgframe/ui/shared/AppFooter";
import { PrimaryHeader } from "@orgframe/ui/shared/PrimaryHeader";
import { ToastProvider } from "@orgframe/ui/ui/toast";
import { shouldShowBranchHeaders } from "@/lib/env/branchVisibility";
import { UploadProvider } from "@/modules/uploads";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "Sports SaaS",
    template: "%s | Sports SaaS"
  },
  description: "Multi-tenant sports operations suite"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showHeaders = shouldShowBranchHeaders();
  return (
    <html lang="en">
      <body className="bg-canvas text-text antialiased">
        <ToastProvider>
          <UploadProvider>
            <div className="app-frame">
              <div className="app-root flex min-h-screen min-w-0 flex-col">
                {showHeaders ? <PrimaryHeader /> : null}
                <div className={showHeaders ? "flex-1 min-w-0 pt-[var(--layout-gap)]" : "flex-1 min-w-0"}>{children}</div>
                
              </div>
              <div className="panel-dock" id="panel-dock" />
            </div>
          </UploadProvider>
        </ToastProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
