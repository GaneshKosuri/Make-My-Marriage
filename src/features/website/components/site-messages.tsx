import { ArrowLeft, Heart } from "lucide-react";
import Link from "next/link";

import { secondaryButton } from "@/components/ui/button-styles";

import { PUBLIC_SITE, WEBSITE_ROUTES } from "../website-content";

/** An unpublished, deleted or unknown website: nothing about the wedding is shown. */
export function WebsiteUnavailable({ busy = false }: Readonly<{ busy?: boolean }>) {
  const copy = busy ? PUBLIC_SITE.busy : PUBLIC_SITE.unavailable;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ivory px-4">
      <section className="w-full max-w-md rounded-3xl border border-sand bg-white px-6 py-10 text-center shadow-sm">
        <Heart aria-hidden className="mx-auto size-9 text-gold-deep" />
        <h1 className="mt-4 font-serif text-headline-sm text-graphite">{copy.title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-body-md text-plum">{copy.description}</p>
        {busy && (
          // A plain reload of the same address.
          <a href="" className={`${secondaryButton} mt-6`}>
            {PUBLIC_SITE.busy.retry}
          </a>
        )}
      </section>
    </main>
  );
}

/** The slim bar above the family's preview of their website. */
export function PreviewBanner({ published }: Readonly<{ published: boolean }>) {
  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 bg-graphite px-4 py-2.5 text-body-sm text-ivory">
      <p>
        {PUBLIC_SITE.preview.banner}{" "}
        <span className="text-ivory/75">
          {published ? PUBLIC_SITE.preview.published : PUBLIC_SITE.preview.draft}
        </span>
      </p>
      <Link
        href={WEBSITE_ROUTES.settings}
        className="inline-flex items-center gap-1 rounded font-semibold text-gold-light underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {PUBLIC_SITE.preview.back}
      </Link>
    </div>
  );
}
