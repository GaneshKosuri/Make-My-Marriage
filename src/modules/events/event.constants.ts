/** Wedding events (PRD §9.5; DATABASE_DESIGN §31–35). Isomorphic. */

export const EVENT_TYPES = [
  "ROKA",
  "ENGAGEMENT",
  "MEHENDI",
  "HALDI",
  "SANGEET",
  "COCKTAIL",
  "WEDDING",
  "RECEPTION",
  "CUSTOM",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  ROKA: "Roka",
  ENGAGEMENT: "Engagement",
  MEHENDI: "Mehendi",
  HALDI: "Haldi",
  SANGEET: "Sangeet",
  COCKTAIL: "Cocktail",
  WEDDING: "Wedding",
  RECEPTION: "Reception",
  CUSTOM: "Custom event",
};

export const EVENT_NAME_MAX_LENGTH = 120;
export const EVENT_VENUE_NAME_MAX_LENGTH = 200;
export const EVENT_ADDRESS_MAX_LENGTH = 500;
export const EVENT_DESCRIPTION_MAX_LENGTH = 2000;
export const EVENT_DRESS_CODE_MAX_LENGTH = 200;
