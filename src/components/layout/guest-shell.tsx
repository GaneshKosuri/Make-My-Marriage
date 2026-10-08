import type { ReactNode } from "react";

/**
 * Mobile-first frame for token pages (invitation, gallery): no app chrome, no
 * account prompts (PRD §12.3–12.4).
 */
export function GuestShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-8">
      <main className="flex-1">{children}</main>
      <footer className="pt-8 text-center text-xs text-muted-foreground">
        Made with Make My Marriage
      </footer>
    </div>
  );
}
