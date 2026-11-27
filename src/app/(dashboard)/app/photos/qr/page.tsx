import type { Metadata } from "next";
import { Suspense } from "react";

import {
  GalleryShareScreen,
  GalleryShareSkeleton,
} from "@/features/photos/components/gallery-share-screen";
import { coupleDisplayName, weddingPlace } from "@/lib/couple";
import { formatDateOnly } from "@/lib/dates";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Share the gallery" };

/** /app/photos/qr (PRD §9.23): gallery switches, the stable link and the printable QR card. */
export default function PhotosQrPage() {
  return (
    <Suspense fallback={<GalleryShareSkeleton />}>
      <Share />
    </Suspense>
  );
}

async function Share() {
  // Memoised per request: the layout's guard made the same call.
  const current = await getCurrentContext();
  if (!current?.wedding) return null;
  const { wedding } = current;
  const place = weddingPlace(wedding);
  const date = formatDateOnly(wedding.weddingDate);
  return (
    <GalleryShareScreen
      // Names, never the custom title: the card reads "…from Akshay & Princi's wedding".
      coupleName={coupleDisplayName({ brideName: wedding.brideName, groomName: wedding.groomName })}
      dateLine={place ? `${date} · ${place}` : date}
    />
  );
}
