import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  GalleryClosed,
  GalleryUnavailable,
  GuestGalleryScreen,
} from "@/features/photos/components/guest-gallery-screen";
import { publicGalleryService } from "@/modules/photos";
import type { PublicGalleryDto } from "@/modules/photos/photo.types";
import { isAppError } from "@/server/errors";
import { getClientIp, policies } from "@/server/http";
import { logger } from "@/server/logging/logger";
import { getRateLimiter } from "@/server/security/rate-limit";

// The token is a secret: never indexed, never leaked via Referer (the layout and next.config.ts too).
export const metadata: Metadata = {
  title: "Wedding gallery",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * /gallery/[token] (PRD §9.22–9.23, API_DESIGN §79–82): the guest gallery,
 * opened from the QR code or the shared link. Read here from the service;
 * photos and uploads go through /api/public/galleries/:token/…
 */
export default function GalleryPage({ params }: PageProps<"/gallery/[token]">) {
  return (
    <Suspense fallback={<div className="min-h-[60dvh]" aria-busy="true" />}>
      <Gallery params={params} />
    </Suspense>
  );
}

async function Gallery({ params }: Pick<PageProps<"/gallery/[token]">, "params">) {
  const { token } = await params;
  await connection();
  const state = await findGallery(token);
  if (state.status === "ok") return <GuestGalleryScreen token={token} gallery={state.gallery} />;
  return state.status === "closed" ? <GalleryClosed /> : <GalleryUnavailable />;
}

type GalleryState =
  { status: "ok"; gallery: PublicGalleryDto } | { status: "closed" } | { status: "unavailable" };

/**
 * Same rules and rate limit as GET /api/public/galleries/:token (API §80): a
 * switched-off, withdrawn or unknown link is closed.
 */
async function findGallery(token: string): Promise<GalleryState> {
  try {
    await getRateLimiter().enforce([
      { policy: policies.publicGalleryView, subject: getClientIp({ headers: await headers() }) },
    ]);
    const gallery = await publicGalleryService.getGallery({ requestId: randomUUID() }, token);
    return { status: "ok", gallery };
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") return { status: "closed" };
    if (!(isAppError(error) && error.code === "RATE_LIMITED")) {
      logger.warn("Could not load a guest gallery", { error });
    }
    return { status: "unavailable" };
  }
}
