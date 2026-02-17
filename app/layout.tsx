import type { Metadata } from "next";
import "./globals.css";
import { PrimaryHeader } from "@/components/shared/PrimaryHeader";
import { ToastProvider } from "@/components/ui/toast";
import { UploadProvider } from "@/modules/uploads";

export const metadata: Metadata = {
  title: "Sports SaaS",
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
            <div className="flex min-h-screen flex-col">
              <PrimaryHeader />
              <div className="flex-1">{children}</div>
            </div>
          </UploadProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
