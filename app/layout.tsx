import type { Metadata } from "next";
import "./globals.css";
import { AppFooter } from "@/components/shared/AppFooter";
import { PrimaryHeader } from "@/components/shared/PrimaryHeader";
import { ToastProvider } from "@/components/ui/toast";
import { UploadProvider } from "@/modules/uploads";
import { SpeedInsights } from "@vercel/speed-insights/next"

<SpeedInsights/>

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
  return (
    <html lang="en">
      <body className="bg-canvas text-text antialiased">
        <ToastProvider>
          <UploadProvider>
            <div className="app-frame">
              <div className="app-root flex min-h-screen min-w-0 flex-col">
                <PrimaryHeader />
                <div className="flex-1 min-w-0">{children}</div>
                <AppFooter />
              </div>
              <div className="panel-dock" id="panel-dock" />
            </div>
          </UploadProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
