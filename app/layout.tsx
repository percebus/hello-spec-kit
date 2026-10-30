import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PreviewBanner } from "./components/preview-banner";
import { SiteHeader } from "./components/site-header";
import "./globals.css";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Signal & Story";

export const metadata: Metadata = {
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description:
    "A podcast about the people, choices, and ideas shaping creative technology.",
  ...(process.env.NEXT_PUBLIC_PREVIEW_PR
    ? { robots: { index: false, follow: false } }
    : {}),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PreviewBanner />
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <p>Signal & Story</p>
          <p>New conversations for curious builders.</p>
        </footer>
      </body>
    </html>
  );
}
