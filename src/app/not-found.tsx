import Link from "next/link";

/**
 * Generic 404. Unknown, malformed and cross-wedding resources all look the same
 * (API_DESIGN §96: never reveal that another wedding's data exists).
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-2xl font-semibold">This page isn&apos;t available</h1>
      <p className="text-muted-foreground">
        The link may be incorrect, expired or no longer shared.
      </p>
      <Link href="/" className="text-sm font-medium underline underline-offset-4">
        Go to the home page
      </Link>
    </main>
  );
}
