import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { WEDDING_SLUG_PATTERN } from "@/modules/weddings/wedding.constants";
import { isWebsiteTheme, ThemedWebsite } from "@/themes";
import { samplePublicWedding } from "@/themes/sample-wedding";

// Sample content until Phase 5: keep the placeholder out of search engines.
export const metadata: Metadata = {
  title: "Wedding website",
  robots: { index: false, follow: false },
};

interface WeddingWebsiteProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * /w/[slug] — the public wedding website, rendered through the theme registry
 * (SYSTEM_DESIGN §26–28). `?theme=MINIMAL|MODERN|CLASSIC` previews a theme.
 */
export default function WeddingWebsitePage(props: WeddingWebsiteProps) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <WeddingWebsite {...props} />
    </Suspense>
  );
}

async function WeddingWebsite({ params, searchParams }: WeddingWebsiteProps) {
  const { slug } = await params;
  if (!WEDDING_SLUG_PATTERN.test(slug)) notFound();

  // TODO(Phase 5: Wedding Experience): websiteService.getPublicWebsite({ requestId }, slug)
  // — published + not deleted, otherwise notFound() (API_DESIGN §69).
  const { theme } = await searchParams;
  const wedding = samplePublicWedding(isWebsiteTheme(theme) ? theme : "CLASSIC");

  return <ThemedWebsite wedding={wedding} />;
}
