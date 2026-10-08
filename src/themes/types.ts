import type { ComponentType } from "react";

import type { PublicWeddingDto } from "@/modules/weddings/wedding.types";

/**
 * Every theme renders the SAME public-wedding DTO (SYSTEM_DESIGN §28): themes
 * change presentation, never content.
 */
export interface ThemeProps {
  wedding: PublicWeddingDto;
}

export type ThemeComponent = ComponentType<ThemeProps>;
