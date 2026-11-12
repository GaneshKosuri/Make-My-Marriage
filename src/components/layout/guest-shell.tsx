import type { ReactNode } from "react";

/**
 * Mobile-first frame for token pages (invitation, gallery): no app chrome, no
 * account prompts (PRD §12.3–12.4), in the brand palette.
 */
export function GuestShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-dvh bg-ivory">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-6 md:py-10">
        <main className="flex-1">{children}</main>
        <footer className="flex items-center justify-center gap-2 pt-10 text-body-sm text-plum">
          {/* eslint-disable-next-line @next/next/no-img-element -- a tiny local SVG mark */}
          <img src="/brand/logo-mark.svg" alt="" width={20} height={20} className="size-5" />
          Made with Make My Marriage
        </footer>
      </div>
    </div>
  );
}
