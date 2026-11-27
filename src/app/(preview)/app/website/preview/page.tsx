import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PreviewBanner } from "@/features/website/components/site-messages";
import { REQUEST_PATH_HEADER, signInPathFor } from "@/lib/safe-next";
import { websiteService } from "@/modules/weddings";
import { getCurrentContext } from "@/server/auth";
import { isWebsiteTheme, ThemedWebsite } from "@/themes";
import { PublicWebsiteSkeleton } from "@/components/ui/page-skeleton";

export const metadata: Metadata = {
  title: "Website preview",
  robots: { index: false, follow: false },
};

/**
 * /app/website/preview — the family's own website, published or not, outside
 * the dashboard frame so it looks exactly like the real site. `?theme=` shows
 * another theme before it is saved. Members only (same guard as /app).
 */
export default function WebsitePreviewPage({ searchParams }: PageProps<"/app/website/preview">) {
  return (
    <Suspense fallback={<PublicWebsiteSkeleton />}>
      <Preview searchParams={searchParams} />
    </Suspense>
  );
}

async function Preview({ searchParams }: Pick<PageProps<"/app/website/preview">, "searchParams">) {
  const current = await getCurrentContext();
  if (!current) redirect(signInPathFor((await headers()).get(REQUEST_PATH_HEADER)));
  if (!current.membership || !current.wedding) redirect("/create-wedding");

  const ctx = {
    requestId: randomUUID(),
    userId: current.user.id,
    membershipId: current.membership.membershipId,
    weddingId: current.wedding.id,
    role: current.membership.role,
  };
  const [wedding, settings, { theme }] = await Promise.all([
    websiteService.getPreview(ctx),
    websiteService.getSettings(ctx),
    searchParams,
  ]);
  const shown = isWebsiteTheme(theme) ? { ...wedding, theme } : wedding;
  return (
    <>
      <PreviewBanner published={settings.isPublished} />
      <ThemedWebsite wedding={shown} />
    </>
  );
}
