import {
  DEFAULT_WEBSITE_THEME,
  WEBSITE_THEMES,
  type WebsiteTheme,
} from "@/modules/weddings/wedding.constants";

import { ClassicTheme } from "./classic";
import { MinimalTheme } from "./minimal";
import { ModernTheme } from "./modern";
import type { ThemeComponent, ThemeProps } from "./types";

/**
 * Wedding-website theme registry (PRD §9.19, SYSTEM_DESIGN §28). Adding a theme
 * = add it to WEBSITE_THEMES and register its renderer here; TypeScript
 * enforces that every theme has one.
 */
export const THEMES: Readonly<Record<WebsiteTheme, ThemeComponent>> = {
  CLASSIC: ClassicTheme,
  MINIMAL: MinimalTheme,
  MODERN: ModernTheme,
};

export function isWebsiteTheme(value: unknown): value is WebsiteTheme {
  return typeof value === "string" && (WEBSITE_THEMES as readonly string[]).includes(value);
}

/** Renders the public-wedding DTO with its selected theme (default CLASSIC). */
export function ThemedWebsite({ wedding }: Readonly<ThemeProps>) {
  const Theme = THEMES[isWebsiteTheme(wedding.theme) ? wedding.theme : DEFAULT_WEBSITE_THEME];
  return <Theme wedding={wedding} />;
}

export type { ThemeComponent, ThemeProps } from "./types";
