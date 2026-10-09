import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";

// Test-only root layout: no site header/footer, so components render in isolation.
export const metadata: Metadata = {
  title: "Test harness | Signal & Story",
  robots: { index: false, follow: false },
};

export default function TestLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
