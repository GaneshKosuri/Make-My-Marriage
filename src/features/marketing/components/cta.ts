import { cva } from "class-variance-authority";

/**
 * Pill-shaped calls to action from the Stitch home page. Full width and 16px on
 * phones; content width from `sm`. Use with next/link (routes) or <a> (anchors).
 */
export const ctaVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-full whitespace-nowrap transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2",
    "[&_svg]:size-[18px] [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-burgundy text-ivory shadow-sm hover:bg-burgundy-deep focus-visible:outline-burgundy",
        secondary:
          "border border-sand bg-sand/70 text-burgundy shadow-sm hover:bg-sand focus-visible:outline-burgundy sm:bg-white",
        light: "bg-white text-burgundy shadow-lg hover:bg-sand focus-visible:outline-ivory",
        onDark:
          "border border-ivory/20 bg-ivory/10 text-ivory hover:bg-ivory/20 focus-visible:outline-ivory",
      },
      size: {
        default: "w-full px-6 py-3.5 text-title-md sm:w-auto sm:py-3",
        large: "w-full px-8 py-3.5 text-title-md sm:w-auto",
        compact: "px-3 py-1.5 text-[12px] font-semibold sm:px-6 sm:py-2.5 sm:text-title-md",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);
