import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import "./globals.css";

export const instant = false;

export const metadata: Metadata = {
  title: "K DEALS — Electronics & Gadgets Marketplace Kuwait",
  description: "Shop colourful electronics and general gadgets in Kuwait. Fast, secure, and promotional.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-kdeals-locale") === "ar" ? "ar" : "en";

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
