import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Providers } from "./providers";
import "./globals.css";

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
    <html lang="en-IN">
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
