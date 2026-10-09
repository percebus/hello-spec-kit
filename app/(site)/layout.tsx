import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "../components/site-header";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "Signal & Story",
    template: "%s | Signal & Story",
  },
  description:
    "A podcast about the people, choices, and ideas shaping creative technology.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
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
