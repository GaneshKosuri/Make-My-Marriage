import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { WebsiteUnavailable } from "@/features/website/components/site-messages";
import { websiteService } from "@/modules/weddings";
import { WEDDING_SLUG_PATTERN } from "@/modules/weddings/wedding.constants";
import type { PublicWeddingDto } from "@/modules/weddings/wedding.types";
import { isAppError } from "@/server/errors";
import { getClientIp, policies } from "@/server/http";
import { logger } from "@/server/logging/logger";
import { getRateLimiter } from "@/server/security/rate-limit";
import { ThemedWebsite } from "@/themes";

// Families share the link themselves; search engines never list it (decided 2026-11-24).
export const metadata: Metadata = {
  title: "Wedding website",
  robots: { index: false, follow: false },
};

/**
 * /w/[slug] (PRD §9.18–9.19, API_DESIGN §69): the published wedding website,
 * rendered through the theme registry (SYSTEM_DESIGN §26–28). Unpublished,
 * deleted and unknown weddings are 404 and reveal nothing.
 */
export default function WeddingWebsitePage({ params }: PageProps<"/w/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-ivory" aria-busy="true" />}>
      <WeddingWebsite params={params} />
    </Suspense>
  );
}

async function WeddingWebsite({ params }: Pick<PageProps<"/w/[slug]">, "params">) {
  const { slug } = await params;
  if (!WEDDING_SLUG_PATTERN.test(slug)) notFound();
  await connection();
  const state = await findWebsite(slug);
  if (state.status === "not-found") notFound();
  if (state.status === "busy") return <WebsiteUnavailable busy />;
  return <ThemedWebsite wedding={state.wedding} />;
}

type WebsiteState =
  { status: "ok"; wedding: PublicWeddingDto } | { status: "not-found" } | { status: "busy" };

/** Same rules and limit as GET /api/public/weddings/:slug (API §69). */
async function findWebsite(slug: string): Promise<WebsiteState> {
  try {
    await getRateLimiter().enforce([
      { policy: policies.publicWebsiteView, subject: getClientIp({ headers: await headers() }) },
    ]);
    const wedding = await websiteService.getPublicWebsite({ requestId: randomUUID() }, slug);
    return { status: "ok", wedding };
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") return { status: "not-found" };
    if (!(isAppError(error) && error.code === "RATE_LIMITED")) {
      logger.warn("Could not load a wedding website", { error });
    }
    return { status: "busy" };
  }
}
