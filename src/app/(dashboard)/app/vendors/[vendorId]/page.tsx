import type { Metadata } from "next";
import { Suspense } from "react";

import { VendorDetailScreen } from "@/features/vendors/components/vendor-detail-screen";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Vendor" };

/** /app/vendors/[vendorId] (PRD §9.16): one vendor, with edit and archive. */
export default function VendorDetailPage({ params }: PageProps<"/app/vendors/[vendorId]">) {
  return (
    <Suspense fallback={null}>
      <VendorDetail params={params} />
    </Suspense>
  );
}

async function VendorDetail({ params }: Pick<PageProps<"/app/vendors/[vendorId]">, "params">) {
  // Memoised per request: the layout's guard made the same call.
  const [current, { vendorId }] = await Promise.all([getCurrentContext(), params]);
  if (!current?.wedding) return null;
  return <VendorDetailScreen vendorId={vendorId} timeZone={current.wedding.timeZone} />;
}
