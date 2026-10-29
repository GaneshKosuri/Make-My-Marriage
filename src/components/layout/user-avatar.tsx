import { cn } from "@/lib/cn";
import { initialsOf } from "@/lib/couple";

/** Initials in a burgundy circle; decorative, so the name must also appear as text nearby. */
export function UserAvatar({ name, className }: Readonly<{ name: string; className?: string }>) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-burgundy text-label-md text-ivory",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
