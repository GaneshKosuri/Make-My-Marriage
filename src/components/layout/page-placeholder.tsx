import type { ReactNode } from "react";

/** Scaffold placeholder: page title + the PRD §16 phase that builds it. */
export function PagePlaceholder({
  title,
  phase,
  description,
  children,
}: Readonly<{ title: string; phase: string; description?: string; children?: ReactNode }>) {
  return (
    <section className="space-y-3">
      <h1 className="font-serif text-2xl font-semibold">{title}</h1>
      {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
      <p className="inline-block rounded-md border border-dashed px-3 py-1 text-xs text-muted-foreground">
        Placeholder · {phase}
      </p>
      {children}
    </section>
  );
}
