import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "./providers";
import "./globals.css";

// Self-hosted by next/font (no requests to Google at runtime); globals.css maps
// the variables onto font-sans and font-serif.
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Make My Marriage",
    template: "%s · Make My Marriage",
  },
  description: "Plan your wedding together — events, tasks, guests, RSVPs, vendors and memories.",
  applicationName: "Make My Marriage",
  icons: { icon: "/brand/logo-mark.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en-IN"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${playfair.variable}`}
    >
      {/* Browser extensions (Grammarly and others) add attributes to <body> before React
          loads. This ignores attribute differences on <body> itself only; mismatches in
          the page inside are still reported. */}
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
