import Image from "next/image";
import Link from "next/link";

/** Landing page placeholder. The real design comes from prompts/LANDING_PAGE_STITCH_PROMPT.md. */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <Image
        src="/brand/logo-horizontal.svg"
        alt="Make My Marriage"
        width={420}
        height={96}
        priority
        className="h-auto w-72 sm:w-96"
      />
      <div className="space-y-3">
        <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
          The operating system for your Indian wedding
        </h1>
        <p className="text-muted-foreground">
          Events, tasks, guests, RSVPs, expenses, vendors, your wedding website and shared photos —
          in one workspace for the whole family.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signup"
          className="bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-sm font-medium"
        >
          Create your wedding
        </Link>
        <Link href="/login" className="rounded-md border px-5 py-2.5 text-sm font-medium">
          Log in
        </Link>
      </div>
      <p className="text-muted-foreground text-xs">Placeholder · Phase 1: Foundation</p>
    </main>
  );
}
