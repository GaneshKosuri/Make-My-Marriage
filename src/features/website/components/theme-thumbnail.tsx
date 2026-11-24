import type { WebsiteTheme } from "@/modules/weddings/wedding.constants";

/**
 * A miniature of each theme's layout for the theme picker, drawn with the
 * brand colours (no images to load). Decorative: the card's text names it.
 */
export function ThemeThumbnail({ theme }: Readonly<{ theme: WebsiteTheme }>) {
  if (theme === "CLASSIC") {
    return (
      <div
        aria-hidden
        className="aspect-[4/3] overflow-hidden rounded-xl border border-gold/40 bg-ivory"
      >
        <div className="flex h-[55%] flex-col items-center justify-center gap-1 bg-linear-to-b from-burgundy to-burgundy-deep">
          <span className="h-px w-10 bg-gold-light" />
          <span className="h-2.5 w-20 rounded-full bg-ivory/90" />
          <span className="h-1.5 w-14 rounded-full bg-gold-light/80" />
          <span className="h-px w-10 bg-gold-light" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-2">
          {[0, 1].map((n) => (
            <span key={n} className="h-6 rounded-md border border-gold/50 bg-white" />
          ))}
        </div>
      </div>
    );
  }
  if (theme === "MINIMAL") {
    return (
      <div
        aria-hidden
        className="flex aspect-[4/3] flex-col items-center gap-1.5 overflow-hidden rounded-xl border border-sand bg-ivory p-3"
      >
        <span className="h-1 w-12 rounded-full bg-plum/40" />
        <span className="h-3 w-24 rounded-full bg-graphite/80" />
        <span className="h-8 w-16 rounded-md bg-sand" />
        <span className="h-px w-full bg-gold/50" />
        <span className="h-1.5 w-full rounded-full bg-graphite/15" />
        <span className="h-px w-full bg-gold/50" />
        <span className="h-1.5 w-full rounded-full bg-graphite/15" />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className="aspect-[4/3] overflow-hidden rounded-xl border border-sand bg-ivory"
    >
      <div className="flex h-[58%] items-center gap-2 rounded-b-2xl bg-linear-to-br from-burgundy to-burgundy-deep px-3">
        <div className="flex flex-col gap-1">
          <span className="h-1.5 w-8 rounded-full bg-gold-light" />
          <span className="h-2.5 w-14 rounded-full bg-ivory/90" />
          <span className="text-[13px] leading-none font-semibold text-gold-light">82</span>
        </div>
        <span className="ml-auto h-10 w-12 rotate-3 rounded-lg bg-ivory/30" />
      </div>
      <div className="flex gap-1.5 p-2">
        <span className="h-7 flex-1 rounded-md bg-burgundy" />
        <span className="h-7 flex-1 rounded-md bg-gold-deep" />
        <span className="h-7 flex-1 rounded-md bg-sand" />
      </div>
    </div>
  );
}
