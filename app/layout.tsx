import type { Metadata } from "next";
import "./globals.css";
import { PrimaryHeader } from "@/components/shared/PrimaryHeader";
import { ToastProvider } from "@/components/ui/toast";

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
      <body className="bg-surface font-sans text-foreground antialiased">
        <ToastProvider>
          <div className="flex min-h-screen flex-col">
            <PrimaryHeader />
            <div className="flex-1">{children}</div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
