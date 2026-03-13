import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OrgFrame | Sports Operations Platform',
  description: 'OrgFrame helps sports organizations run operations, communication, scheduling, and registrations in one workspace.',
  openGraph: {
    title: 'OrgFrame | Sports Operations Platform',
    description: 'Operate your organization from one modern platform with OrgFrame.',
    url: 'https://orgframe.com',
    siteName: 'OrgFrame',
    type: 'website'
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
