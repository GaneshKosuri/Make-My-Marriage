import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge must know the design-system font sizes from globals.css
 * (`text-headline-sm`, `text-eyebrow`, …); otherwise it treats them as text
 * colours and drops them when merged with e.g. `text-burgundy`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display",
        "headline-lg",
        "headline-md",
        "headline-sm",
        "title-lg",
        "title-md",
        "body-lg",
        "body-md",
        "body-sm",
        "label-md",
        "label-sm",
        "eyebrow",
        "metric",
      ],
    },
  },
});

/** Merge Tailwind class names, letting later utilities win (shadcn/ui convention). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
