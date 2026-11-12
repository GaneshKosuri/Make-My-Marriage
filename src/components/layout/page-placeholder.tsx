import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A page whose feature hasn't shipped yet: its title, what it will do and a
 * "Coming soon" note, in the dashboard style. `phase` (PRD §16) is for
 * readers of the code only; people see "Coming soon".
 */
export function PagePlaceholder({
  title,
  description,
  children,
}: Readonly<{ title: string; phase: string; description?: string; children?: ReactNode }>) {
  return (
    <section className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <header>
        <h1 className="font-serif text-headline-md wrap-anywhere text-graphite md:text-headline-lg">
          {title}
        </h1>
        {description && <p className="mt-1 max-w-2xl text-body-md text-plum">{description}</p>}
      </header>
      <div className="rounded-3xl border border-dashed border-sand bg-white px-5 py-10 text-center">
        <Sparkles aria-hidden className="mx-auto size-8 text-gold-deep" />
        <p className="mt-3 font-serif text-title-lg text-graphite">Coming soon</p>
        <p className="mx-auto mt-1 max-w-sm text-body-md text-plum">
          We&apos;re building this part of Make My Marriage next.
        </p>
      </div>
      {children}
    </section>
  );
}
