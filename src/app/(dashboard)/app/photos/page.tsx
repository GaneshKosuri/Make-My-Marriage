import type { Metadata } from "next";
import { Suspense } from "react";

import { GalleryScreen, GallerySkeleton } from "@/features/photos/components/gallery-screen";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Gallery" };

/**
 * /app/photos (PRD §9.20–9.21): the wedding's private gallery. The screen
 * reads the album from the address itself.
 */
export default function PhotosPage() {
  return (
    <Suspense fallback={<GallerySkeleton />}>
      <Gallery />
    </Suspense>
  );
}

async function Gallery() {
  // Memoised per request: the layout's guard made the same call.
  const current = await getCurrentContext();
  if (!current?.wedding) return null;
  return <GalleryScreen timeZone={current.wedding.timeZone} />;
}
