import type { Metadata } from "next";
import "./globals.css";
import { UniversalHeader } from "@/components/shared/UniversalHeader";

export const metadata: Metadata = {
  title: "Sports Platform",
  description: "Multi-tenant sports operations platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="flex min-h-screen flex-col">
          <UniversalHeader />
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
